import { CURRENCY } from '../../src/shared/provider'
import { requestJson } from './http'
import { asNumber, asRecord, formatAmount } from './parse'
import type { ProviderAdapter } from './types'

const BALANCE_URL = 'https://api.moonshot.cn/v1/users/me/balance'

export const kimiAdapter: ProviderAdapter = {
  id: 'kimi',
  async fetchBalance(credential) {
    const payload = asRecord(
      await requestJson(BALANCE_URL, {
        Authorization: `Bearer ${credential.apiKey ?? ''}`,
        Accept: 'application/json',
      }),
    )

    if (payload.status === false) {
      throw new Error(asStringOrFallback(payload, 'Kimi 返回查询失败'))
    }

    const data = asRecord(payload.data)
    const available = asNumber(data.available_balance)
    if (available === null) {
      throw new Error('未返回余额数据，请确认 API Key 是否有效')
    }

    // 国内站余额单位为人民币元（见 platform.kimi.com/docs/api/balance）
    const voucher = asNumber(data.voucher_balance) ?? 0
    const cash = asNumber(data.cash_balance) ?? 0

    return {
      available,
      currency: CURRENCY.CNY,
      total: voucher + cash,
      used: null,
      details: [
        { label: '代金券余额', value: formatAmount(voucher) },
        { label: '现金余额', value: formatAmount(cash) },
      ],
    }
  },
}

function asStringOrFallback(payload: Record<string, unknown>, fallback: string): string {
  const message = payload.message
  if (typeof message === 'string' && message.length > 0) return message
  const error = payload.error
  if (typeof error === 'string' && error.length > 0) return error
  return fallback
}
