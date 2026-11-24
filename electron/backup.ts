import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

import type { AppSettings, ProviderCredential, ProviderId } from '../src/shared/provider'

export const BACKUP_FORMAT = 'llm-monitor-backup'
export const BACKUP_VERSION = 1
export const MIN_BACKUP_PASSWORD_LENGTH = 8

const SALT_BYTES = 16
const IV_BYTES = 12
const KEY_BYTES = 32
const KDF = { N: 16384, r: 8, p: 1 } as const
const MAX_KDF_N = 65536
const MAX_MEMORY = 128 * 1024 * 1024

export interface BackupData {
  settings: AppSettings
  credentials: Partial<Record<ProviderId, ProviderCredential>>
}

interface BackupFile {
  format: string
  version: number
  kdf: { name: string; salt: string; N: number; r: number; p: number; keylen: number }
  cipher: { name: string; iv: string; authTag: string }
  data: string
}

export function assertBackupPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= MIN_BACKUP_PASSWORD_LENGTH
}

function deriveKey(
  password: string,
  salt: Buffer,
  kdf: Pick<BackupFile['kdf'], 'name' | 'N' | 'r' | 'p' | 'keylen'>,
): Buffer {
  if (
    kdf.name !== 'scrypt' ||
    !Number.isInteger(kdf.N) ||
    kdf.N < KDF.N ||
    kdf.N > MAX_KDF_N ||
    !Number.isInteger(kdf.r) ||
    kdf.r !== KDF.r ||
    !Number.isInteger(kdf.p) ||
    kdf.p !== KDF.p ||
    kdf.keylen !== KEY_BYTES
  ) {
    throw new Error('备份文件的加密参数不受支持')
  }

  return scryptSync(password, salt, KEY_BYTES, {
    N: kdf.N,
    r: kdf.r,
    p: kdf.p,
    maxmem: MAX_MEMORY,
  })
}

/** 用备份密码加密配置：密码与凭据都只存在于内存中 */
export function encryptBackup(data: BackupData, password: string): string {
  if (!assertBackupPassword(password)) {
    throw new Error(`备份密码至少 ${MIN_BACKUP_PASSWORD_LENGTH} 位`)
  }

  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const key = deriveKey(password, salt, { ...KDF, name: 'scrypt', keylen: KEY_BYTES })
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ])

  const file: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    kdf: {
      name: 'scrypt',
      salt: salt.toString('base64'),
      N: KDF.N,
      r: KDF.r,
      p: KDF.p,
      keylen: KEY_BYTES,
    },
    cipher: {
      name: 'aes-256-gcm',
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
    },
    data: encrypted.toString('base64'),
  }

  return JSON.stringify(file, null, 2)
}

/** 解密备份文件；密码错误或文件被篡改都会抛错 */
export function decryptBackup(text: string, password: string): BackupData {
  if (!assertBackupPassword(password)) {
    throw new Error(`备份密码至少 ${MIN_BACKUP_PASSWORD_LENGTH} 位`)
  }

  let file: BackupFile
  try {
    file = JSON.parse(text) as BackupFile
  } catch {
    throw new Error('备份文件不是有效的 JSON')
  }

  if (file?.format !== BACKUP_FORMAT || file.version !== BACKUP_VERSION) {
    throw new Error('不是支持的备份文件格式')
  }
  if (file.cipher?.name !== 'aes-256-gcm') {
    throw new Error('备份文件的加密算法不受支持')
  }

  let salt: Buffer
  let iv: Buffer
  let authTag: Buffer
  let encrypted: Buffer
  try {
    salt = Buffer.from(file.kdf.salt, 'base64')
    iv = Buffer.from(file.cipher.iv, 'base64')
    authTag = Buffer.from(file.cipher.authTag, 'base64')
    encrypted = Buffer.from(file.data, 'base64')
  } catch {
    throw new Error('备份文件字段损坏')
  }
  if (salt.length === 0 || iv.length !== IV_BYTES || authTag.length === 0 || encrypted.length === 0) {
    throw new Error('备份文件字段损坏')
  }

  const key = deriveKey(password, salt, file.kdf)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let decrypted: string
  try {
    decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  } catch {
    throw new Error('备份密码错误或文件已被篡改')
  }

  try {
    return JSON.parse(decrypted) as BackupData
  } catch {
    throw new Error('备份内容损坏')
  }
}
