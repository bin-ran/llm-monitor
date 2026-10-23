import { createRequire } from 'node:module'

import { CURRENCY } from '../../src/shared/provider'
import { asNumber, formatAmount, formatOptionalAmount } from './parse'
import type { ProviderAdapter } from './types'

import type BssOpenApiType from '@alicloud/bssopenapi20171214'

// 阿里云 SDK 为 CommonJS 包，Electron 主进程运行时用 createRequire 加载更稳妥
const require = createRequire(import.meta.url)
const BssOpenApi = (require('@alicloud/bssopenapi20171214') as { default: typeof BssOpenApiType })
  .default

const ENDPOINT = 'business.aliyuncs.com'

export const qwenAdapter: ProviderAdapter = {
  id: 'qwen',
  async fetchBalance(credential) {
    const client = new BssOpenApi({
      accessKeyId: credential.accessKeyId ?? '',
      accessKeySecret: credential.accessKeySecret ?? '',
      endpoint: ENDPOINT,
    })

    let body: Awaited<ReturnType<BssOpenApiType['queryAccountBalance']>>['data']

    try {
      const response = await client.queryAccountBalance()
      body = response.data
    } catch (error) {
      throw new Error(readErrorMessage(error))
    }

    if (body.Success === false) {
      throw new Error(body.Message ?? `阿里云返回错误码 ${body.Code ?? '未知'}`)
    }

    const data = body.Data ?? {}
    const available = asNumber(data.AvailableAmount)
    if (available === null) {
      throw new Error('未返回余额数据，请确认 AccessKey 与账号状态')
    }

    const details = [
      { label: '现金可用', value: formatOptionalAmount(asNumber(data.AvailableCashAmount)) },
      { label: '授信额度', value: formatOptionalAmount(asNumber(data.CreditAmount)) },
    ]

    const overdue = asNumber(data.OverdueAmount)
    if (overdue !== null && overdue > 0) {
      details.push({ label: '欠费金额', value: formatAmount(overdue) })
    }

    return {
      available,
      currency: CURRENCY.CNY,
      total: null,
      used: null,
      details,
    }
  },
}

function readErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '阿里云请求失败'

  const candidate = error as { data?: { Message?: string; Code?: string }; message?: string }
  const dataMessage = candidate.data?.Message
  if (typeof dataMessage === 'string' && dataMessage.length > 0) return dataMessage

  const dataCode = candidate.data?.Code
  if (typeof dataCode === 'string' && dataCode.length > 0) return `阿里云返回错误码 ${dataCode}`

  if (typeof candidate.message === 'string' && candidate.message.length > 0) return candidate.message
  return '阿里云请求失败'
}
