import { createRequire } from 'node:module'

import {
  CURRENCY,
  type ProviderBalance,
  type ProviderCredential,
} from '../../src/shared/provider'
import { createBalanceDetails } from '../../src/shared/balance-detail'
import { BaseProviderAdapter } from './base'
import { asNumber } from './parse'

// 腾讯云 SDK 为 CommonJS 包，Electron 主进程运行时用 createRequire 加载更稳妥
const require = createRequire(import.meta.url)
const BillingClient = (
  require('tencentcloud-sdk-nodejs-billing') as typeof import('tencentcloud-sdk-nodejs-billing')
).billing.v20180709.Client

type AccountBalance = Awaited<
  ReturnType<InstanceType<typeof BillingClient>['DescribeAccountBalance']>
>

/** 腾讯云余额接口以「分」为单位 */
const CENT_TO_YUAN = 100

export class TokenhubAdapter extends BaseProviderAdapter<AccountBalance> {
  readonly id = 'tokenhub' as const

  protected async requestBalance(credential: ProviderCredential): Promise<AccountBalance> {
    const client = new BillingClient({
      credential: {
        secretId: credential.secretId ?? '',
        secretKey: credential.secretKey ?? '',
      },
      region: 'ap-guangzhou',
    })

    try {
      return await client.DescribeAccountBalance({})
    } catch (error) {
      throw new Error(readErrorMessage(error))
    }
  }

  protected parseBalance(response: AccountBalance): ProviderBalance {
    // RealBalance 是官方推荐的真实可用余额，Balance 为兼容字段，两者单位都是分
    const cents = asNumber(response.RealBalance) ?? asNumber(response.Balance)
    const available = this.requireAvailable(
      cents === null ? null : cents / CENT_TO_YUAN,
      '请确认 SecretId/SecretKey 与财务账单只读权限',
    )

    const cash = (asNumber(response.CashAccountBalance) ?? 0) / CENT_TO_YUAN
    const gift = (asNumber(response.PresentAccountBalance) ?? 0) / CENT_TO_YUAN

    return {
      available,
      currency: CURRENCY.CNY,
      details: createBalanceDetails(cash, gift),
    }
  }
}

function readErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '腾讯云请求失败'

  const message = (error as { message?: unknown }).message
  if (typeof message !== 'string' || message.length === 0) return '腾讯云请求失败'

  // 权限不足的原文含 not authorized，直接抛出会被上层误判为「凭证失效」
  if (message.includes('has no permission')) {
    const action = message.match(/\((finance:[\w]+)\)/)?.[1] ?? 'finance:DescribeAccountBalance'
    return `腾讯云 CAM 权限不足：请给该子用户授予 ${action}（resource *）权限`
  }

  return message
}

export const tokenhubAdapter = new TokenhubAdapter()
