export const PROVIDER_IDS = ['deepseek', 'kimi', 'zhipu', 'minimax'] as const

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

export const REFRESH_INTERVAL_OPTIONS = [60, 300, 1800, 3600] as const

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
  /** 卡片主色 */
  accent: string
  /** 余额币种 */
  currency: string
}

export const PROVIDER_META: Record<ProviderId, ProviderMeta> = {
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    homepage: 'https://platform.deepseek.com',
    accent: '#4d6bfe',
    currency: CURRENCY.CNY,
  },
  kimi: {
    id: 'kimi',
    label: 'Kimi',
    homepage: 'https://platform.kimi.com',
    accent: '#1f1f1f',
    currency: CURRENCY.CNY,
  },
  zhipu: {
    id: 'zhipu',
    label: '智谱 GLM',
    homepage: 'https://open.bigmodel.cn',
    accent: '#3859ff',
    currency: CURRENCY.CNY,
  },
  minimax: {
    id: 'minimax',
    label: 'MiniMax',
    homepage: 'https://platform.minimaxi.com',
    accent: '#ff5a3c',
    currency: CURRENCY.CNY,
  },
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoRefreshEnabled: true,
  refreshIntervalSeconds: 300,
  thresholds: {},
}
