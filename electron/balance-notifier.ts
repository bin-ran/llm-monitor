import { Notification } from 'electron'
import {
  PROVIDER_META,
  PROVIDER_STATUS,
  type ProviderId,
  type ProviderResult,
} from '../src/shared/provider'
import { formatCurrencyUnit } from '../src/shared/format'
import { configStore } from './config'

/**
 * 余额告警器：余额低于阈值、凭证失效时弹系统通知。
 * 同一平台的同类告警只提醒一次，恢复后自动解除，避免重复打扰。
 */
export class BalanceNotifier {
  private readonly notifiedLowBalance = new Set<ProviderId>()
  private readonly notifiedInvalidCredential = new Set<ProviderId>()

  notify(results: ProviderResult[]): void {
    this.notifyLowBalance(results)
    this.notifyInvalidCredential(results)
  }

  private notifyLowBalance(results: ProviderResult[]): void {
    const thresholds = configStore.read().thresholds

    for (const result of results) {
      if (result.status !== PROVIDER_STATUS.OK || !result.balance) continue

      const threshold = thresholds[result.providerId]
      if (threshold === undefined) continue

      const isLow = result.balance.available < threshold
      const meta = PROVIDER_META[result.providerId]

      if (isLow && !this.notifiedLowBalance.has(result.providerId)) {
        this.notifiedLowBalance.add(result.providerId)
        new Notification({
          title: `${meta.label} 余额不足`,
          body: `当前可用 ${result.balance.available.toFixed(2)} ${formatCurrencyUnit(result.balance.currency)}，低于告警阈值 ${threshold} 元`,
        }).show()
        continue
      }

      if (!isLow) {
        this.notifiedLowBalance.delete(result.providerId)
      }
    }
  }

  private notifyInvalidCredential(results: ProviderResult[]): void {
    for (const result of results) {
      if (result.status !== PROVIDER_STATUS.INVALID_CREDENTIAL) {
        this.notifiedInvalidCredential.delete(result.providerId)
        continue
      }

      if (this.notifiedInvalidCredential.has(result.providerId)) continue
      this.notifiedInvalidCredential.add(result.providerId)

      const meta = PROVIDER_META[result.providerId]
      const hint = meta.loginUrl ? '请在设置页重新登录' : '请在设置页更新凭据'

      new Notification({
        title: `${meta.label} 凭证失效`,
        body: `${result.errorMessage}，${hint}`,
      }).show()
    }
  }
}

/** 全局唯一的告警器实例 */
export const balanceNotifier = new BalanceNotifier()
