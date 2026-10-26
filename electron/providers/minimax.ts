import { createBalanceDetails } from '../../src/shared/balance-detail'
import { CURRENCY } from '../../src/shared/provider'
import { requestJson } from './http'
import { asNumber, asRecord } from './parse'
import type { ProviderAdapter } from './types'

const BALANCE_URL = 'https://api.minimaxi.com/account/query_balance'

export const minimaxAdapter: ProviderAdapter = {
  id: 'minimax',
  async fetchBalance(credential) {
    const payload = asRecord(
      await requestJson(BALANCE_URL, {
        Authorization: `Bearer ${credential.apiKey ?? ''}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }),
    )

    const baseResp = asRecord(payload.base_resp)
    const statusCode = asNumber(baseResp.status_code)
    if (statusCode !== null && statusCode !== 0) {
      const statusMessage = baseResp.status_msg
      throw new Error(
        typeof statusMessage === 'string' && statusMessage.length > 0
          ? statusMessage
          : `MiniMax 返回错误码 ${statusCode}`,
      )
    }

    const available = asNumber(payload.available_amount)
    if (available === null) {
      throw new Error('未返回余额数据，请确认 API Key 是否有效')
    }

    const cash = asNumber(payload.cash_balance) ?? 0
    const voucher = asNumber(payload.voucher_balance) ?? 0

    return {
      available,
      currency: CURRENCY.CNY,
      total: cash + voucher,
      used: null,
      details: createBalanceDetails(cash, voucher),
    }
  },
}
