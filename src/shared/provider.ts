export const PROVIDER_IDS = ['deepseek', 'kimi', 'zhipu', 'minimax', 'mimo', 'qwen'] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

export const PROVIDER_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  OK: 'ok',
  ERROR: 'error',
  MISSING_CREDENTIAL: 'missing-credential',
} as const

export type ProviderStatus = (typeof PROVIDER_STATUS)[keyof typeof PROVIDER_STATUS]

export const CURRENCY = {
  CNY: 'CNY',
  USD: 'USD',
} as const

export const CREDENTIAL_KIND = {
  API_KEY: 'api-key',
  COOKIE: 'cookie',
  ACCESS_KEY: 'access-key',
} as const

export type CredentialKind = (typeof CREDENTIAL_KIND)[keyof typeof CREDENTIAL_KIND]

export const REFRESH_INTERVAL_OPTIONS = [60, 300, 1800, 3600] as const

/** 凭据字段集合，key 与各适配器读取的字段名一致 */
export type ProviderCredential = Record<string, string>

export interface CredentialField {
  key: string
  label: string
  placeholder: string
  isSecret: boolean
  isMultiline: boolean
}

export interface ProviderBalanceDetail {
  label: string
  value: string
}

export interface ProviderBalance {
  /** 可用余额 */
  available: number
  /** 币种，如 CNY */
  currency: string
  /** 总额度，接口未提供时为 null */
  total: number | null
  /** 已消耗额度，接口未提供时为 null */
  used: number | null
  /** 补充明细，如充值余额、代金券余额等 */
  details: ProviderBalanceDetail[]
}

export interface ProviderResult {
  providerId: ProviderId
  status: ProviderStatus
  balance: ProviderBalance | null
  errorMessage: string
  /** 毫秒时间戳，0 表示尚未查询 */
  updatedAt: number
}

export interface ProviderCredentialState {
  providerId: ProviderId
  hasCredential: boolean
  /** 脱敏后的预览，如 sk-12***abcd */
  credentialPreview: string
}

/** 登录窗口结果（目前用于小米 MiMo 抓取登录态） */
export interface LoginResult {
  ok: boolean
  message: string
}

export interface AppSettings {
  autoRefreshEnabled: boolean
  refreshIntervalSeconds: number
  /** 各平台余额告警阈值，单位与该平台币种一致 */
  thresholds: Partial<Record<ProviderId, number>>
}

export interface AppConfigView {
  providers: ProviderCredentialState[]
  settings: AppSettings
  configPath: string
  isEncryptionAvailable: boolean
}

export interface ProviderMeta {
  id: ProviderId
  label: string
  /** 控制台地址，用于跳转充值与查看账单 */
  homepage: string
  /** 余额币种 */
  currency: string
  credentialKind: CredentialKind
  credentialFields: CredentialField[]
  /** 需要网页登录的平台，登录窗口地址 */
  loginUrl: string
  /** 凭据填写提示 */
  credentialHint: string
}

const API_KEY_FIELD: CredentialField = {
  key: 'apiKey',
  label: 'API Key',
  placeholder: 'sk-...',
  isSecret: true,
  isMultiline: false,
}

export const PROVIDER_META: Record<ProviderId, ProviderMeta> = {
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    homepage: 'https://platform.deepseek.com',
    currency: CURRENCY.CNY,
    credentialKind: CREDENTIAL_KIND.API_KEY,
    credentialFields: [API_KEY_FIELD],
    loginUrl: '',
    credentialHint: '开放平台「API Keys」中创建',
  },
  kimi: {
    id: 'kimi',
    label: 'Kimi',
    homepage: 'https://platform.kimi.com',
    currency: CURRENCY.CNY,
    credentialKind: CREDENTIAL_KIND.API_KEY,
    credentialFields: [API_KEY_FIELD],
    loginUrl: '',
    credentialHint: '开放平台「API 密钥」中创建',
  },
  zhipu: {
    id: 'zhipu',
    label: '智谱 GLM',
    homepage: 'https://open.bigmodel.cn',
    currency: CURRENCY.CNY,
    credentialKind: CREDENTIAL_KIND.API_KEY,
    credentialFields: [API_KEY_FIELD],
    loginUrl: '',
    credentialHint: '开放平台「API Key 管理」中创建',
  },
  minimax: {
    id: 'minimax',
    label: 'MiniMax',
    homepage: 'https://platform.minimaxi.com',
    currency: CURRENCY.CNY,
    credentialKind: CREDENTIAL_KIND.API_KEY,
    credentialFields: [API_KEY_FIELD],
    loginUrl: '',
    credentialHint: '开放平台「接口密钥」中创建',
  },
  mimo: {
    id: 'mimo',
    label: '小米 MiMo',
    homepage: 'https://platform.xiaomimimo.com',
    currency: CURRENCY.CNY,
    credentialKind: CREDENTIAL_KIND.COOKIE,
    credentialFields: [
      {
        key: 'cookie',
        label: 'Cookie',
        placeholder: 'api-platform_serviceToken=...; userId=...',
        isSecret: true,
        isMultiline: true,
      },
    ],
    loginUrl: 'https://platform.xiaomimimo.com/#/console/balance',
    credentialHint: '官方未开放余额接口，需登录态 Cookie；点「登录获取」自动抓取',
  },
  qwen: {
    id: 'qwen',
    label: '千问AI平台',
    homepage: 'https://platform.qianwenai.com/home',
    currency: CURRENCY.CNY,
    credentialKind: CREDENTIAL_KIND.ACCESS_KEY,
    credentialFields: [
      {
        key: 'accessKeyId',
        label: 'AccessKey ID',
        placeholder: 'LTAI5t...',
        isSecret: false,
        isMultiline: false,
      },
      {
        key: 'accessKeySecret',
        label: 'AccessKey Secret',
        placeholder: '阿里云 RAM 密钥',
        isSecret: true,
        isMultiline: false,
      },
    ],
    loginUrl: '',
    credentialHint:
      '模型 API Key 无法查询余额，需阿里云 RAM 密钥（bssapi:QueryAccountBalance 只读权限）',
  },
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoRefreshEnabled: true,
  refreshIntervalSeconds: 300,
  thresholds: {},
}
