import { app } from 'electron'
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
import { SecretVault, type CredentialVault } from './secret-vault'

type StoredCredentials = Partial<Record<ProviderId, Record<string, string>>>

/** 系统密钥轮换后待写回的单条密文 */
interface RotatedSecret {
  field: string
  previous: string
  next: string
}

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface StoredConfig {
  credentials: StoredCredentials
  autoRefreshEnabled: boolean
  refreshIntervalSeconds: number
  thresholds: Partial<Record<ProviderId, number>>
  /** 主窗口上次的位置与尺寸，null 表示未记录 */
  window: WindowBounds | null
}

/**
 * 配置仓库：负责本机配置文件的读写、凭据加解密与旧格式迁移
 */
export class ConfigStore {
  private readonly vault: CredentialVault
  /** 串行化「读-改-写」，避免并发保存或密钥轮换互相覆盖 */
  private pendingWrite: Promise<void> = Promise.resolve()

  constructor(vault: CredentialVault) {
    this.vault = vault
  }

  get configPath(): string {
    return path.join(app.getPath('userData'), 'config.json')
  }

  read(): StoredConfig {
    const configPath = this.configPath
    if (!fs.existsSync(configPath)) return this.createDefaultConfig()

    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<StoredConfig>
      const config = this.createDefaultConfig()

      if (parsed.credentials && typeof parsed.credentials === 'object') {
        config.credentials = this.migrateCredentials(parsed.credentials)
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
      config.window = this.migrateWindowBounds(parsed.window)

      return config
    } catch {
      return this.createDefaultConfig()
    }
  }

  private write(config: StoredConfig): void {
    const dir = path.dirname(this.configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
  }

  async saveCredential(providerId: ProviderId, values: ProviderCredential): Promise<void> {
    const stored: Record<string, string> = {}

    // 加密可以慢，放在临界区外，避免长时间占锁
    for (const [field, value] of Object.entries(values)) {
      if (value.length === 0) continue
      stored[field] = await this.vault.encrypt(value)
    }

    await this.runExclusive(() => {
      const config = this.read()
      config.credentials[providerId] = stored
      this.write(config)
    })
  }

  async removeCredential(providerId: ProviderId): Promise<void> {
    await this.runExclusive(() => {
      const config = this.read()
      delete config.credentials[providerId]
      this.write(config)
    })
  }

  async readCredential(
    providerId: ProviderId,
    config: StoredConfig = this.read(),
  ): Promise<ProviderCredential | null> {
    const stored = config.credentials[providerId]
    if (!stored) return null

    const credential: ProviderCredential = {}
    const rotatedSecrets: RotatedSecret[] = []

    for (const [field, storedValue] of Object.entries(stored)) {
      const decrypted = await this.vault.decrypt(storedValue)
      if (decrypted.value === null) return null
      credential[field] = decrypted.value

      if (decrypted.shouldReEncrypt) {
        rotatedSecrets.push({
          field,
          previous: storedValue,
          next: await this.vault.encrypt(decrypted.value),
        })
      }
    }

    if (rotatedSecrets.length > 0) {
      await this.applyRotatedSecrets(providerId, rotatedSecrets)
    }

    return credential
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    return this.runExclusive(() => {
      const config = this.read()

      if (typeof patch.autoRefreshEnabled === 'boolean') {
        config.autoRefreshEnabled = patch.autoRefreshEnabled
      }
      if (typeof patch.refreshIntervalSeconds === 'number') {
        config.refreshIntervalSeconds = patch.refreshIntervalSeconds
      }
      if (patch.thresholds) {
        config.thresholds = { ...config.thresholds, ...patch.thresholds }
      }

      this.write(config)
      return this.buildSettings(config)
    })
  }

  readWindowBounds(): WindowBounds | null {
    return this.read().window
  }

  async saveWindowBounds(bounds: WindowBounds): Promise<void> {
    await this.runExclusive(() => {
      const config = this.read()
      config.window = this.migrateWindowBounds(bounds)
      this.write(config)
    })
  }

  private buildSettings(config: StoredConfig): AppSettings {
    return {
      autoRefreshEnabled: config.autoRefreshEnabled,
      refreshIntervalSeconds: config.refreshIntervalSeconds,
      thresholds: config.thresholds,
    }
  }

  /** 类型守卫：通过后调用方无需再断言 credential 非空 */
  isCredentialComplete(
    providerId: ProviderId,
    credential: ProviderCredential | null,
  ): credential is ProviderCredential {
    if (!credential) return false
    return PROVIDER_META[providerId].credentialFields.every(
      (field) => (credential[field.key] ?? '').length > 0,
    )
  }

  async buildConfigView(): Promise<AppConfigView> {
    const config = this.read()
    const providers: ProviderCredentialState[] = []

    for (const providerId of PROVIDER_IDS) {
      const credential = await this.readCredential(providerId, config)
      const requiredFields = PROVIDER_META[providerId].credentialFields

      providers.push({
        providerId,
        hasCredential: this.isCredentialComplete(providerId, credential),
        credentialPreview: credential
          ? this.maskCredential(credential[requiredFields[0].key] ?? '')
          : '',
      })
    }

    return {
      providers,
      settings: this.buildSettings(config),
      configPath: this.configPath,
      isEncryptionAvailable: await this.vault.isAvailable(),
    }
  }

  private createDefaultConfig(): StoredConfig {
    return {
      credentials: {},
      autoRefreshEnabled: DEFAULT_SETTINGS.autoRefreshEnabled,
      refreshIntervalSeconds: DEFAULT_SETTINGS.refreshIntervalSeconds,
      thresholds: {},
      window: null,
    }
  }

  /**
   * 兼容旧版配置：早期每个平台只有一个字符串凭据，统一视为 apiKey
   */
  private migrateCredentials(credentials: StoredCredentials): StoredCredentials {
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

  /** 兼容旧配置：window 字段缺失或非法时视为未记录 */
  private migrateWindowBounds(raw: unknown): WindowBounds | null {
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

  /** 写入轮换后的密文：重新读盘并根据旧密文比对，避免覆盖并发修改 */
  private async applyRotatedSecrets(
    providerId: ProviderId,
    rotatedSecrets: RotatedSecret[],
  ): Promise<void> {
    await this.runExclusive(() => {
      const config = this.read()
      const fields = config.credentials[providerId]
      if (!fields) return

      let hasChange = false
      for (const item of rotatedSecrets) {
        // 已被并发写入或其他轮换改写，放弃本条
        if (fields[item.field] !== item.previous) continue
        fields[item.field] = item.next
        hasChange = true
      }

      if (hasChange) {
        this.write(config)
      }
    })
  }

  /**
   * 串行化「读-改-写」事务：
   * 同一时刻只允许一个写操作进入临界区，避免并发写入互相覆盖。
   */
  private async runExclusive<T>(task: () => T | Promise<T>): Promise<T> {
    const previous = this.pendingWrite
    let release = (): void => {}
    this.pendingWrite = new Promise<void>((resolve) => {
      release = resolve
    })

    await previous
    try {
      return await task()
    } finally {
      release()
    }
  }

  private maskCredential(credential: string): string {
    if (credential.length === 0) return ''
    if (credential.length <= 10) return '••••••'
    return `${credential.slice(0, 6)}••••${credential.slice(-4)}`
  }
}

/** 全局唯一的配置仓库实例 */
export const configStore = new ConfigStore(new SecretVault())
