import { ProviderError } from './http'

/** 视为「凭证失效」的响应片段（各平台文案不统一，集中在此维护） */
const INVALID_CREDENTIAL_PATTERNS = [
  'incorrect api key',
  'invalid api key',
  'invalid api-key',
  'invalidapikey',
  'invalid authentication',
  'authentication fails',
  'unauthorized',
  'not authorized',
  'access key is not found',
  'invalidaccesskeyid',
  'invalidcredentials',
  '登录态',
  '请重新登录',
  'loginurl',
  '用户不存在',
  'invalid token',
  '身份验证失败',
  '鉴权失败',
  '密钥无效',
]

/** MiniMax 等平台把鉴权错误放在业务码里 */
const INVALID_CREDENTIAL_BIZ_CODES = ['1000', '1004', '2049']

const INVALID_CREDENTIAL_HTTP_STATUS = new Set([401, 403])

/**
 * 判断错误是否属于「凭证失效/过期」，用于引导用户去重新配置或登录
 */
export function isInvalidCredentialError(error: unknown): boolean {
  if (error instanceof ProviderError && error.status !== null) {
    if (INVALID_CREDENTIAL_HTTP_STATUS.has(error.status)) return true
  }

  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()

  for (const pattern of INVALID_CREDENTIAL_PATTERNS) {
    if (lower.includes(pattern)) return true
  }

  for (const code of INVALID_CREDENTIAL_BIZ_CODES) {
    if (message.includes(`"status_code":${code}`)) return true
  }

  return false
}
