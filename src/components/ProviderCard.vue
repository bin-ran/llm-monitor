<template>
  <section
    class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
  >
    <header class="flex items-center gap-2">
      <span class="h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: card.accent }" />
      <h2 class="text-base font-semibold text-gray-800 dark:text-gray-100">{{ card.label }}</h2>
      <span
        class="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
        :class="statusClass"
      >
        {{ statusText }}
      </span>
    </header>

    <div class="flex items-end gap-2">
      <span class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
        {{ amountText }}
      </span>
      <span class="pb-1 text-sm text-gray-500 dark:text-gray-400">{{ currencyText }}</span>
    </div>

    <div v-if="card.result.status === PROVIDER_STATUS.ERROR" class="text-xs text-red-500">
      {{ card.result.errorMessage }}
    </div>

    <div v-else-if="card.result.status === PROVIDER_STATUS.MISSING_CREDENTIAL" class="text-xs text-amber-500">
      未配置 API Key，无法查询余额
    </div>

    <div v-if="ratioText" class="flex flex-col gap-1">
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          class="h-full rounded-full transition-all"
          :style="{ width: `${ratioPercent}%`, backgroundColor: card.accent }"
        />
      </div>
      <span class="text-xs text-gray-500 dark:text-gray-400">{{ ratioText }}</span>
    </div>

    <ul v-if="details.length > 0" class="flex flex-col gap-1">
      <li
        v-for="detail in details"
        :key="detail.label"
        class="flex justify-between text-xs text-gray-500 dark:text-gray-400"
      >
        <span>{{ detail.label }}</span>
        <span class="font-medium text-gray-700 dark:text-gray-300">{{ detail.value }}</span>
      </li>
    </ul>

    <footer class="mt-auto flex items-center gap-3 pt-1 text-xs text-gray-500 dark:text-gray-400">
      <span>{{ updatedAtText }}</span>
      <button class="ml-auto cursor-pointer transition hover:text-teal-600" @click="onOpenConsole">控制台</button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { PROVIDER_STATUS, type ProviderId } from '../shared/provider'
import type { ProviderCardModel } from '../stores/providers'
import { formatCurrencySymbol, formatTime } from '../utils/format'

interface Props {
  card: ProviderCardModel
}

const props = defineProps<Props>()

const emit = defineEmits<{
  openConsole: [providerId: ProviderId]
}>()

const statusText = computed(() => {
  switch (props.card.result.status) {
    case PROVIDER_STATUS.OK:
      return '正常'
    case PROVIDER_STATUS.ERROR:
      return '查询失败'
    case PROVIDER_STATUS.MISSING_CREDENTIAL:
      return '未配置'
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
  return `${formatCurrencySymbol(balance.currency)} ${balance.currency}`
})

const details = computed(() => props.card.result.balance?.details ?? [])

const ratioPercent = computed(() => {
  const balance = props.card.result.balance
  if (!balance || balance.total === null || balance.total <= 0) return 0
  const percent = (balance.available / balance.total) * 100
  return Math.max(0, Math.min(100, percent))
})

const ratioText = computed(() => {
  const balance = props.card.result.balance
  if (!balance || balance.total === null || balance.total <= 0) return ''
  return `可用占比 ${ratioPercent.value.toFixed(1)}%（总额 ${balance.total.toFixed(2)}）`
})

const updatedAtText = computed(() => formatTime(props.card.result.updatedAt))

function onOpenConsole(): void {
  emit('openConsole', props.card.id)
}
</script>
