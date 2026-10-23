import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerIpcHandlers } from './ipc'
import { setMainWindow, startAutoRefresh, stopAutoRefresh } from './refresh'
import { createTray } from './tray'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null = null
let isQuitting = false

function getWindow(): BrowserWindow | null {
  return win
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 980,
    height: 680,
    minWidth: 780,
    minHeight: 560,
    icon: path.join(process.env.VITE_PUBLIC ?? '', 'favicon.ico'),
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.on('close', (event) => {
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
