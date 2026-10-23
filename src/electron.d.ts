import type {
  AppConfigView,
  AppSettings,
  ProviderId,
  ProviderResult,
} from './shared/provider'

export interface ILlmMonitorApi {
  getConfig(): Promise<AppConfigView>
  saveCredential(providerId: ProviderId, credential: string): Promise<AppConfigView>
  removeCredential(providerId: ProviderId): Promise<AppConfigView>
  updateSettings(patch: Partial<AppSettings>): Promise<AppConfigView>
  fetchBalances(): Promise<ProviderResult[]>
  refreshBalances(): Promise<ProviderResult[]>
  openConsole(providerId: ProviderId): Promise<void>
  onBalancesUpdated(callback: (results: ProviderResult[]) => void): () => void
}

declare global {
  interface Window {
    llmMonitor: ILlmMonitorApi
  }
}
