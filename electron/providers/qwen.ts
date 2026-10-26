import { createRequire } from 'node:module'

import {
  CURRENCY,
  type ProviderBalance,
  type ProviderCredential,
} from '../../src/shared/provider'
import { createBalanceDetails } from '../../src/shared/balance-detail'
import { BaseProviderAdapter } from './base'
import { asNumber } from './parse'

import type BssOpenApiType from '@alicloud/bssopenapi20171214'

// 阿里云 SDK 为 CommonJS 包，Electron 主进程运行时用 createRequire 加载更稳妥
const require = createRequire(import.meta.url)
const BssOpenApi = (require('@alicloud/bssopenapi20171214') as { default: typeof BssOpenApiType })
  .default

const ENDPOINT = 'business.aliyuncs.com'

type AccountBalanceBody = NonNullable<
  Awaited<ReturnType<BssOpenApiType['queryAccountBalance']>>['body']
>

export class QwenAdapter extends BaseProviderAdapter<AccountBalanceBody> {
  readonly id = 'qwen' as const

  protected async requestBalance(credential: ProviderCredential): Promise<AccountBalanceBody> {
    const client = new BssOpenApi({
      accessKeyId: credential.accessKeyId ?? '',
      accessKeySecret: credential.accessKeySecret ?? '',
      endpoint: ENDPOINT,
    })

    let body: AccountBalanceBody | undefined

    try {
      const response = await client.queryAccountBalance()
      body = response.body
    } catch (error) {
      throw new Error(readErrorMessage(error))
    }

    if (!body) {
      throw new Error('阿里云未返回数据，请稍后重试')
    }

    return body
  }

  protected parseBalance(body: AccountBalanceBody): ProviderBalance {
    if (body.success === false) {
      throw new Error(body.message ?? `阿里云返回错误码 ${body.code ?? '未知'}`)
    }

    const data = body.data ?? {}
    const available = this.requireAvailable(
      asNumber(data.availableAmount),
      '请确认 AccessKey 与账号状态',
    )

    // 千问没有赠送额度概念，赠送余额固定为 0
    const cash = asNumber(data.availableCashAmount) ?? 0

    return {
      available,
      currency: data.currency ?? CURRENCY.CNY,
      details: createBalanceDetails(cash, 0),
    }
  }
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

export const qwenAdapter = new QwenAdapter()
