export function formatTime(timestamp: number): string {
  if (timestamp <= 0) return '尚未查询'

  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

export { formatCurrencyUnit } from '../shared/format'
