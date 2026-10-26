import { formatAmount } from './format'
import type { ProviderBalanceDetail } from './provider'

/** 卡片明细统一只展示现金与赠送两项 */
export const BALANCE_DETAIL_LABEL = {
  CASH: '现金余额',
  GIFT: '赠送余额',
} as const

/**
 * 构造卡片明细：现金余额固定展示；
 * 赠送余额为 0 时说明该平台没有赠送额度，不再展示这一项。
 */
export function createBalanceDetails(cash: number, gift: number): ProviderBalanceDetail[] {
  const details: ProviderBalanceDetail[] = [
    { label: BALANCE_DETAIL_LABEL.CASH, value: formatAmount(cash) },
  ]

  if (gift > 0) {
    details.push({ label: BALANCE_DETAIL_LABEL.GIFT, value: formatAmount(gift) })
  }

  return details
}
