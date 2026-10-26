import { type BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron'
import path from 'node:path'
import {
  PROVIDER_META,
  PROVIDER_STATUS,
  type ProviderBalance,
  type ProviderResult,
} from '../src/shared/provider'
import { formatCurrencyUnit } from '../src/shared/format'
import { configStore } from './config'

/**
 * 托盘控制器：维护托盘图标、提示文案与右键菜单
 */
export class TrayController {
  private tray: Tray | null = null
  private latestResults: ProviderResult[] = []
  private getMainWindow: () => BrowserWindow | null = () => null

  create(windowGetter: () => BrowserWindow | null): Tray | null {
    this.getMainWindow = windowGetter
    if (this.tray) return this.tray

    const publicDir = process.env.VITE_PUBLIC ?? process.cwd()
    const icon = nativeImage.createFromPath(path.join(publicDir, 'favicon.ico'))
    if (icon.isEmpty()) {
      console.warn('[tray] 图标加载失败，跳过托盘图标')
      return null
    }

    this.tray = new Tray(icon.resize({ width: 16, height: 16 }))
    this.tray.setToolTip('LLM Monitor')

    this.tray.on('click', () => {
      const window = this.getMainWindow()
      if (!window) return
      if (window.isVisible()) {
        window.hide()
      } else {
        window.show()
      }
    })

    this.refreshTrayMenu()
    return this.tray
  }

  /** 余额刷新后同步托盘 tooltip 与菜单 */
  updateBalances(results: ProviderResult[]): void {
    this.latestResults = results
    if (!this.tray) return

    this.tray.setToolTip(this.buildTooltip(results))
    this.refreshTrayMenu()
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }

  private buildTooltip(results: ProviderResult[]): string {
    if (results.length === 0) return 'LLM Monitor'

    const lines = ['LLM Monitor']
    for (const result of results) {
      lines.push(`${PROVIDER_META[result.providerId].label}  ${this.formatBalanceText(result)}`)
    }

    const invalidCount = this.countByStatus(results, PROVIDER_STATUS.INVALID_CREDENTIAL)
    if (invalidCount > 0) lines.push(`⚠ ${invalidCount} 个平台凭证失效`)

    const lowCount = this.countLowBalance(results)
    if (lowCount > 0) lines.push(`⚠ ${lowCount} 个平台余额不足`)

    return lines.join('\n')
  }

  private formatBalanceText(result: ProviderResult): string {
    switch (result.status) {
      case PROVIDER_STATUS.OK:
        return result.balance ? this.formatAmount(result.balance) : '—'
      case PROVIDER_STATUS.INVALID_CREDENTIAL:
        return '凭证失效，需重新配置'
      case PROVIDER_STATUS.MISSING_CREDENTIAL:
        return '未配置凭据'
      case PROVIDER_STATUS.ERROR:
        return '查询失败'
      case PROVIDER_STATUS.LOADING:
        return '查询中'
      default:
        return '待查询'
    }
  }

  private formatAmount(balance: ProviderBalance): string {
    return `${balance.available.toFixed(2)} ${formatCurrencyUnit(balance.currency)}`
  }

  private countByStatus(results: ProviderResult[], status: ProviderResult['status']): number {
    return results.filter((result) => result.status === status).length
  }

  private countLowBalance(results: ProviderResult[]): number {
    const thresholds = configStore.read().thresholds
    let count = 0

    for (const result of results) {
      if (result.status !== PROVIDER_STATUS.OK || !result.balance) continue
      const threshold = thresholds[result.providerId]
      if (threshold === undefined) continue
      if (result.balance.available < threshold) count++
    }

    return count
  }

  private refreshTrayMenu(): void {
    if (!this.tray) return

    const items: Electron.MenuItemConstructorOptions[] = [
      {
        label: '显示主窗口',
        click: () => {
          const window = this.getMainWindow()
          if (!window) return
          window.show()
          window.focus()
        },
      },
      { type: 'separator' },
    ]

    if (this.latestResults.length === 0) {
      items.push({ label: '暂无余额数据', enabled: false })
    }

    const thresholdMap = configStore.read().thresholds

    for (const result of this.latestResults) {
      const meta = PROVIDER_META[result.providerId]
      const threshold = thresholdMap[result.providerId]
      const isLow =
        result.status === PROVIDER_STATUS.OK &&
        result.balance !== null &&
        threshold !== undefined &&
        result.balance.available < threshold

      items.push({
        label: `${meta.label}　${this.formatBalanceText(result)}${isLow ? ' · 余额不足' : ''}`,
        click: () => {
          void shell.openExternal(meta.homepage)
        },
      })
    }

    items.push({ type: 'separator' })
    items.push({ label: '退出', role: 'quit' })

    this.tray.setContextMenu(Menu.buildFromTemplate(items))
  }
}

/** 全局唯一的托盘控制器实例 */
export const trayController = new TrayController()
