import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_SETTINGS,
  PROVIDER_IDS,
  PROVIDER_META,
  type AppConfigView,
  type AppSettings,
  type ProviderCredential,
  type ProviderCredentialState,
  type ProviderId,
} from '../src/shared/provider'

const SECRET_PREFIX_ENCRYPTED = 'enc:'
const SECRET_PREFIX_PLAIN = 'plain:'

type StoredCredentials = Partial<Record<ProviderId, Record<string, string>>>

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface StoredConfig {
  credentials: StoredCredentials
  autoRefreshEnabled: boolean
  refreshIntervalSeconds: number
  thresholds: Partial<Record<ProviderId, number>>
  /** 主窗口上次的位置与尺寸，null 表示未记录 */
  window: WindowBounds | null
}

export function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

function defaultConfig(): StoredConfig {
  return {
    credentials: {},
    autoRefreshEnabled: DEFAULT_SETTINGS.autoRefreshEnabled,
    refreshIntervalSeconds: DEFAULT_SETTINGS.refreshIntervalSeconds,
    thresholds: {},
    window: null,
  }
}

export function readConfig(): StoredConfig {
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) return defaultConfig()

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<StoredConfig>
    const config = defaultConfig()
    if (parsed.credentials && typeof parsed.credentials === 'object') {
      config.credentials = migrateCredentials(parsed.credentials)
    }
    if (typeof parsed.autoRefreshEnabled === 'boolean') {
      config.autoRefreshEnabled = parsed.autoRefreshEnabled
    }
    if (typeof parsed.refreshIntervalSeconds === 'number') {
      config.refreshIntervalSeconds = parsed.refreshIntervalSeconds
    }
    if (parsed.thresholds && typeof parsed.thresholds === 'object') {
      config.thresholds = { ...parsed.thresholds }
    }
    config.window = migrateWindowBounds(parsed.window)
    return config
  } catch {
    return defaultConfig()
  }
}

export function writeConfig(config: StoredConfig): void {
  const configPath = getConfigPath()
  const dir = path.dirname(configPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * 兼容旧版配置：早期每个平台只有一个字符串凭据，统一视为 apiKey
 */
function migrateCredentials(credentials: StoredCredentials): StoredCredentials {
  const migrated: StoredCredentials = {}

  for (const [providerId, value] of Object.entries(credentials)) {
    if (typeof value === 'string') {
      migrated[providerId as ProviderId] = { apiKey: value }
      continue
    }
    if (value && typeof value === 'object') {
      migrated[providerId as ProviderId] = value as Record<string, string>
    }
  }

  return migrated
}

export async function isEncryptionAvailable(): Promise<boolean> {
  return safeStorage.isAsyncEncryptionAvailable()
}

export async function saveCredential(
  providerId: ProviderId,
  values: ProviderCredential,
): Promise<void> {
  const config = readConfig()
  const stored: Record<string, string> = {}

  for (const [field, value] of Object.entries(values)) {
    if (value.length === 0) continue
    stored[field] = await encryptSecret(value)
  }

  config.credentials[providerId] = stored
  writeConfig(config)
}

export function removeCredential(providerId: ProviderId): void {
  const config = readConfig()
  delete config.credentials[providerId]
  writeConfig(config)
}

export async function readCredential(providerId: ProviderId): Promise<ProviderCredential | null> {
  const stored = readConfig().credentials[providerId]
  if (!stored) return null

  const credential: ProviderCredential = {}
  for (const [field, value] of Object.entries(stored)) {
    const plain = await decryptSecret(value)
    if (plain === null) return null
    credential[field] = plain
  }
  return credential
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const config = readConfig()
  if (typeof patch.autoRefreshEnabled === 'boolean') {
    config.autoRefreshEnabled = patch.autoRefreshEnabled
  }
  if (typeof patch.refreshIntervalSeconds === 'number') {
    config.refreshIntervalSeconds = patch.refreshIntervalSeconds
  }
  if (patch.thresholds) {
    config.thresholds = { ...config.thresholds, ...patch.thresholds }
  }
  writeConfig(config)
  return buildSettings(config)
}

/** 兼容旧配置：window 字段缺失或非法时视为未记录 */
function migrateWindowBounds(raw: unknown): WindowBounds | null {
  if (!raw || typeof raw !== 'object') return null
  const stored = raw as Partial<WindowBounds>
  const values = [stored.x, stored.y, stored.width, stored.height]
  if (!values.every((value) => typeof value === 'number' && Number.isFinite(value))) return null
  return {
    x: Math.round(stored.x as number),
    y: Math.round(stored.y as number),
    width: Math.round(stored.width as number),
    height: Math.round(stored.height as number),
  }
}

export function readWindowBounds(): WindowBounds | null {
  return readConfig().window
}

export function saveWindowBounds(bounds: WindowBounds): void {
  const config = readConfig()
  config.window = migrateWindowBounds(bounds)
  writeConfig(config)
}

export function buildSettings(config: StoredConfig): AppSettings {
  return {
    autoRefreshEnabled: config.autoRefreshEnabled,
    refreshIntervalSeconds: config.refreshIntervalSeconds,
    thresholds: config.thresholds,
  }
}

export function isCredentialComplete(
  providerId: ProviderId,
  credential: ProviderCredential | null,
): boolean {
  if (!credential) return false
  return PROVIDER_META[providerId].credentialFields.every(
    (field) => (credential[field.key] ?? '').length > 0,
  )
}

export async function buildConfigView(): Promise<AppConfigView> {
  const config = readConfig()
  const providers: ProviderCredentialState[] = []

  for (const providerId of PROVIDER_IDS) {
    const credential = await readCredential(providerId)
    const requiredFields = PROVIDER_META[providerId].credentialFields

    providers.push({
      providerId,
      hasCredential: isCredentialComplete(providerId, credential),
      credentialPreview: credential ? maskCredential(credential[requiredFields[0].key] ?? '') : '',
    })
  }

  return {
    providers,
    settings: buildSettings(config),
    configPath: getConfigPath(),
    isEncryptionAvailable: await isEncryptionAvailable(),
  }
}

async function encryptSecret(plain: string): Promise<string> {
  if (await safeStorage.isAsyncEncryptionAvailable()) {
    const encrypted = await safeStorage.encryptStringAsync(plain)
    return SECRET_PREFIX_ENCRYPTED + encrypted.toString('base64')
  }
  // 系统未提供密钥环时退化为明文存储，界面会提示加密不可用
  return SECRET_PREFIX_PLAIN + plain
}

async function decryptSecret(stored: string): Promise<string | null> {
  if (stored.startsWith(SECRET_PREFIX_PLAIN)) {
    return stored.slice(SECRET_PREFIX_PLAIN.length)
  }

  if (stored.startsWith(SECRET_PREFIX_ENCRYPTED)) {
    try {
      const encrypted = Buffer.from(stored.slice(SECRET_PREFIX_ENCRYPTED.length), 'base64')
      const decrypted = await safeStorage.decryptStringAsync(encrypted)

      if (decrypted.shouldReEncrypt) {
        // 系统密钥已轮换，用新密钥重新加密后落盘
        const config = readConfig()
        const providerId = findProviderBySecret(config, stored)
        if (providerId) {
          const fields = config.credentials[providerId]
          if (fields) {
            for (const [field, value] of Object.entries(fields)) {
              if (value === stored) {
                fields[field] = await encryptSecret(decrypted.result)
              }
            }
            writeConfig(config)
          }
        }
      }

      return decrypted.result
    } catch {
      return null
    }
  }

  return null
}

function findProviderBySecret(config: StoredConfig, stored: string): ProviderId | null {
  for (const providerId of PROVIDER_IDS) {
    const fields = config.credentials[providerId]
    if (!fields) continue
    for (const value of Object.values(fields)) {
      if (value === stored) return providerId
    }
  }
  return null
}

function maskCredential(credential: string): string {
  if (credential.length === 0) return ''
  if (credential.length <= 10) return '••••••'
  return `${credential.slice(0, 6)}••••${credential.slice(-4)}`
}
