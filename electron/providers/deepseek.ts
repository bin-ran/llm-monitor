import { CURRENCY, type ProviderBalance, type ProviderCredential } from '../../src/shared/provider'
import { createBalanceDetails } from '../../src/shared/balance-detail'
import { HttpJsonProviderAdapter } from './base'
import { asArray, asNumber, asRecord } from './parse'

const BALANCE_URL = 'https://api.deepseek.com/user/balance'

interface DeepSeekBalancePayload {
  balance_infos?: unknown
}

export class DeepSeekAdapter extends HttpJsonProviderAdapter<DeepSeekBalancePayload> {
  readonly id = 'deepseek' as const
  protected readonly balanceUrl = BALANCE_URL

  protected buildHeaders(credential: ProviderCredential): Record<string, string> {
    return {
      Authorization: `Bearer ${credential.apiKey ?? ''}`,
      Accept: 'application/json',
    }
  }

  protected parseBalance(payload: DeepSeekBalancePayload): ProviderBalance {
    const balanceInfo = asRecord(asArray(payload.balance_infos)[0])
    const available = this.requireAvailable(
      asNumber(balanceInfo.total_balance),
      '请确认 API Key 是否有效',
    )

    const granted = asNumber(balanceInfo.granted_balance) ?? 0
    const toppedUp = asNumber(balanceInfo.topped_up_balance) ?? 0

    return {
      available,
      currency: CURRENCY.CNY,
      details: createBalanceDetails(toppedUp, granted),
    }
  }
}

export const deepseekAdapter = new DeepSeekAdapter()
