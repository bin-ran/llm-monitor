import { BrowserWindow, Notification } from 'electron'
import {
  PROVIDER_IDS,
  PROVIDER_META,
  PROVIDER_STATUS,
  type ProviderId,
  type ProviderResult,
} from '../src/shared/provider'
import { readConfig, readCredential } from './config'
import { fetchProviderBalance } from './providers'

let mainWindow: BrowserWindow | null = null
let refreshTimer: NodeJS.Timeout | null = null
const notifiedProviders = new Set<ProviderId>()

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

export async function fetchAllBalances(): Promise<ProviderResult[]> {
  const tasks = PROVIDER_IDS.map(async (providerId): Promise<ProviderResult> => {
    const credential = await readCredential(providerId)
    if (!credential) {
      return {
        providerId,
        status: PROVIDER_STATUS.MISSING_CREDENTIAL,
        balance: null,
        errorMessage: '未配置 API Key',
        updatedAt: Date.now(),
      }
    }
    return fetchProviderBalance(providerId, credential)
  })

  return Promise.all(tasks)
}

/** 自动刷新：查询所有平台并推送到渲染层，同时检查余额告警 */
export async function runAutoRefresh(): Promise<ProviderResult[]> {
  const results = await fetchAllBalances()

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('balances:updated', results)
  }

  notifyLowBalance(results)
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

    if (isLow && !notifiedProviders.has(result.providerId)) {
      notifiedProviders.add(result.providerId)
      new Notification({
        title: `${meta.label} 余额不足`,
        body: `当前可用 ${result.balance.available.toFixed(2)} ${result.balance.currency}，低于告警阈值 ${threshold}`,
      }).show()
      continue
    }

    if (!isLow) {
      notifiedProviders.delete(result.providerId)
    }
  }
}
