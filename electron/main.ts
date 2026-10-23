import { app, BrowserWindow, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readWindowBounds, saveWindowBounds, type WindowBounds } from './config'
import { registerIpcHandlers } from './ipc'
import { setMainWindow, startAutoRefresh, stopAutoRefresh } from './refresh'
import { installAppSecurity } from './security'
import { createTray } from './tray'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// 先安装导航/窗口安全策略，确保任何 webContents 创建时就已生效
installAppSecurity()

const DEFAULT_WIDTH = 780
const DEFAULT_HEIGHT = 460
/** 窗口至少要有这么多落在可视区域内，才算位置可用 */
const MIN_VISIBLE_SIZE = 120

let win: BrowserWindow | null = null
let isQuitting = false
let saveBoundsTimer: NodeJS.Timeout | null = null

function getWindow(): BrowserWindow | null {
  return win
}

/** 还原上次窗口位置；显示器变动导致位置不可用时回落到默认尺寸居中 */
function resolveWindowBounds(): WindowBounds {
  const saved = readWindowBounds()
  if (saved && isBoundsVisible(saved)) return saved

  return { ...getCenteredPosition(), width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
}

function isBoundsVisible(bounds: WindowBounds): boolean {
  const isOnSomeDisplay = screen.getAllDisplays().some((display) => {
    const area = display.workArea
    const overlapWidth =
      Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x)
    const overlapHeight =
      Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y)
    return overlapWidth >= MIN_VISIBLE_SIZE && overlapHeight >= MIN_VISIBLE_SIZE
  })
  return isOnSomeDisplay
}

function getCenteredPosition(): { x: number; y: number } {
  const area = screen.getPrimaryDisplay().workArea
  return {
    x: Math.round(area.x + (area.width - DEFAULT_WIDTH) / 2),
    y: Math.round(area.y + (area.height - DEFAULT_HEIGHT) / 2),
  }
}

/** 移动/缩放后防抖保存，避免拖动过程中频繁写配置 */
function scheduleSaveBounds(): void {
  if (saveBoundsTimer) clearTimeout(saveBoundsTimer)
  saveBoundsTimer = setTimeout(() => {
    saveBoundsTimer = null
    if (!win || win.isDestroyed()) return
    saveWindowBounds(win.getBounds())
  }, 400)
}

function createWindow(): void {
  const bounds = resolveWindowBounds()

  win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 780,
    minHeight: 460,
    icon: path.join(process.env.VITE_PUBLIC ?? '', 'favicon.ico'),
    backgroundColor: '#121212',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 隐藏默认菜单栏（File/Edit/View/Window）
  win.setMenu(null)
  win.setMenuBarVisibility(false)

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // 用通用 move/resize 事件（moved/resized 在程序化调整窗口时不一定触发）
  win.on('move', scheduleSaveBounds)
  win.on('resize', scheduleSaveBounds)

  win.on('close', (event) => {
    // 关闭前兜底保存当前位置，避免防抖未触发就隐藏
    if (win && !win.isDestroyed() && !win.isMinimized()) {
      saveWindowBounds(win.getBounds())
    }
    if (isQuitting) return
    // 关闭时收起到托盘，保持后台自动刷新
    event.preventDefault()
    win?.hide()
  })

  win.on('closed', () => {
    win = null
    setMainWindow(null)
  })
}

// 禁用 Windows 7 的 GPU 加速
if (process.platform === 'win32') {
  app.disableHardwareAcceleration()
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const window = getWindow()
    if (!window) return
    window.show()
    window.focus()
  })

  app.whenReady().then(() => {
    registerIpcHandlers()
    createWindow()
    setMainWindow(win)
    createTray(getWindow)
    startAutoRefresh()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      setMainWindow(win)
    }
  })

  app.on('before-quit', () => {
    isQuitting = true
    stopAutoRefresh()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
