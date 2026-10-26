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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('deepseek 适配器', () => {
  it('解析可用余额，赠送为 0 时不带赠送明细', async () => {
    mockFetchJson({
      is_available: true,
      balance_infos: [
        { currency: 'CNY', total_balance: '42.25', granted_balance: '0.00', topped_up_balance: '42.25' },
      ],
    })

    const balance = await deepseekAdapter.fetchBalance({ apiKey: 'sk-test' })

    expect(balance.available).toBe(42.25)
    expect(balance.currency).toBe('CNY')
    // 赠送余额为 0，不展示赠送标签
    expect(balance.details).toEqual([{ label: '现金余额', value: '42.25' }])
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
    expect(balance.details).toEqual([{ label: '现金余额', value: '29.09' }])
  })

  it('status 为 false 时抛错', async () => {
    mockFetchJson({ status: false, message: '鉴权失败' })
    await expect(kimiAdapter.fetchBalance({ apiKey: 'sk-test' })).rejects.toThrow('鉴权失败')
  })
})

describe('智谱 GLM 适配器', () => {
  it('现金取可用余额，赠送固定为 0', async () => {
    mockFetchJson({
      code: 200,
      success: true,
      data: {
        balance: 35.59,
        availableBalance: 35.59,
        rechargeAmount: 135,
        giveAmount: 4.88,
      },
    })

    const balance = await zhipuAdapter.fetchBalance({ apiKey: 'test.key' })

    expect(balance.available).toBeCloseTo(35.59)
    // 智谱只返回累计充值/赠送，没有当前现金与赠送余额，现金取可用余额、赠送为 0 不展示
    expect(balance.details).toEqual([{ label: '现金余额', value: '35.59' }])
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
      { label: '赠送余额', value: '7.18' },
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
