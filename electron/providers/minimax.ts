import { CURRENCY } from '../../src/shared/provider'
import { requestJson } from './http'
import { asNumber, asRecord, formatAmount } from './parse'
import type { ProviderAdapter } from './types'

const BALANCE_URL = 'https://api.minimaxi.com/account/query_balance'

export const minimaxAdapter: ProviderAdapter = {
  id: 'minimax',
  async fetchBalance(credential) {
    const payload = asRecord(
      await requestJson(BALANCE_URL, {
        Authorization: `Bearer ${credential}`,
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
    const credit = asNumber(payload.credit_balance) ?? 0
    const owed = asNumber(payload.owed_amount) ?? 0

    const details = [
      { label: '现金余额', value: formatAmount(cash) },
      { label: '代金券', value: formatAmount(voucher) },
    ]

    if (credit > 0) {
      details.push({ label: '授信额度', value: formatAmount(credit) })
    }

    if (owed > 0) {
      details.push({ label: '欠费金额', value: formatAmount(owed) })
    }

    return {
      available,
      currency: CURRENCY.CNY,
      total: cash + voucher + credit,
      used: null,
      details,
    }
  },
}
