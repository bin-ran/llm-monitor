import { PROVIDER_STATUS, type ProviderId, type ProviderResult } from '../../src/shared/provider'
import { deepseekAdapter } from './deepseek'
import { kimiAdapter } from './kimi'
import { minimaxAdapter } from './minimax'
import { zhipuAdapter } from './zhipu'
import type { ProviderAdapter } from './types'

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  deepseek: deepseekAdapter,
  kimi: kimiAdapter,
  zhipu: zhipuAdapter,
  minimax: minimaxAdapter,
}

export async function fetchProviderBalance(
  providerId: ProviderId,
  credential: string,
): Promise<ProviderResult> {
  const updatedAt = Date.now()

  try {
    const balance = await ADAPTERS[providerId].fetchBalance(credential)
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
      status: PROVIDER_STATUS.ERROR,
      balance: null,
      errorMessage,
      updatedAt,
    }
  }
}
