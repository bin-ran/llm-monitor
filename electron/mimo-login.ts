import { BrowserWindow, session } from 'electron'
import { PROVIDER_META, type LoginResult } from '../src/shared/provider'
import { configStore } from './config'
import { LOGIN_PARTITION } from './security'

/** MiMo 平台需要的 Cookie，serviceToken 为主，其余为辅助项 */
const REQUIRED_COOKIE = 'api-platform_serviceToken'
const OPTIONAL_COOKIES = [
  'userId',
  'serviceToken',
  'api-platform_ph',
  'api-platform_slh',
  'xiaomichatbot_ph',
]
const COOKIE_URL = 'https://platform.xiaomimimo.com'
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000
const COOKIE_POLL_INTERVAL_MS = 1000

/**
 * 小米 MiMo 网页登录流程：打开登录窗口 → 轮询抓取登录态 Cookie → 保存凭据。
 * 官方未提供余额接口，只能依赖网页登录态。
 */
export class MimoLoginFlow {
  private readonly partition: string

  constructor(partition: string) {
    this.partition = partition
  }

  open(): Promise<LoginResult> {
    return new Promise((resolve) => {
      const loginSession = session.fromPartition(this.partition)
      const loginWindow = new BrowserWindow({
        width: 1024,
        height: 880,
        title: '登录小米 MiMo',
        autoHideMenuBar: true,
        webPreferences: { partition: this.partition },
      })

      let isFinished = false

      const finish = (result: LoginResult): void => {
        if (isFinished) return
        isFinished = true
        clearInterval(pollTimer)
        clearTimeout(timeoutTimer)
        resolve(result)
      }

      const pollTimer = setInterval(() => {
        void this.collectCookie(loginSession).then(async (cookie) => {
          if (!cookie || isFinished) return
          await configStore.saveCredential('mimo', { cookie })
          finish({ ok: true, message: '已获取小米账号登录态' })
          loginWindow.close()
        })
      }, COOKIE_POLL_INTERVAL_MS)

      const timeoutTimer = setTimeout(() => {
        finish({ ok: false, message: '登录超时，请重试' })
        loginWindow.close()
      }, LOGIN_TIMEOUT_MS)

      loginWindow.on('closed', () => {
        finish({ ok: false, message: '已取消登录' })
      })

      void loginWindow.loadURL(PROVIDER_META.mimo.loginUrl)
    })
  }

  /** 拼装 Cookie 请求头，缺少主 Cookie 时返回 null 表示尚未登录 */
  private async collectCookie(targetSession: Electron.Session): Promise<string | null> {
    const cookies = await targetSession.cookies.get({ url: COOKIE_URL })
    const serviceToken = cookies.find((cookie) => cookie.name === REQUIRED_COOKIE)
    if (!serviceToken) return null

    const parts = [`${REQUIRED_COOKIE}=${serviceToken.value}`]

    for (const name of OPTIONAL_COOKIES) {
      const cookie = cookies.find((item) => item.name === name)
      if (cookie) parts.push(`${name}=${cookie.value}`)
    }

    return parts.join('; ')
  }
}

/** 全局唯一的登录流程实例 */
export const mimoLoginFlow = new MimoLoginFlow(LOGIN_PARTITION)
