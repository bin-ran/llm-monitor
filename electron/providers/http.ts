export class ProviderError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'ProviderError'
    this.status = status
  }
}

function extractErrorMessage(text: string): string {
  try {
    const payload = JSON.parse(text) as Record<string, unknown>
    const error = payload.error
    if (error && typeof error === 'object') {
      const message = (error as Record<string, unknown>).message
      if (typeof message === 'string' && message.length > 0) return message
    }
    const message = payload.message
    if (typeof message === 'string' && message.length > 0) return message
    const msg = payload.msg
    if (typeof msg === 'string' && msg.length > 0) return msg
  } catch {
    // 响应不是 JSON，回退到原始文本
  }
  return text.slice(0, 200)
}

/**
 * 统一的 JSON 请求封装：超时控制、HTTP 错误提取、JSON 解析
 */
export async function requestJson(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 12000,
): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { headers, signal: controller.signal })
    const text = await response.text()

    if (!response.ok) {
      throw new ProviderError(extractErrorMessage(text) || `HTTP ${response.status}`, response.status)
    }

    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new ProviderError('响应不是合法 JSON', response.status)
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProviderError('请求超时', null)
    }
    throw new ProviderError(error instanceof Error ? error.message : '网络请求失败', null)
  } finally {
    clearTimeout(timer)
  }
}
