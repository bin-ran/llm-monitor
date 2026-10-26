import { createBalanceDetails } from '../../src/shared/balance-detail'
import { CURRENCY } from '../../src/shared/provider'
import { requestJson } from './http'
import { asNumber, asRecord } from './parse'
import type { ProviderAdapter } from './types'

const ACCOUNT_URL = 'https://www.bigmodel.cn/api/biz/account/query-customer-account-report'

export const zhipuAdapter: ProviderAdapter = {
  id: 'zhipu',
  async fetchBalance(credential) {
    const payload = asRecord(
      await requestJson(ACCOUNT_URL, {
        // 智谱账户接口要求裸 Key，不带 Bearer 前缀
        Authorization: credential.apiKey ?? '',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }),
    )

    if (payload.success === false) {
      throw new Error(readMessage(payload) || '智谱返回查询失败')
    }

    const data = asRecord(payload.data)
    const available = asNumber(data.availableBalance) ?? asNumber(data.balance)
    if (available === null) {
      throw new Error('未返回余额数据，请确认 API Key 是否有效')
    }

    // 智谱只返回累计充值与累计赠送，不返回当前现金/赠送余额：
    // 现金余额取可用余额，赠送余额无法拆分，固定为 0
    return {
      available,
      currency: CURRENCY.CNY,
      total: (asNumber(data.rechargeAmount) ?? 0) + (asNumber(data.giveAmount) ?? 0),
      used: asNumber(data.totalSpendAmount),
      details: createBalanceDetails(available, 0),
    }
  },
}

function readMessage(payload: Record<string, unknown>): string {
  const message = payload.msg
  return typeof message === 'string' ? message : ''
}
