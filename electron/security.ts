import { app, session, shell, type WebContents } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/** 小米账号登录窗口使用的会话分区（与主窗口隔离，且不注入应用 CSP） */
export const LOGIN_PARTITION = 'persist:mimo-login'

/** 登录流程允许的域名后缀：MiMo 平台与小米账号体系 */
const LOGIN_ALLOWED_HOST_SUFFIXES = ['xiaomimimo.com', 'xiaomi.com', 'mi.com']

/**
 * 应用安全策略：为所有 webContents 统一安装导航与窗口约束。
 *
 * - 主窗口：只能停留在应用自身的渲染产物（file://dist/ 或 dev server）
 * - 登录窗口：只能在小米账号相关域名内跳转
 * - 一律禁止 <webview>、拦截 window.open
 */
export class AppSecurity {
  private readonly loginPartition: string

  constructor(loginPartition: string) {
    this.loginPartition = loginPartition
  }

  /** 安装策略。可在 app ready 之前调用，保证任何 webContents 创建时就已生效 */
  install(): void {
    app.on('web-contents-created', (_event, contents) => {
      this.guardWebContents(contents)
    })

    // 渲染层不需要任何浏览器权限（通知走主进程 Notification）
    // defaultSession 必须在 app ready 之后才能访问
    void app.whenReady().then(() => {
      session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(false)
      })
    })
  }

  /** 只允许打开 http(s) 外链，拦截 file://、自定义协议等 */
  openExternalSafely(url: string): void {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url)
    }
  }

  /** 当前 webContents 是否属于登录窗口 */
  private isLoginContents(contents: WebContents): boolean {
    // Session 实例没有公开 partition 字段，用实例身份比对判断
    return contents.session === session.fromPartition(this.loginPartition)
  }

  private isAllowedLoginUrl(url: string): boolean {
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

  private isAppUrl(url: string): boolean {
    if (url.startsWith('file://')) return url.startsWith(this.rendererDistUrl)
    return this.devServerUrl.length > 0 && url.startsWith(this.devServerUrl)
  }

  /** 延迟读取环境变量：本模块可能在 main.ts 设置 APP_ROOT 之前就被 import */
  private get devServerUrl(): string {
    return process.env.VITE_DEV_SERVER_URL ?? ''
  }

  private get rendererDistUrl(): string {
    const appRoot = process.env.APP_ROOT ?? path.join(__dirname, '..')
    return pathToFileURL(path.join(appRoot, 'dist') + path.sep).href
  }

  private guardWebContents(contents: WebContents): void {
    const isLoginContents = this.isLoginContents(contents)

    // <webview> 标签一律禁用
    contents.on('will-attach-webview', (event) => {
      event.preventDefault()
    })

    contents.setWindowOpenHandler(({ url }) => {
      if (isLoginContents && this.isAllowedLoginUrl(url)) return { action: 'allow' }
      this.openExternalSafely(url)
      return { action: 'deny' }
    })

    contents.on('will-navigate', (event, url) => {
      if (isLoginContents) {
        if (this.isAllowedLoginUrl(url)) return
        event.preventDefault()
        this.openExternalSafely(url)
        return
      }

      if (this.isAppUrl(url)) return
      event.preventDefault()
      this.openExternalSafely(url)
    })

    // 服务端 302 跳转不触发 will-navigate，需要单独拦截
    contents.on('will-redirect', (event, url) => {
      if (isLoginContents) {
        if (this.isAllowedLoginUrl(url)) return
        event.preventDefault()
        return
      }

      if (this.isAppUrl(url)) return
      event.preventDefault()
    })
  }
}

/** 全局唯一的安全策略实例 */
export const appSecurity = new AppSecurity(LOGIN_PARTITION)
