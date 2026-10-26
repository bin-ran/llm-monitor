import {
  PROVIDER_STATUS,
  type ProviderCredential,
  type ProviderId,
  type ProviderResult,
} from '../../src/shared/provider'
import { deepseekAdapter } from './deepseek'
import { isInvalidCredentialError } from './errors'
import { kimiAdapter } from './kimi'
import { mimoAdapter } from './mimo'
import { minimaxAdapter } from './minimax'
import { qwenAdapter } from './qwen'
import { zhipuAdapter } from './zhipu'
import type { ProviderAdapter } from './types'

/**
 * 平台适配器注册表：统一负责「按平台取数」与「把异常归一化为 ProviderResult」
 */
export class ProviderRegistry {
  private readonly adapters = new Map<ProviderId, ProviderAdapter>()

  constructor(adapters: ProviderAdapter[]) {
    for (const adapter of adapters) {
      this.adapters.set(adapter.id, adapter)
    }
  }

  get(providerId: ProviderId): ProviderAdapter {
    const adapter = this.adapters.get(providerId)
    if (!adapter) throw new Error(`未找到平台适配器：${providerId}`)
    return adapter
  }

  /** 查询单个平台，失败时返回带状态的结果而非抛异常 */
  async fetchBalance(
    providerId: ProviderId,
    credential: ProviderCredential,
  ): Promise<ProviderResult> {
    const updatedAt = Date.now()

    try {
      const balance = await this.get(providerId).fetchBalance(credential)
      return {
        providerId,
        status: PROVIDER_STATUS.OK,
        balance,
        errorMessage: '',
        updatedAt,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        providerId,
        status: isInvalidCredentialError(error)
          ? PROVIDER_STATUS.INVALID_CREDENTIAL
          : PROVIDER_STATUS.ERROR,
        balance: null,
        errorMessage,
        updatedAt,
      }
    }
  }
}

export const providerRegistry = new ProviderRegistry([
  deepseekAdapter,
  kimiAdapter,
  zhipuAdapter,
  minimaxAdapter,
  mimoAdapter,
  qwenAdapter,
])
