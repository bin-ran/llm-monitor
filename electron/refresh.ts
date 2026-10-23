import { BrowserWindow, Notification } from 'electron'
import {
  PROVIDER_IDS,
  PROVIDER_META,
  PROVIDER_STATUS,
  type ProviderCredential,
  type ProviderId,
  type ProviderResult,
} from '../src/shared/provider'
import { formatCurrencyUnit } from '../src/shared/format'
import { readConfig, readCredential, isCredentialComplete } from './config'
import { fetchProviderBalance } from './providers'
import { updateTrayBalances } from './tray'

let mainWindow: BrowserWindow | null = null
let refreshTimer: NodeJS.Timeout | null = null
const notifiedLowBalance = new Set<ProviderId>()
const notifiedInvalidCredential = new Set<ProviderId>()

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

export async function fetchAllBalances(): Promise<ProviderResult[]> {
  const tasks = PROVIDER_IDS.map(async (providerId): Promise<ProviderResult> => {
    const credential = await readCredential(providerId)
    if (!isCredentialComplete(providerId, credential)) {
      return {
        providerId,
        status: PROVIDER_STATUS.MISSING_CREDENTIAL,
        balance: null,
        errorMessage: '未配置 API Key',
        updatedAt: Date.now(),
      }
    }
    return fetchProviderBalance(providerId, credential as ProviderCredential)
  })

  return Promise.all(tasks)
}

/** 自动刷新：查询所有平台并推送到渲染层，同时同步托盘与告警 */
export async function runAutoRefresh(): Promise<ProviderResult[]> {
  const results = await fetchAllBalances()

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('balances:updated', results)
  }

  updateTrayBalances(results)
  notifyLowBalance(results)
  notifyInvalidCredential(results)
  return results
}

export function startAutoRefresh(): void {
  stopAutoRefresh()

  const config = readConfig()
  if (!config.autoRefreshEnabled) return

  refreshTimer = setInterval(() => {
    void runAutoRefresh()
  }, config.refreshIntervalSeconds * 1000)
}

export function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

function notifyLowBalance(results: ProviderResult[]): void {
  const thresholds = readConfig().thresholds

  for (const result of results) {
    if (result.status !== PROVIDER_STATUS.OK || !result.balance) continue

    const threshold = thresholds[result.providerId]
    if (threshold === undefined) continue

    const isLow = result.balance.available < threshold
    const meta = PROVIDER_META[result.providerId]

    if (isLow && !notifiedLowBalance.has(result.providerId)) {
      notifiedLowBalance.add(result.providerId)
      new Notification({
        title: `${meta.label} 余额不足`,
        body: `当前可用 ${result.balance.available.toFixed(2)} ${formatCurrencyUnit(result.balance.currency)}，低于告警阈值 ${threshold} 元`,
      }).show()
      continue
    }

    if (!isLow) {
      notifiedLowBalance.delete(result.providerId)
    }
  }
}

/** 凭证失效只提醒一次，避免每次自动刷新都弹通知 */
function notifyInvalidCredential(results: ProviderResult[]): void {
  for (const result of results) {
    if (result.status !== PROVIDER_STATUS.INVALID_CREDENTIAL) {
      notifiedInvalidCredential.delete(result.providerId)
      continue
    }

    if (notifiedInvalidCredential.has(result.providerId)) continue
    notifiedInvalidCredential.add(result.providerId)

    const meta = PROVIDER_META[result.providerId]
    const hint = meta.loginUrl ? '请在设置页重新登录' : '请在设置页更新凭据'

    new Notification({
      title: `${meta.label} 凭证失效`,
      body: `${result.errorMessage}，${hint}`,
    }).show()
  }
}
