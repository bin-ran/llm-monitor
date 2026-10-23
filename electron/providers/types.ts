import type { ProviderBalance, ProviderId } from '../../src/shared/provider'

export interface ProviderAdapter {
  id: ProviderId
  /** 拉取账户余额，失败时抛出 Error */
  fetchBalance(credential: string): Promise<ProviderBalance>
}
