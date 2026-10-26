import type {
  AppConfigView,
  AppSettings,
  LoginResult,
  ProviderCredential,
  ProviderId,
  ProviderResult,
} from './shared/provider'

export interface ILlmMonitorApi {
  getConfig(): Promise<AppConfigView>
  saveCredential(providerId: ProviderId, values: ProviderCredential): Promise<AppConfigView>
  removeCredential(providerId: ProviderId): Promise<AppConfigView>
  updateSettings(patch: Partial<AppSettings>): Promise<AppConfigView>
  refreshBalances(): Promise<ProviderResult[]>
  refreshProvider(providerId: ProviderId): Promise<ProviderResult>
  openConsole(providerId: ProviderId): Promise<void>
  startLogin(providerId: ProviderId): Promise<LoginResult>
  onBalancesUpdated(callback: (results: ProviderResult[]) => void): () => void
}

declare global {
  interface Window {
    llmMonitor: ILlmMonitorApi
  }
}
