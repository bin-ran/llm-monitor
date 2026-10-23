import type { ProviderBalance, ProviderCredential, ProviderId } from '../../src/shared/provider'

export interface ProviderAdapter {
  id: ProviderId
  /** 拉取账户余额，失败时抛出 Error */
  fetchBalance(credential: ProviderCredential): Promise<ProviderBalance>
}
