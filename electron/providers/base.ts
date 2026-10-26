import type { ProviderBalance, ProviderCredential, ProviderId } from '../../src/shared/provider'
import { requestJson } from './http'
import type { ProviderAdapter } from './types'

/**
 * 平台余额适配器基类
 *
 * 子类只需实现「取数」与「解析」两步；
 * 请求超时、错误归一化等横切逻辑由上层 ProviderRegistry 统一处理。
 */
export abstract class BaseProviderAdapter<TRaw = unknown> implements ProviderAdapter {
  abstract readonly id: ProviderId

  /** 拉取平台原始响应 */
  protected abstract requestBalance(credential: ProviderCredential): Promise<TRaw>

  /** 把原始响应解析为统一的余额结构 */
  protected abstract parseBalance(payload: TRaw): ProviderBalance

  async fetchBalance(credential: ProviderCredential): Promise<ProviderBalance> {
    const payload = await this.requestBalance(credential)
    return this.parseBalance(payload)
  }

  /** 可用余额缺失时抛出统一提示，hint 用于说明后续该怎么处理 */
  protected requireAvailable(value: number | null, hint: string): number {
    if (value === null) throw new Error(`未返回余额数据，${hint}`)
    return value
  }
}

/**
 * 走 HTTP JSON 接口的适配器基类：子类只需给出地址与请求头。
 * TRaw 用于描述该接口的响应结构，避免各适配器重复做类型断言。
 */
export abstract class HttpJsonProviderAdapter<
  TRaw = Record<string, unknown>,
> extends BaseProviderAdapter<TRaw> {
  protected abstract readonly balanceUrl: string

  protected abstract buildHeaders(credential: ProviderCredential): Record<string, string>

  protected async requestBalance(credential: ProviderCredential): Promise<TRaw> {
    const payload = await requestJson(this.balanceUrl, this.buildHeaders(credential))
    // 响应结构由各子类的 TRaw 声明，JSON 解析结果只能在此处收口断言
    return payload as TRaw
  }
}
