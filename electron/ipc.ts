import { ipcMain, shell } from 'electron'
import {
  PROVIDER_META,
  type AppSettings,
  type ProviderCredential,
  type ProviderId,
} from '../src/shared/provider'
import { configStore } from './config'
import { mimoLoginFlow } from './mimo-login'
import { balanceRefresher } from './refresh'

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && value in PROVIDER_META
}

function toCredential(value: unknown): ProviderCredential {
  if (!value || typeof value !== 'object') return {}
  const credential: ProviderCredential = {}

  for (const [field, fieldValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof fieldValue === 'string') credential[field] = fieldValue.trim()
  }

  return credential
}

export function registerIpcHandlers(): void {
  ipcMain.handle('config:get', () => configStore.buildConfigView())

  ipcMain.handle('config:save-credential', async (_event, providerId: unknown, values: unknown) => {
    if (!isProviderId(providerId)) throw new Error('未知的平台标识')

    const credential = toCredential(values)
    const requiredFields = PROVIDER_META[providerId].credentialFields
    const isComplete = requiredFields.every((field) => (credential[field.key] ?? '').length > 0)

    if (!isComplete) {
      throw new Error(`请填写 ${requiredFields.map((field) => field.label).join(' 与 ')}`)
    }

    await configStore.saveCredential(providerId, credential)
    return configStore.buildConfigView()
  })

  ipcMain.handle('config:remove-credential', async (_event, providerId: unknown) => {
    if (!isProviderId(providerId)) throw new Error('未知的平台标识')
    await configStore.removeCredential(providerId)
    return configStore.buildConfigView()
  })

  ipcMain.handle('config:update-settings', async (_event, patch: unknown) => {
    const settings = await configStore.updateSettings((patch ?? {}) as Partial<AppSettings>)
    balanceRefresher.start()
    const config = await configStore.buildConfigView()
    return { ...config, settings }
  })

  ipcMain.handle('balances:refresh', () => balanceRefresher.runAutoRefresh())

  ipcMain.handle('balances:refresh-one', (_event, providerId: unknown) => {
    if (!isProviderId(providerId)) throw new Error('未知的平台标识')
    return balanceRefresher.refreshProvider(providerId)
  })

  ipcMain.handle('console:open', (_event, providerId: unknown) => {
    if (!isProviderId(providerId)) throw new Error('未知的平台标识')
    return shell.openExternal(PROVIDER_META[providerId].homepage)
  })

  ipcMain.handle('login:mimo', () => mimoLoginFlow.open())
}
