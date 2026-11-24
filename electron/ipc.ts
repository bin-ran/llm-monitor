import { dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs/promises'

import { assertBackupPassword } from './backup'
import { configStore } from './config'
import {
  PROVIDER_META,
  type AppSettings,
  type ProviderCredential,
  type ProviderId,
} from '../src/shared/provider'
import type { BackupActionResult } from '../src/shared/backup'
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

  ipcMain.handle(
    'config:export-backup',
    async (_event, password: unknown): Promise<BackupActionResult> => {
      if (!assertBackupPassword(password)) throw new Error('备份密码至少 8 位')

      const content = await configStore.exportBackup(password)
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '导出配置备份',
        defaultPath: 'llm-monitor-backup.json',
        filters: [{ name: '备份文件', extensions: ['json'] }],
      })

      if (canceled || !filePath) return { ok: false, message: '已取消导出' }
      await fs.writeFile(filePath, content, { encoding: 'utf-8', mode: 0o600 })
      return { ok: true, message: '备份已导出', filePath }
    },
  )

  ipcMain.handle(
    'config:import-backup',
    async (_event, password: unknown): Promise<BackupActionResult> => {
      if (!assertBackupPassword(password)) throw new Error('备份密码至少 8 位')

      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: '导入配置备份',
        properties: ['openFile'],
        filters: [{ name: '备份文件', extensions: ['json'] }],
      })

      if (canceled || filePaths.length === 0) return { ok: false, message: '已取消导入' }
      const content = await fs.readFile(filePaths[0], 'utf-8')
      await configStore.importBackup(content, password)
      balanceRefresher.start()
      await balanceRefresher.runAutoRefresh()
      return { ok: true, message: '配置已导入', filePath: filePaths[0] }
    },
  )

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
