import { CURRENCY, type ProviderBalance, type ProviderCredential } from '../../src/shared/provider'
import { createBalanceDetails } from '../../src/shared/balance-detail'
import { HttpJsonProviderAdapter } from './base'
import { asNumber, asRecord } from './parse'

const BALANCE_URL = 'https://platform.xiaomimimo.com/api/v1/balance'

interface MimoBalancePayload {
  code?: unknown
  message?: unknown
  data?: unknown
}

export class MimoAdapter extends HttpJsonProviderAdapter<MimoBalancePayload> {
  readonly id = 'mimo' as const
  protected readonly balanceUrl = BALANCE_URL

  protected buildHeaders(credential: ProviderCredential): Record<string, string> {
    return {
      Cookie: buildCookieHeader(credential.cookie ?? ''),
      Accept: 'application/json',
      'accept-language': 'en',
      'User-Agent': 'LLM-Monitor/1.0',
    }
  }

  protected parseBalance(payload: MimoBalancePayload): ProviderBalance {
    if (payload.code !== 0) {
      const message = payload.message
      throw new Error(
        typeof message === 'string' && message.length > 0
          ? message
          : 'MiMo 返回查询失败，登录态可能已过期',
      )
    }

    const data = asRecord(payload.data)
    const available = this.requireAvailable(asNumber(data.balance), '请重新登录获取 Cookie')

    const cash = asNumber(data.cashBalance) ?? 0
    const gift = asNumber(data.giftBalance) ?? 0

    const currency =
      typeof data.currency === 'string' && data.currency.length > 0
        ? data.currency
        : CURRENCY.CNY

    return {
      available,
      currency,
      details: createBalanceDetails(cash, gift),
    }
  }
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

export const mimoAdapter = new MimoAdapter()
