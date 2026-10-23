import { afterEach, describe, expect, it, vi } from 'vitest'

import { deepseekAdapter } from '../deepseek'
import { isInvalidCredentialError } from '../errors'
import { kimiAdapter } from '../kimi'
import { mimoAdapter } from '../mimo'
import { minimaxAdapter } from '../minimax'
import { zhipuAdapter } from '../zhipu'

/** 用固定响应替换全局 fetch，避免真实网络请求 */
function mockFetchJson(payload: unknown, init: { status?: number } = {}): void {
  const status = init.status ?? 200
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(payload), { status })),
  )
}

/** 按 URL 返回不同响应，用于多接口场景（如智谱余额 + 套餐额度） */
function mockFetchByUrl(handlers: Record<string, unknown>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      for (const [fragment, payload] of Object.entries(handlers)) {
        if (url.includes(fragment)) {
          return new Response(JSON.stringify(payload), { status: 200 })
        }
      }
      return new Response('{}', { status: 404 })
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('deepseek 适配器', () => {
  it('解析总额与赠送/充值明细', async () => {
    mockFetchJson({
      is_available: true,
      balance_infos: [
        { currency: 'CNY', total_balance: '42.25', granted_balance: '0.00', topped_up_balance: '42.25' },
      ],
    })

    const balance = await deepseekAdapter.fetchBalance({ apiKey: 'sk-test' })

    expect(balance.available).toBe(42.25)
    expect(balance.currency).toBe('CNY')
    expect(balance.details).toEqual([
      { label: '充值余额', value: '42.25' },
      { label: '赠送余额', value: '0.00' },
    ])
  })

  it('缺少余额字段时抛错', async () => {
    mockFetchJson({ is_available: false, balance_infos: [] })
    await expect(deepseekAdapter.fetchBalance({ apiKey: 'sk-test' })).rejects.toThrow('未返回余额数据')
  })
})

describe('kimi 适配器', () => {
  it('解析可用余额与代金券/现金', async () => {
    mockFetchJson({
      code: 0,
      data: { available_balance: 29.09433, voucher_balance: 0, cash_balance: 29.09433 },
      scode: '0x0',
      status: true,
    })

    const balance = await kimiAdapter.fetchBalance({ apiKey: 'sk-test' })

    expect(balance.available).toBeCloseTo(29.09433)
    expect(balance.details).toEqual([
      { label: '代金券余额', value: '0.00' },
      { label: '现金余额', value: '29.09' },
    ])
  })

  it('status 为 false 时抛错', async () => {
    mockFetchJson({ status: false, message: '鉴权失败' })
    await expect(kimiAdapter.fetchBalance({ apiKey: 'sk-test' })).rejects.toThrow('鉴权失败')
  })
})

describe('智谱 GLM 适配器', () => {
  it('解析账户余额并合并 Coding Plan 额度', async () => {
    mockFetchByUrl({
      'query-customer-account-report': {
        code: 200,
        success: true,
        data: {
          balance: 35.59,
          availableBalance: 35.59,
          rechargeAmount: 135,
          giveAmount: 4.88,
          totalSpendAmount: 104.29,
          frozenBalance: 0,
        },
      },
      'quota/limit': {
        code: 200,
        success: true,
        data: {
          limits: [
            { type: 'TIME_LIMIT', usage: 1000, remaining: 928 },
            { type: 'TOKENS_LIMIT', percentage: 44 },
          ],
        },
      },
    })

    const balance = await zhipuAdapter.fetchBalance({ apiKey: 'test.key' })

    expect(balance.available).toBeCloseTo(35.59)
    expect(balance.used).toBeCloseTo(104.29)
    expect(balance.details).toContainEqual({ label: '5 小时窗口', value: '928 / 1000' })
    expect(balance.details).toContainEqual({ label: '周额度剩余', value: '56%' })
  })

  it('未订阅套餐时忽略额度接口错误', async () => {
    mockFetchByUrl({
      'query-customer-account-report': {
        code: 200,
        success: true,
        data: { availableBalance: 10, rechargeAmount: 20, giveAmount: 0, totalSpendAmount: 10 },
      },
      'quota/limit': { code: 500, success: false, msg: '当前用户不存在coding plan' },
    })

    const balance = await zhipuAdapter.fetchBalance({ apiKey: 'test.key' })

    expect(balance.available).toBe(10)
    expect(balance.details.some((item) => item.label.includes('窗口'))).toBe(false)
  })
})

describe('MiniMax 适配器', () => {
  it('解析可用/现金/代金券', async () => {
    mockFetchJson({
      available_amount: '57.18',
      cash_balance: '50.00',
      voucher_balance: '7.18',
      credit_balance: '0.00',
      owed_amount: '0.00',
      base_resp: { status_code: 0, status_msg: 'success' },
    })

    const balance = await minimaxAdapter.fetchBalance({ apiKey: 'sk-test' })

    expect(balance.available).toBeCloseTo(57.18)
    expect(balance.details).toEqual([
      { label: '现金余额', value: '50.00' },
      { label: '代金券', value: '7.18' },
    ])
  })

  it('业务码非 0 时抛错', async () => {
    mockFetchJson({ base_resp: { status_code: 1000, status_msg: 'biz error' } })
    await expect(minimaxAdapter.fetchBalance({ apiKey: 'sk-test' })).rejects.toThrow('biz error')
  })
})

describe('小米 MiMo 适配器', () => {
  it('解析余额并补全 cookie 名', async () => {
    const fetchMock = vi.fn(
      async (input: string | URL, init?: RequestInit) => {
        void input
        void init
        return new Response(
          JSON.stringify({
            code: 0,
            data: { balance: 2.24, cashBalance: 2.24, giftBalance: 0, frozenBalance: 0, currency: 'CNY' },
          }),
        )
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const balance = await mimoAdapter.fetchBalance({ cookie: 'token-value' })

    expect(balance.available).toBeCloseTo(2.24)
    expect(balance.currency).toBe('CNY')

    const cookieHeader = fetchMock.mock.calls[0][1]?.headers as Record<string, string>
    expect(cookieHeader.Cookie).toContain('api-platform_serviceToken="token-value"')
  })

  it('code 非 0 时抛错（登录态过期）', async () => {
    mockFetchJson({ code: 401, message: 'unauthorized' })
    await expect(mimoAdapter.fetchBalance({ cookie: 'x' })).rejects.toThrow('unauthorized')
  })
})

describe('凭证失效识别', () => {
  it('识别各平台常见鉴权失败文案', () => {
    const messages = [
      'Authentication Fails, Your api key is invalid',
      'Invalid Authentication',
      '身份验证失败。',
      '{"base_resp":{"status_code":1000,"status_msg":"biz error"}}',
      '{"code":401,"loginUrl":"https://account.xiaomi.com"}',
      'InvalidAccessKeyId.NotFound',
    ]

    for (const message of messages) {
      expect(isInvalidCredentialError(new Error(message))).toBe(true)
    }
  })

  it('普通错误不误判为凭证失效', () => {
    expect(isInvalidCredentialError(new Error('请求超时'))).toBe(false)
    expect(isInvalidCredentialError(new Error('HTTP 500'))).toBe(false)
  })
})
