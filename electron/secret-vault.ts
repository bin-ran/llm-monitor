import { safeStorage } from 'electron'

const SECRET_PREFIX_ENCRYPTED = 'enc:'
const SECRET_PREFIX_PLAIN = 'plain:'

export interface DecryptedSecret {
  /** 解密结果，无法解密时为 null */
  value: string | null
  /** 系统密钥已轮换，需要用新密钥重新加密 */
  shouldReEncrypt: boolean
}

/** 凭据加解密接口，便于替换实现（如测试用的内存实现） */
export interface CredentialVault {
  isAvailable(): Promise<boolean>
  encrypt(plain: string): Promise<string>
  decrypt(stored: string): Promise<DecryptedSecret>
}

/**
 * 凭据保险箱：负责敏感字段的加解密。
 * 系统密钥环不可用时退化为明文存储，由界面提示用户。
 */
export class SecretVault implements CredentialVault {  async isAvailable(): Promise<boolean> {
    return safeStorage.isAsyncEncryptionAvailable()
  }

  async encrypt(plain: string): Promise<string> {
    if (await this.isAvailable()) {
      const encrypted = await safeStorage.encryptStringAsync(plain)
      return SECRET_PREFIX_ENCRYPTED + encrypted.toString('base64')
    }
    return SECRET_PREFIX_PLAIN + plain
  }

  async decrypt(stored: string): Promise<DecryptedSecret> {
    if (stored.startsWith(SECRET_PREFIX_PLAIN)) {
      return { value: stored.slice(SECRET_PREFIX_PLAIN.length), shouldReEncrypt: false }
    }

    if (!stored.startsWith(SECRET_PREFIX_ENCRYPTED)) {
      return { value: null, shouldReEncrypt: false }
    }

    try {
      const encrypted = Buffer.from(stored.slice(SECRET_PREFIX_ENCRYPTED.length), 'base64')
      const decrypted = await safeStorage.decryptStringAsync(encrypted)
      return { value: decrypted.result, shouldReEncrypt: decrypted.shouldReEncrypt }
    } catch {
      return { value: null, shouldReEncrypt: false }
    }
  }
}
