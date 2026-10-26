import { describe, expect, it } from 'vitest'

import { PROVIDER_STATUS, type ProviderBalance } from '../../../src/shared/provider'
import { ProviderRegistry } from '../index'
import type { ProviderAdapter } from '../types'

function createAdapter(
  id: ProviderAdapter['id'],
  behavior: () => Promise<ProviderBalance>,
): ProviderAdapter {
  return { id, fetchBalance: behavior }
}

const SAMPLE_BALANCE: ProviderBalance = {
  available: 12.5,
  currency: 'CNY',
  details: [],
}

describe('ProviderRegistry', () => {
  it('查询成功时返回 OK 状态与余额', async () => {
    const registry = new ProviderRegistry([
      createAdapter('deepseek', async () => SAMPLE_BALANCE),
    ])

    const result = await registry.fetchBalance('deepseek', { apiKey: 'sk-test' })

    expect(result.status).toBe(PROVIDER_STATUS.OK)
    expect(result.balance).toEqual(SAMPLE_BALANCE)
    expect(result.errorMessage).toBe('')
  })

  it('普通异常归一化为 ERROR 状态', async () => {
    const registry = new ProviderRegistry([
      createAdapter('kimi', async () => {
        throw new Error('请求超时')
      }),
    ])

    const result = await registry.fetchBalance('kimi', { apiKey: 'sk-test' })

    expect(result.status).toBe(PROVIDER_STATUS.ERROR)
    expect(result.balance).toBeNull()
    expect(result.errorMessage).toBe('请求超时')
  })

  it('鉴权失败归一化为 INVALID_CREDENTIAL 状态', async () => {
    const registry = new ProviderRegistry([
      createAdapter('minimax', async () => {
        throw new Error('Invalid Authentication')
      }),
    ])

    const result = await registry.fetchBalance('minimax', { apiKey: 'sk-test' })

    expect(result.status).toBe(PROVIDER_STATUS.INVALID_CREDENTIAL)
  })

  it('未注册的平台直接抛错', () => {
    const registry = new ProviderRegistry([])

    expect(() => registry.get('qwen')).toThrow('未找到平台适配器')
  })
})
