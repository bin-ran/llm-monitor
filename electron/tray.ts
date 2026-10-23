import { BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron'
import path from 'node:path'
import { PROVIDER_META } from '../src/shared/provider'

let tray: Tray | null = null

export function createTray(getWindow: () => BrowserWindow | null): Tray | null {
  if (tray) return tray

  const publicDir = process.env.VITE_PUBLIC ?? process.cwd()
  const icon = nativeImage.createFromPath(path.join(publicDir, 'favicon.ico'))
  if (icon.isEmpty()) {
    console.warn('[tray] 图标加载失败，跳过托盘图标')
    return null
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('LLM Monitor')

  const providerItems = Object.values(PROVIDER_META).map((meta) => ({
    label: `打开 ${meta.label} 控制台`,
    click: () => {
      void shell.openExternal(meta.homepage)
    },
  }))

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          const window = getWindow()
          if (!window) return
          window.show()
          window.focus()
        },
      },
      { type: 'separator' },
      ...providerItems,
      { type: 'separator' },
      { label: '退出', role: 'quit' },
    ]),
  )

  tray.on('click', () => {
    const window = getWindow()
    if (!window) return
    if (window.isVisible()) {
      window.hide()
    } else {
      window.show()
    }
  })

  return tray
}
