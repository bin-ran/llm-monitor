import { ipcMain, shell } from 'electron'
import { PROVIDER_META, type ProviderId } from '../src/shared/provider'
import {
  buildConfigView,
  removeCredential,
  saveCredential,
  updateSettings,
} from './config'
import { fetchAllBalances, runAutoRefresh, startAutoRefresh } from './refresh'

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && value in PROVIDER_META
}

export function registerIpcHandlers(): void {
  ipcMain.handle('config:get', () => buildConfigView())

  ipcMain.handle('config:save-credential', async (_event, providerId: unknown, credential: unknown) => {
    if (!isProviderId(providerId)) throw new Error('未知的平台标识')
    if (typeof credential !== 'string' || credential.trim().length === 0) {
      throw new Error('API Key 不能为空')
    }
    await saveCredential(providerId, credential.trim())
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

  ipcMain.handle('console:open', (_event, providerId: unknown) => {
    if (!isProviderId(providerId)) throw new Error('未知的平台标识')
    return shell.openExternal(PROVIDER_META[providerId].homepage)
  })
}
