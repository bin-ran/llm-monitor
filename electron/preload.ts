import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppConfigView,
  AppSettings,
  LoginResult,
  ProviderCredential,
  ProviderId,
  ProviderResult,
} from '../src/shared/provider'

const api = {
  getConfig: (): Promise<AppConfigView> => ipcRenderer.invoke('config:get'),

  saveCredential: (
    providerId: ProviderId,
    values: ProviderCredential,
  ): Promise<AppConfigView> => ipcRenderer.invoke('config:save-credential', providerId, values),

  removeCredential: (providerId: ProviderId): Promise<AppConfigView> =>
    ipcRenderer.invoke('config:remove-credential', providerId),

  updateSettings: (patch: Partial<AppSettings>): Promise<AppConfigView> =>
    ipcRenderer.invoke('config:update-settings', patch),

  fetchBalances: (): Promise<ProviderResult[]> => ipcRenderer.invoke('balances:fetch'),

  refreshBalances: (): Promise<ProviderResult[]> => ipcRenderer.invoke('balances:refresh'),

  /** 只刷新指定平台；也用于设置页的「测试连接」 */
  refreshProvider: (providerId: ProviderId): Promise<ProviderResult> =>
    ipcRenderer.invoke('balances:refresh-one', providerId),

  openConsole: (providerId: ProviderId): Promise<void> =>
    ipcRenderer.invoke('console:open', providerId),

  /** 打开平台登录窗口（目前用于小米 MiMo 抓取登录态） */
  startLogin: (providerId: ProviderId): Promise<LoginResult> =>
    ipcRenderer.invoke('login:mimo', providerId),

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
