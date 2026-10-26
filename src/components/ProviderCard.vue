<template>
  <section
    class="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
  >
    <header class="flex shrink-0 items-center gap-1.5">
      <ProviderIcon :provider-id="card.id" />
      <h2 class="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
        {{ card.label }}
      </h2>
      <button
        class="ml-auto shrink-0 cursor-pointer rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium transition hover:brightness-95 dark:hover:brightness-125"
        :class="statusClass"
        title="点击重新查询该平台"
        @click="onRefresh"
      >
        {{ statusText }}
      </button>
    </header>

    <div class="flex shrink-0 items-end gap-1.5">
      <span class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
        {{ amountText }}
      </span>
      <span class="pb-0.5 text-xs text-gray-500 dark:text-gray-400">{{ currencyText }}</span>
    </div>

    <div
      v-if="card.result.status === PROVIDER_STATUS.ERROR"
      class="text-[0.7rem] text-red-500"
    >
      {{ card.result.errorMessage }}
    </div>

    <div
      v-else-if="card.result.status === PROVIDER_STATUS.INVALID_CREDENTIAL"
      class="text-[0.7rem] text-orange-500"
    >
      凭证已失效，请到设置页重新配置
    </div>

    <div
      v-else-if="card.result.status === PROVIDER_STATUS.MISSING_CREDENTIAL"
      class="text-[0.7rem] text-amber-500"
    >
      未配置凭据，无法查询余额
    </div>

    <ul v-if="details.length > 0" class="flex shrink-0 flex-wrap items-center gap-1.5">
      <li
        v-for="detail in details"
        :key="detail.label"
        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium"
        :class="detailToneClass(detail.label)"
      >
        <span class="opacity-70">{{ detail.label }}</span>
        <span>{{ detail.value }}</span>
      </li>
    </ul>

    <footer
      class="mt-auto flex shrink-0 items-center gap-3 text-[0.7rem] text-gray-500 dark:text-gray-400"
    >
      <button class="ml-auto cursor-pointer transition hover:text-teal-600" @click="onOpenConsole">
        控制台
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import ProviderIcon from './ProviderIcon.vue'
import { BALANCE_DETAIL_LABEL } from '../shared/balance-detail'
import { PROVIDER_STATUS, type ProviderId } from '../shared/provider'
import type { ProviderCardModel } from '../stores/providers'
import { formatCurrencyUnit } from '../utils/format'

/** 明细标签配色：现金用主色、赠送用强调色 */
const DETAIL_TONE: Record<string, string> = {
  [BALANCE_DETAIL_LABEL.CASH]: 'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  [BALANCE_DETAIL_LABEL.GIFT]:
    'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
}

/** 未收录的明细标签回退为中性配色 */
const DETAIL_TONE_FALLBACK = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'

interface Props {
  card: ProviderCardModel
}

const props = defineProps<Props>()

const emit = defineEmits<{
  openConsole: [providerId: ProviderId]
  refresh: [providerId: ProviderId]
}>()

const statusText = computed(() => {
  switch (props.card.result.status) {
    case PROVIDER_STATUS.OK:
      return '正常'
    case PROVIDER_STATUS.ERROR:
      return '查询失败'
    case PROVIDER_STATUS.MISSING_CREDENTIAL:
      return '未配置'
    case PROVIDER_STATUS.INVALID_CREDENTIAL:
      return '凭证失效'
    case PROVIDER_STATUS.LOADING:
      return '查询中'
    default:
      return '待查询'
  }
})

const statusClass = computed(() => {
  switch (props.card.result.status) {
    case PROVIDER_STATUS.OK:
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    case PROVIDER_STATUS.ERROR:
      return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
    case PROVIDER_STATUS.MISSING_CREDENTIAL:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    case PROVIDER_STATUS.INVALID_CREDENTIAL:
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
    default:
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
  }
})

const amountText = computed(() => {
  const balance = props.card.result.balance
  if (!balance) return '—'
  return balance.available.toFixed(2)
})

const currencyText = computed(() => {
  const balance = props.card.result.balance
  if (!balance) return ''
  return formatCurrencyUnit(balance.currency)
})

const details = computed(() => props.card.result.balance?.details ?? [])

function detailToneClass(label: string): string {
  return DETAIL_TONE[label] ?? DETAIL_TONE_FALLBACK
}

function onOpenConsole(): void {
  emit('openConsole', props.card.id)
}

function onRefresh(): void {
  emit('refresh', props.card.id)
}
</script>
