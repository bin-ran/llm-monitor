import { createRequire } from 'node:module'

import { CURRENCY } from '../../src/shared/provider'
import { asNumber, formatOptionalAmount } from './parse'
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

    let body: Awaited<ReturnType<BssOpenApiType['queryAccountBalance']>>['body']

    try {
      const response = await client.queryAccountBalance()
      body = response.body
    } catch (error) {
      throw new Error(readErrorMessage(error))
    }

    if (!body) {
      throw new Error('阿里云未返回数据，请稍后重试')
    }

    if (body.success === false) {
      throw new Error(body.message ?? `阿里云返回错误码 ${body.code ?? '未知'}`)
    }

    const data = body.data ?? {}
    const available = asNumber(data.availableAmount)
    if (available === null) {
      throw new Error('未返回余额数据，请确认 AccessKey 与账号状态')
    }

    const details = [
      { label: '现金可用', value: formatOptionalAmount(asNumber(data.availableCashAmount)) },
      { label: '授信额度', value: formatOptionalAmount(asNumber(data.creditAmount)) },
    ]

    const mybankCredit = asNumber(data.mybankCreditAmount)
    if (mybankCredit !== null && mybankCredit > 0) {
      details.push({ label: '网商授信', value: formatOptionalAmount(mybankCredit) })
    }

    const quotaLimit = asNumber(data.quotaLimit)
    if (quotaLimit !== null && quotaLimit > 0) {
      details.push({ label: '生态额度', value: formatOptionalAmount(quotaLimit) })
    }

    return {
      available,
      currency: data.currency ?? CURRENCY.CNY,
      total: null,
      used: null,
      details,
    }
  },
}

function readErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '阿里云请求失败'

  const candidate = error as { data?: { message?: string; code?: string }; message?: string }
  const dataMessage = candidate.data?.message
  if (typeof dataMessage === 'string' && dataMessage.length > 0) return dataMessage

  const dataCode = candidate.data?.code
  if (typeof dataCode === 'string' && dataCode.length > 0) return `阿里云返回错误码 ${dataCode}`

  if (typeof candidate.message === 'string' && candidate.message.length > 0) return candidate.message
  return '阿里云请求失败'
}
