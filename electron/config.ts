import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_SETTINGS,
  PROVIDER_IDS,
  type AppConfigView,
  type AppSettings,
  type ProviderCredentialState,
  type ProviderId,
} from '../src/shared/provider'

const SECRET_PREFIX_ENCRYPTED = 'enc:'
const SECRET_PREFIX_PLAIN = 'plain:'

interface StoredConfig {
  credentials: Partial<Record<ProviderId, string>>
  autoRefreshEnabled: boolean
  refreshIntervalSeconds: number
  thresholds: Partial<Record<ProviderId, number>>
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
  }
}

export function readConfig(): StoredConfig {
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) return defaultConfig()

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<StoredConfig>
    const config = defaultConfig()
    if (parsed.credentials && typeof parsed.credentials === 'object') {
      config.credentials = { ...parsed.credentials }
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

export async function isEncryptionAvailable(): Promise<boolean> {
  return safeStorage.isAsyncEncryptionAvailable()
}

export async function saveCredential(providerId: ProviderId, credential: string): Promise<void> {
  const config = readConfig()
  config.credentials[providerId] = await encryptSecret(credential)
  writeConfig(config)
}

export function removeCredential(providerId: ProviderId): void {
  const config = readConfig()
  delete config.credentials[providerId]
  writeConfig(config)
}

export async function readCredential(providerId: ProviderId): Promise<string | null> {
  const stored = readConfig().credentials[providerId]
  if (!stored) return null
  return decryptSecret(stored)
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

export function buildSettings(config: StoredConfig): AppSettings {
  return {
    autoRefreshEnabled: config.autoRefreshEnabled,
    refreshIntervalSeconds: config.refreshIntervalSeconds,
    thresholds: config.thresholds,
  }
}

export async function buildConfigView(): Promise<AppConfigView> {
  const config = readConfig()
  const providers: ProviderCredentialState[] = []

  for (const providerId of PROVIDER_IDS) {
    const credential = await readCredential(providerId)
    providers.push({
      providerId,
      hasCredential: credential !== null,
      credentialPreview: credential ? maskCredential(credential) : '',
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
          config.credentials[providerId] = await encryptSecret(decrypted.result)
          writeConfig(config)
        }
      }

      return decrypted.result
    } catch {
      return null
    }
  }

  return null
}

function findProviderBySecret(
  config: StoredConfig,
  stored: string,
): ProviderId | null {
  for (const providerId of PROVIDER_IDS) {
    if (config.credentials[providerId] === stored) return providerId
  }
  return null
}

function maskCredential(credential: string): string {
  if (credential.length <= 10) return '••••••'
  return `${credential.slice(0, 6)}••••${credential.slice(-4)}`
}
