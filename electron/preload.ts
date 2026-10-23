import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppConfigView,
  AppSettings,
  ProviderId,
  ProviderResult,
} from '../src/shared/provider'

const api = {
  getConfig: (): Promise<AppConfigView> => ipcRenderer.invoke('config:get'),

  saveCredential: (providerId: ProviderId, credential: string): Promise<AppConfigView> =>
    ipcRenderer.invoke('config:save-credential', providerId, credential),

  removeCredential: (providerId: ProviderId): Promise<AppConfigView> =>
    ipcRenderer.invoke('config:remove-credential', providerId),

  updateSettings: (patch: Partial<AppSettings>): Promise<AppConfigView> =>
    ipcRenderer.invoke('config:update-settings', patch),

  fetchBalances: (): Promise<ProviderResult[]> => ipcRenderer.invoke('balances:fetch'),

  refreshBalances: (): Promise<ProviderResult[]> => ipcRenderer.invoke('balances:refresh'),

  openConsole: (providerId: ProviderId): Promise<void> =>
    ipcRenderer.invoke('console:open', providerId),

  /** 订阅主进程自动刷新的结果，返回取消订阅函数 */
  onBalancesUpdated: (callback: (results: ProviderResult[]) => void): (() => void) => {
    const listener = (_event: unknown, results: ProviderResult[]) => callback(results)
    ipcRenderer.on('balances:updated', listener)
    return () => {
      ipcRenderer.removeListener('balances:updated', listener)
    }
  },
}

export type LlmMonitorApi = typeof api

contextBridge.exposeInMainWorld('llmMonitor', api)
