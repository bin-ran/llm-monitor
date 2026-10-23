import { type BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron'
import path from 'node:path'
import {
  PROVIDER_META,
  PROVIDER_STATUS,
  type ProviderBalance,
  type ProviderResult,
} from '../src/shared/provider'
import { formatCurrencyUnit } from '../src/shared/format'
import { readConfig } from './config'

let tray: Tray | null = null
let latestResults: ProviderResult[] = []
let getMainWindow: () => BrowserWindow | null = () => null

export function createTray(windowGetter: () => BrowserWindow | null): Tray | null {
  getMainWindow = windowGetter
  if (tray) return tray

  const publicDir = process.env.VITE_PUBLIC ?? process.cwd()
  const icon = nativeImage.createFromPath(path.join(publicDir, 'favicon.ico'))
  if (icon.isEmpty()) {
    console.warn('[tray] 图标加载失败，跳过托盘图标')
    return null
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('LLM Monitor')

  tray.on('click', () => {
    const window = getMainWindow()
    if (!window) return
    if (window.isVisible()) {
      window.hide()
    } else {
      window.show()
    }
  })

  refreshTrayMenu()
  return tray
}

/** 余额刷新后同步托盘 tooltip 与菜单 */
export function updateTrayBalances(results: ProviderResult[]): void {
  latestResults = results
  if (!tray) return

  tray.setToolTip(buildTooltip(results))
  refreshTrayMenu()
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

function buildTooltip(results: ProviderResult[]): string {
  if (results.length === 0) return 'LLM Monitor'

  const lines = ['LLM Monitor']
  for (const result of results) {
    lines.push(`${PROVIDER_META[result.providerId].label}  ${formatBalanceText(result)}`)
  }

  const invalidCount = countByStatus(results, PROVIDER_STATUS.INVALID_CREDENTIAL)
  if (invalidCount > 0) lines.push(`⚠ ${invalidCount} 个平台凭证失效`)

  const lowCount = countLowBalance(results)
  if (lowCount > 0) lines.push(`⚠ ${lowCount} 个平台余额不足`)

  return lines.join('\n')
}

function formatBalanceText(result: ProviderResult): string {
  switch (result.status) {
    case PROVIDER_STATUS.OK:
      return result.balance ? formatAmount(result.balance) : '—'
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

function formatAmount(balance: ProviderBalance): string {
  return `${balance.available.toFixed(2)} ${formatCurrencyUnit(balance.currency)}`
}

function countByStatus(results: ProviderResult[], status: ProviderResult['status']): number {
  return results.filter((result) => result.status === status).length
}

function countLowBalance(results: ProviderResult[]): number {
  const thresholds = readConfig().thresholds
  let count = 0

  for (const result of results) {
    if (result.status !== PROVIDER_STATUS.OK || !result.balance) continue
    const threshold = thresholds[result.providerId]
    if (threshold === undefined) continue
    if (result.balance.available < threshold) count++
  }

  return count
}

function refreshTrayMenu(): void {
  if (!tray) return

  const items: Electron.MenuItemConstructorOptions[] = [
    {
      label: '显示主窗口',
      click: () => {
        const window = getMainWindow()
        if (!window) return
        window.show()
        window.focus()
      },
    },
    { type: 'separator' },
  ]

  if (latestResults.length === 0) {
    items.push({ label: '暂无余额数据', enabled: false })
  }

  const thresholdMap = readConfig().thresholds

  for (const result of latestResults) {
    const meta = PROVIDER_META[result.providerId]
    const threshold = thresholdMap[result.providerId]
    const isLow =
      result.status === PROVIDER_STATUS.OK &&
      result.balance !== null &&
      threshold !== undefined &&
      result.balance.available < threshold

    items.push({
      label: `${meta.label}　${formatBalanceText(result)}${isLow ? ' · 余额不足' : ''}`,
      click: () => {
        void shell.openExternal(meta.homepage)
      },
    })
  }

  items.push({ type: 'separator' })
  items.push({ label: '退出', role: 'quit' })

  tray.setContextMenu(Menu.buildFromTemplate(items))
}
