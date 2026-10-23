import { BrowserWindow, session } from 'electron'
import { PROVIDER_META } from '../src/shared/provider'
import { saveCredential } from './config'
import { LOGIN_PARTITION } from './security'

/** MiMo 平台需要的 Cookie，serviceToken 为主，其余为辅助项 */
const REQUIRED_COOKIE = 'api-platform_serviceToken'
const OPTIONAL_COOKIES = ['userId', 'serviceToken', 'api-platform_ph', 'api-platform_slh', 'xiaomichatbot_ph']

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000

export interface LoginResult {
  ok: boolean
  message: string
}

/**
 * 打开 MiMo 控制台登录窗口，登录成功后抓取 Cookie 并保存
 */
export function openMimoLoginWindow(): Promise<LoginResult> {
  return new Promise((resolve) => {
    const loginSession = session.fromPartition(LOGIN_PARTITION)
    const loginWindow = new BrowserWindow({
      width: 1024,
      height: 880,
      title: '登录小米 MiMo',
      autoHideMenuBar: true,
      webPreferences: {
        partition: LOGIN_PARTITION,
      },
    })

    let isFinished = false

    function finish(result: LoginResult): void {
      if (isFinished) return
      isFinished = true
      clearInterval(timer)
      clearTimeout(timeout)
      resolve(result)
    }

    const timer = setInterval(() => {
      void collectCookie(loginSession).then(async (cookie) => {
        if (!cookie || isFinished) return
        await saveCredential('mimo', { cookie })
        finish({ ok: true, message: '已获取小米账号登录态' })
        loginWindow.close()
      })
    }, 1000)

    const timeout = setTimeout(() => {
      finish({ ok: false, message: '登录超时，请重试' })
      loginWindow.close()
    }, LOGIN_TIMEOUT_MS)

    loginWindow.on('closed', () => {
      finish({ ok: false, message: '已取消登录' })
    })

    void loginWindow.loadURL(PROVIDER_META.mimo.loginUrl)
  })
}

async function collectCookie(targetSession: Electron.Session): Promise<string | null> {
  const cookies = await targetSession.cookies.get({ url: 'https://platform.xiaomimimo.com' })
  const serviceToken = cookies.find((cookie) => cookie.name === REQUIRED_COOKIE)
  if (!serviceToken) return null

  const parts = [`${REQUIRED_COOKIE}=${serviceToken.value}`]

  for (const name of OPTIONAL_COOKIES) {
    const cookie = cookies.find((item) => item.name === name)
    if (cookie) parts.push(`${name}=${cookie.value}`)
  }

  return parts.join('; ')
}
