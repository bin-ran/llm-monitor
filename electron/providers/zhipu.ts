import { CURRENCY, type ProviderBalance, type ProviderCredential } from '../../src/shared/provider'
import { createBalanceDetails } from '../../src/shared/balance-detail'
import { HttpJsonProviderAdapter } from './base'
import { asNumber, asRecord } from './parse'

const BALANCE_URL = 'https://www.bigmodel.cn/api/biz/account/query-customer-account-report'

interface ZhipuBalancePayload {
  success?: unknown
  msg?: unknown
  data?: unknown
}

export class ZhipuAdapter extends HttpJsonProviderAdapter<ZhipuBalancePayload> {
  readonly id = 'zhipu' as const
  protected readonly balanceUrl = BALANCE_URL

  protected buildHeaders(credential: ProviderCredential): Record<string, string> {
    return {
      // 智谱账户接口要求裸 Key，不带 Bearer 前缀
      Authorization: credential.apiKey ?? '',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  }

  protected parseBalance(payload: ZhipuBalancePayload): ProviderBalance {
    if (payload.success === false) {
      throw new Error(readMessage(payload) || '智谱返回查询失败')
    }

    const data = asRecord(payload.data)
    const available = this.requireAvailable(
      asNumber(data.availableBalance) ?? asNumber(data.balance),
      '请确认 API Key 是否有效',
    )

    // 智谱只返回累计充值与累计赠送，不返回当前现金/赠送余额：
    // 现金余额取可用余额，赠送余额无法拆分，固定为 0
    return {
      available,
      currency: CURRENCY.CNY,
      details: createBalanceDetails(available, 0),
    }
  }
}

function readMessage(payload: ZhipuBalancePayload): string {
  const message = payload.msg
  return typeof message === 'string' ? message : ''
}

export const zhipuAdapter = new ZhipuAdapter()
