import { BrowserWindow } from 'electron'
import {
  PROVIDER_IDS,
  PROVIDER_STATUS,
  type ProviderId,
  type ProviderResult,
} from '../src/shared/provider'
import { balanceNotifier } from './balance-notifier'
import { configStore } from './config'
import { providerRegistry } from './providers'
import { trayController } from './tray'

/**
 * 余额刷新调度器：按平台取数、推送结果到渲染层，并驱动托盘与告警。
 * 取数的错误归一化在 ProviderRegistry，告警在 BalanceNotifier，本类只负责编排。
 */
export class BalanceRefresher {
  private mainWindow: BrowserWindow | null = null
  private refreshTimer: NodeJS.Timeout | null = null
  private lastResults: ProviderResult[] = []

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
  }

  /** 查询单个平台，供「测试连接」与卡片单独刷新使用 */
  async refreshProvider(providerId: ProviderId): Promise<ProviderResult> {
    const credential = await configStore.readCredential(providerId)

    const result = configStore.isCredentialComplete(providerId, credential)
      ? await providerRegistry.fetchBalance(providerId, credential)
      : this.createMissingCredentialResult(providerId)

    // 合并到缓存并同步托盘，保证托盘与卡片显示一致
    this.lastResults = this.lastResults.some((item) => item.providerId === providerId)
      ? this.lastResults.map((item) => (item.providerId === providerId ? result : item))
      : [...this.lastResults, result]

    trayController.updateBalances(this.lastResults)
    return result
  }

  private async fetchAllBalances(): Promise<ProviderResult[]> {
    const tasks = PROVIDER_IDS.map(async (providerId): Promise<ProviderResult> => {
      const credential = await configStore.readCredential(providerId)
      if (!configStore.isCredentialComplete(providerId, credential)) {
        return this.createMissingCredentialResult(providerId)
      }
      return providerRegistry.fetchBalance(providerId, credential)
    })

    return Promise.all(tasks)
  }

  /** 自动刷新：查询所有平台并推送到渲染层，同时同步托盘与告警 */
  async runAutoRefresh(): Promise<ProviderResult[]> {
    const results = await this.fetchAllBalances()
    this.lastResults = results

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('balances:updated', results)
    }

    trayController.updateBalances(results)
    balanceNotifier.notify(results)
    return results
  }

  start(): void {
    this.stop()

    const settings = configStore.read()
    if (!settings.autoRefreshEnabled) return

    this.refreshTimer = setInterval(() => {
      void this.runAutoRefresh()
    }, settings.refreshIntervalSeconds * 1000)
  }

  stop(): void {
    if (!this.refreshTimer) return
    clearInterval(this.refreshTimer)
    this.refreshTimer = null
  }

  private createMissingCredentialResult(providerId: ProviderId): ProviderResult {
    return {
      providerId,
      status: PROVIDER_STATUS.MISSING_CREDENTIAL,
      balance: null,
      errorMessage: '未配置凭据',
      updatedAt: Date.now(),
    }
  }
}

/** 全局唯一的刷新调度器实例 */
export const balanceRefresher = new BalanceRefresher()
