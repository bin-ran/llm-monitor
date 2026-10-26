import { formatAmount } from './format'
import type { ProviderBalanceDetail } from './provider'

/** 卡片明细统一只展示现金与赠送两项 */
export const BALANCE_DETAIL_LABEL = {
  CASH: '现金余额',
  GIFT: '赠送余额',
} as const

/**
 * 构造卡片明细：现金与赠送固定两行，接口没有该字段时按 0 展示
 */
export function createBalanceDetails(cash: number, gift: number): ProviderBalanceDetail[] {
  return [
    { label: BALANCE_DETAIL_LABEL.CASH, value: formatAmount(cash) },
    { label: BALANCE_DETAIL_LABEL.GIFT, value: formatAmount(gift) },
  ]
}
