import { describe, expect, it } from 'vitest'

import { buildProviderGroups, type ProviderBoardSource } from '../shared/provider-board'
import { PROVIDER_STATUS, type ProviderResult } from '../shared/provider'

function createResult(
  providerId: ProviderBoardSource['id'],
  status: string,
  available: number | null,
  errorMessage = '',
): ProviderResult {
  return {
    providerId,
    status,
    balance:
      available === null
        ? null
        : {
            available,
            currency: 'CNY',
            details: [{ label: '现金余额', value: available.toFixed(2) }],
          },
    errorMessage,
    updatedAt: 1_700_000_000_000,
  }
}

const CARDS: ProviderBoardSource[] = [
  { id: 'deepseek', label: 'DeepSeek', result: createResult('deepseek', PROVIDER_STATUS.OK, 128) },
  {
    id: 'kimi',
    label: 'Kimi',
    result: createResult('kimi', PROVIDER_STATUS.INVALID_CREDENTIAL, null),
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    result: createResult('zhipu', PROVIDER_STATUS.ERROR, null, '请求超时'),
  },
  {
    id: 'mimo',
    label: '小米 MiMo',
    result: createResult('mimo', PROVIDER_STATUS.MISSING_CREDENTIAL, null),
  },
  {
    id: 'tokenhub',
    label: '腾讯 TokenHub',
    result: createResult('tokenhub', PROVIDER_STATUS.OK, 18),
  },
]

describe('buildProviderGroups', () => {
  const groups = buildProviderGroups(CARDS, { tokenhub: 20 })

  it('把失败、凭证失效和低于阈值的平台归入需处理', () => {
    expect(groups[0].key).toBe('attention')
    expect(groups[0].items.map((item) => item.id)).toEqual(['kimi', 'zhipu', 'tokenhub'])
    expect(groups[0].items[2].statusText).toBe('低于阈值')
  })

  it('正常平台单独成组并汇总金额', () => {
    expect(groups[1].key).toBe('normal')
    expect(groups[1].items.map((item) => item.id)).toEqual(['deepseek'])
    expect(groups[1].totalText).toBe('￥128.00')
  })

  it('未配置平台归入待完善', () => {
    expect(groups[2].key).toBe('pending')
    expect(groups[2].items.map((item) => item.id)).toEqual(['mimo'])
    expect(groups[2].totalText).toBe('—')
  })
})
