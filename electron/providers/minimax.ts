import { CURRENCY, type ProviderBalance, type ProviderCredential } from '../../src/shared/provider'
import { createBalanceDetails } from '../../src/shared/balance-detail'
import { HttpJsonProviderAdapter } from './base'
import { asNumber, asRecord } from './parse'

const BALANCE_URL = 'https://api.minimaxi.com/account/query_balance'

interface MiniMaxBalancePayload {
  base_resp?: unknown
  available_amount?: unknown
  cash_balance?: unknown
  voucher_balance?: unknown
}

export class MiniMaxAdapter extends HttpJsonProviderAdapter<MiniMaxBalancePayload> {
  readonly id = 'minimax' as const
  protected readonly balanceUrl = BALANCE_URL

  protected buildHeaders(credential: ProviderCredential): Record<string, string> {
    return {
      Authorization: `Bearer ${credential.apiKey ?? ''}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  }

  protected parseBalance(payload: MiniMaxBalancePayload): ProviderBalance {
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

    const available = this.requireAvailable(
      asNumber(payload.available_amount),
      '请确认 API Key 是否有效',
    )

    const cash = asNumber(payload.cash_balance) ?? 0
    const voucher = asNumber(payload.voucher_balance) ?? 0

    return {
      available,
      currency: CURRENCY.CNY,
      details: createBalanceDetails(cash, voucher),
    }
  }
}

export const minimaxAdapter = new MiniMaxAdapter()
