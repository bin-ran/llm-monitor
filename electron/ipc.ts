import { ipcMain, shell } from 'electron'
import { PROVIDER_META, type ProviderCredential, type ProviderId } from '../src/shared/provider'
import {
  buildConfigView,
  removeCredential,
  saveCredential,
  updateSettings,
} from './config'
import { openMimoLoginWindow } from './mimo-login'
import { fetchAllBalances, refreshProvider, runAutoRefresh, startAutoRefresh } from './refresh'

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
  ipcMain.handle('config:get', () => buildConfigView())

  ipcMain.handle('config:save-credential', async (_event, providerId: unknown, values: unknown) => {
    if (!isProviderId(providerId)) throw new Error('未知的平台标识')

    const credential = toCredential(values)
    const requiredFields = PROVIDER_META[providerId].credentialFields
    const isComplete = requiredFields.every((field) => (credential[field.key] ?? '').length > 0)

    if (!isComplete) {
      throw new Error(`请填写 ${requiredFields.map((field) => field.label).join(' 与 ')}`)
    }

    await saveCredential(providerId, credential)
    return buildConfigView()
  })

  ipcMain.handle('config:remove-credential', async (_event, providerId: unknown) => {
    if (!isProviderId(providerId)) throw new Error('未知的平台标识')
    removeCredential(providerId)
    return buildConfigView()
  })

  ipcMain.handle('config:update-settings', (_event, patch: unknown) => {
    const settings = updateSettings((patch ?? {}) as Parameters<typeof updateSettings>[0])
    startAutoRefresh()
    return buildConfigView().then((config) => ({ ...config, settings }))
  })

  ipcMain.handle('balances:fetch', () => fetchAllBalances())

  ipcMain.handle('balances:refresh', () => runAutoRefresh())

  ipcMain.handle('balances:refresh-one', (_event, providerId: unknown) => {
    if (!isProviderId(providerId)) throw new Error('未知的平台标识')
    return refreshProvider(providerId)
  })

  ipcMain.handle('console:open', (_event, providerId: unknown) => {
    if (!isProviderId(providerId)) throw new Error('未知的平台标识')
    return shell.openExternal(PROVIDER_META[providerId].homepage)
  })

  ipcMain.handle('login:mimo', () => openMimoLoginWindow())
}
