import { createBalanceDetails } from '../../src/shared/balance-detail'
import { CURRENCY } from '../../src/shared/provider'
import { requestJson } from './http'
import { asArray, asNumber, asRecord } from './parse'
import type { ProviderAdapter } from './types'

const BALANCE_URL = 'https://api.deepseek.com/user/balance'

export const deepseekAdapter: ProviderAdapter = {
  id: 'deepseek',
  async fetchBalance(credential) {
    const payload = asRecord(
      await requestJson(BALANCE_URL, {
        Authorization: `Bearer ${credential.apiKey ?? ''}`,
        Accept: 'application/json',
      }),
    )

    const balanceInfo = asRecord(asArray(payload.balance_infos)[0])
    const total = asNumber(balanceInfo.total_balance)
    if (total === null) {
      throw new Error('未返回余额数据，请确认 API Key 是否有效')
    }

    const granted = asNumber(balanceInfo.granted_balance) ?? 0
    const toppedUp = asNumber(balanceInfo.topped_up_balance) ?? 0

    return {
      available: total,
      currency: CURRENCY.CNY,
      total: granted + toppedUp,
      used: null,
      details: createBalanceDetails(toppedUp, granted),
    }
  },
}
