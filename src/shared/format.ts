/** 币种展示文案：默认用中文单位，未收录的币种回退为原币种代码 */
const CURRENCY_UNIT_LABELS: Record<string, string> = {
  CNY: '元',
  USD: '美元',
  JPY: '日元',
  HKD: '港元',
  EUR: '欧元',
}

export function formatCurrencyUnit(currency: string): string {
  return CURRENCY_UNIT_LABELS[currency] ?? currency
}

/** 金额统一保留两位小数 */
export function formatAmount(value: number): string {
  return value.toFixed(2)
}
