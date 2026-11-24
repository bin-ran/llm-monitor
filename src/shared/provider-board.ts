import { PROVIDER_STATUS, type ProviderId, type ProviderResult } from './provider'

export type ProviderBoardTone = 'danger' | 'warning' | 'muted' | 'normal'

export interface ProviderBoardItem {
  id: ProviderId
  label: string
  amountText: string
  thresholdText: string
  detailText: string
  statusText: string
  hintText: string
  timeText: string
  tone: ProviderBoardTone
}

export interface ProviderBoardGroup {
  key: 'attention' | 'normal' | 'pending'
  title: string
  caption: string
  countText: string
  totalText: string
  note: string
  items: ProviderBoardItem[]
}

export interface ProviderBoardSource {
  id: ProviderId
  label: string
  result: ProviderResult
}

const LOW_BALANCE_HINT = '低于阈值'

function hasBalance(result: ProviderResult): boolean {
  return result.balance !== null
}

function isLowBalance(result: ProviderResult, threshold: number | undefined): boolean {
  return threshold !== undefined && result.balance !== null && result.balance.available < threshold
}

function buildDetailText(result: ProviderResult): string {
  if (!result.balance) return ''
  return result.balance.details
    .map((detail) => `${detail.label.replace('余额', '')} ${detail.value}`)
    .join(' / ')
}

function buildTimeText(result: ProviderResult): string {
  if (result.updatedAt <= 0) return '—'
  const date = new Date(result.updatedAt)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function buildItem(
  source: ProviderBoardSource,
  threshold: number | undefined,
): ProviderBoardItem {
  const { result } = source
  const timeText = buildTimeText(result)
  const isLow = isLowBalance(result, threshold)
  const amountText = result.balance ? result.balance.available.toFixed(2) : '—'
  const thresholdText = threshold === undefined ? '—' : threshold.toFixed(2)

  let statusText = '余额充足'
  let hintText = `更新 ${timeText}`
  let tone: ProviderBoardTone = 'normal'

  switch (result.status) {
    case PROVIDER_STATUS.ERROR:
      statusText = '获取失败'
      hintText = result.errorMessage || '请求失败'
      tone = 'danger'
      break
    case PROVIDER_STATUS.INVALID_CREDENTIAL:
      statusText = '凭证失效'
      hintText = '请到设置页重新配置'
      tone = 'warning'
      break
    case PROVIDER_STATUS.MISSING_CREDENTIAL:
    case PROVIDER_STATUS.IDLE:
      statusText = '未配置'
      hintText = '配置凭据后自动查询'
      tone = 'muted'
      break
    case PROVIDER_STATUS.LOADING:
      statusText = '查询中'
      hintText = '正在获取余额'
      tone = 'muted'
      break
    default:
      if (isLow) {
        statusText = LOW_BALANCE_HINT
        hintText = `${LOW_BALANCE_HINT} ${threshold?.toFixed(2) ?? ''}`
        tone = 'warning'
      }
      break
  }

  return {
    id: source.id,
    label: source.label,
    amountText,
    thresholdText,
    detailText: buildDetailText(result),
    statusText,
    hintText,
    timeText,
    tone,
  }
}

function buildGroup(
  key: ProviderBoardGroup['key'],
  title: string,
  caption: string,
  note: string,
  sources: ProviderBoardSource[],
  thresholds: Partial<Record<ProviderId, number>>,
): ProviderBoardGroup {
  const items = sources.map((source) => buildItem(source, thresholds[source.id]))
  const total = sources.reduce((sum, source) => {
    return sum + (source.result.balance?.available ?? 0)
  }, 0)
  const anyBalance = sources.some((source) => hasBalance(source.result))

  return {
    key,
    title,
    caption,
    countText: `${items.length} 家`,
    totalText: anyBalance ? `￥${total.toFixed(2)}` : '—',
    note,
    items,
  }
}

/** 把平台按「需处理 / 正常 / 待完善」分组，异常和低于阈值的平台优先 */
export function buildProviderGroups(
  cards: ProviderBoardSource[],
  thresholds: Partial<Record<ProviderId, number>>,
): ProviderBoardGroup[] {
  const attention: ProviderBoardSource[] = []
  const pending: ProviderBoardSource[] = []
  const normal: ProviderBoardSource[] = []

  for (const card of cards) {
    const { status } = card.result
    if (status === PROVIDER_STATUS.MISSING_CREDENTIAL || status === PROVIDER_STATUS.IDLE) {
      pending.push(card)
    } else if (
      status === PROVIDER_STATUS.ERROR ||
      status === PROVIDER_STATUS.INVALID_CREDENTIAL ||
      isLowBalance(card.result, thresholds[card.id])
    ) {
      attention.push(card)
    } else {
      normal.push(card)
    }
  }

  return [
    buildGroup('attention', '需处理', '优先查看', '处理异常后会自动恢复监控', attention, thresholds),
    buildGroup('normal', '正常', '余额充足', '以上平台余额正常，无需操作', normal, thresholds),
    buildGroup('pending', '待完善', '尚未接入', '配置凭据后可自动查询余额', pending, thresholds),
  ]
}
