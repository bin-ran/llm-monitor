import { CURRENCY } from '../../src/shared/provider'
import { requestJson } from './http'
import { asNumber, asRecord, formatAmount, formatOptionalAmount } from './parse'
import type { ProviderAdapter } from './types'

const BALANCE_URL = 'https://platform.xiaomimimo.com/api/v1/balance'

export const mimoAdapter: ProviderAdapter = {
  id: 'mimo',
  async fetchBalance(credential) {
    const cookie = buildCookieHeader(credential.cookie ?? '')

    const payload = asRecord(
      await requestJson(BALANCE_URL, {
        Cookie: cookie,
        Accept: 'application/json',
        'accept-language': 'en',
        'User-Agent': 'LLM-Monitor/1.0',
      }),
    )

    if (payload.code !== 0) {
      const message = payload.message
      throw new Error(
        typeof message === 'string' && message.length > 0
          ? message
          : 'MiMo 返回查询失败，登录态可能已过期',
      )
    }

    const data = asRecord(payload.data)
    const balance = asNumber(data.balance)
    if (balance === null) {
      throw new Error('未返回余额数据，请重新登录获取 Cookie')
    }

    const cash = asNumber(data.cashBalance)
    const gift = asNumber(data.giftBalance)
    const frozen = asNumber(data.frozenBalance)

    const details = [
      { label: '现金余额', value: formatOptionalAmount(cash) },
      { label: '赠送余额', value: formatOptionalAmount(gift) },
    ]

    if (frozen !== null && frozen > 0) {
      details.push({ label: '冻结余额', value: formatAmount(frozen) })
    }

    const currency = typeof data.currency === 'string' && data.currency.length > 0 ? data.currency : CURRENCY.CNY

    return {
      available: balance,
      currency,
      total: null,
      used: null,
      details,
    }
  },
}

/**
 * 兼容两种填写方式：
 * 1. 完整的 Cookie 头（含 api-platform_serviceToken=...）
 * 2. 仅 serviceToken 值（此时按平台要求补上 cookie 名与引号）
 */
function buildCookieHeader(raw: string): string {
  const value = raw.trim()
  if (value.length === 0) return ''
  if (value.includes('api-platform_serviceToken=')) return value
  return `api-platform_serviceToken="${value.replace(/^"|"$/g, '')}"`
}
