import { app, session, shell } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/** 小米账号登录窗口使用的会话分区（与主窗口隔离，且不注入应用 CSP） */
export const LOGIN_PARTITION = 'persist:mimo-login'

/** 登录流程允许的域名后缀：MiMo 平台与小米账号体系 */
const LOGIN_ALLOWED_HOST_SUFFIXES = ['xiaomimimo.com', 'xiaomi.com', 'mi.com']

function isHttpUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://')
}

/** 只允许打开 http(s) 外链，拦截 file://、自定义协议等（防止钓鱼协议被拉起） */
export function openExternalSafely(url: string): void {
  if (isHttpUrl(url)) void shell.openExternal(url)
}

function isAllowedLoginUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    const hostname = parsed.hostname.toLowerCase()
    return LOGIN_ALLOWED_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    )
  } catch {
    return false
  }
}

/**
 * 集中为所有 webContents 挂导航与窗口策略：
 * - 主窗口：只能停留在应用自身的渲染产物（file://dist/ 或 dev server）
 * - 登录窗口：只能在小米账号相关域名内跳转
 * - 一律禁止 <webview>、限制 window.open
 */
export function installAppSecurity(): void {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? ''
  // 与 main.ts 中 APP_ROOT/dist 保持一致（本文件会被打包进 dist-electron/main.js）
  const appRoot = process.env.APP_ROOT ?? path.join(__dirname, '..')
  const rendererDistUrl = pathToFileURL(path.join(appRoot, 'dist') + path.sep).href

  const isAppUrl = (url: string): boolean => {
    if (url.startsWith('file://')) return url.startsWith(rendererDistUrl)
    if (devServerUrl && url.startsWith(devServerUrl)) return true
    return false
  }

  app.on('web-contents-created', (_event, contents) => {
    // Session 实例没有公开 partition 字段，用实例身份比对判断是否登录窗口
    const isLoginContents = contents.session === session.fromPartition(LOGIN_PARTITION)

    // <webview> 标签一律禁用
    contents.on('will-attach-webview', (event) => {
      event.preventDefault()
    })

    contents.setWindowOpenHandler(({ url }) => {
      if (isLoginContents && isAllowedLoginUrl(url)) return { action: 'allow' }
      openExternalSafely(url)
      return { action: 'deny' }
    })

    contents.on('will-navigate', (event, url) => {
      if (isLoginContents) {
        if (isAllowedLoginUrl(url)) return
        event.preventDefault()
        openExternalSafely(url)
        return
      }

      if (isAppUrl(url)) return
      event.preventDefault()
      openExternalSafely(url)
    })

    // 服务端 302 跳转不触发 will-navigate，需要单独拦截
    contents.on('will-redirect', (event, url) => {
      if (isLoginContents) {
        if (isAllowedLoginUrl(url)) return
        event.preventDefault()
        return
      }

      if (isAppUrl(url)) return
      event.preventDefault()
    })
  })

  // 渲染层不需要任何浏览器权限（通知走主进程 Notification）
  // defaultSession 必须在 app ready 之后才能访问
  void app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler(
      (_webContents, _permission, callback) => {
        callback(false)
      },
    )
  })
}
