import { CURRENCY } from '../../src/shared/provider'
import { requestJson } from './http'
import { asArray, asNumber, asRecord, formatAmount, formatOptionalAmount } from './parse'
import type { ProviderAdapter } from './types'

const ACCOUNT_URL = 'https://www.bigmodel.cn/api/biz/account/query-customer-account-report'
const QUOTA_URL = 'https://open.bigmodel.cn/api/monitor/usage/quota/limit'

export const zhipuAdapter: ProviderAdapter = {
  id: 'zhipu',
  async fetchBalance(credential) {
    const payload = asRecord(
      await requestJson(ACCOUNT_URL, {
        // 智谱账户接口要求裸 Key，不带 Bearer 前缀
        Authorization: credential,
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

    const recharge = asNumber(data.rechargeAmount) ?? 0
    const granted = asNumber(data.giveAmount) ?? 0
    const spent = asNumber(data.totalSpendAmount)
    const frozen = asNumber(data.frozenBalance) ?? 0

    const details = [
      { label: '累计充值', value: formatAmount(recharge) },
      { label: '赠送金额', value: formatAmount(granted) },
      { label: '累计消费', value: formatOptionalAmount(spent) },
    ]

    if (frozen > 0) {
      details.push({ label: '冻结余额', value: formatAmount(frozen) })
    }

    const quotaDetails = await fetchCodingPlanQuota(credential)
    details.push(...quotaDetails)

    return {
      available,
      currency: CURRENCY.CNY,
      total: recharge + granted,
      used: spent,
      details,
    }
  },
}

/**
 * 智谱 Coding Plan 额度（5 小时窗口 / 周额度），未订阅时接口返回业务错误，忽略即可
 */
async function fetchCodingPlanQuota(
  credential: string,
): Promise<{ label: string; value: string }[]> {
  try {
    const payload = asRecord(
      await requestJson(QUOTA_URL, {
        Authorization: credential,
        Accept: 'application/json',
      }),
    )

    if (payload.success === false) return []

    const data = asRecord(payload.data)
    const limits = asArray(data.limits)
    const details: { label: string; value: string }[] = []

    for (const item of limits) {
      const limit = asRecord(item)
      const type = limit.type

      if (type === 'TIME_LIMIT') {
        const usage = asNumber(limit.usage)
        const remaining = asNumber(limit.remaining)
        if (usage !== null && remaining !== null) {
          details.push({ label: '5 小时窗口', value: `${remaining} / ${usage}` })
        }
      }

      if (type === 'TOKENS_LIMIT') {
        // percentage 表示已用百分比
        const percentage = asNumber(limit.percentage)
        if (percentage !== null) {
          details.push({ label: '周额度剩余', value: `${(100 - percentage).toFixed(0)}%` })
        }
      }
    }

    return details
  } catch {
    return []
  }
}

function readMessage(payload: Record<string, unknown>): string {
  const message = payload.msg
  return typeof message === 'string' ? message : ''
}
