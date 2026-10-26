import { CURRENCY, type ProviderBalance, type ProviderCredential } from '../../src/shared/provider'
import { createBalanceDetails } from '../../src/shared/balance-detail'
import { HttpJsonProviderAdapter } from './base'
import { asNumber, asRecord } from './parse'

const BALANCE_URL = 'https://api.moonshot.cn/v1/users/me/balance'

interface KimiBalancePayload {
  status?: unknown
  message?: unknown
  error?: unknown
  data?: unknown
}

export class KimiAdapter extends HttpJsonProviderAdapter<KimiBalancePayload> {
  readonly id = 'kimi' as const
  protected readonly balanceUrl = BALANCE_URL

  protected buildHeaders(credential: ProviderCredential): Record<string, string> {
    return {
      Authorization: `Bearer ${credential.apiKey ?? ''}`,
      Accept: 'application/json',
    }
  }

  protected parseBalance(payload: KimiBalancePayload): ProviderBalance {
    if (payload.status === false) {
      throw new Error(readMessage(payload, 'Kimi 返回查询失败'))
    }

    const data = asRecord(payload.data)
    const available = this.requireAvailable(
      asNumber(data.available_balance),
      '请确认 API Key 是否有效',
    )

    // 国内站余额单位为人民币元（见 platform.kimi.com/docs/api/balance）
    const voucher = asNumber(data.voucher_balance) ?? 0
    const cash = asNumber(data.cash_balance) ?? 0

    return {
      available,
      currency: CURRENCY.CNY,
      details: createBalanceDetails(cash, voucher),
    }
  }
}

function readMessage(payload: KimiBalancePayload, fallback: string): string {
  const message = payload.message
  if (typeof message === 'string' && message.length > 0) return message
  const error = payload.error
  if (typeof error === 'string' && error.length > 0) return error
  return fallback
}

export const kimiAdapter = new KimiAdapter()
