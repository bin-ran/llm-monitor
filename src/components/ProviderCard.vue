<template>
  <section
    class="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
  >
    <header class="flex shrink-0 items-center gap-1.5">
      <ProviderIcon :provider-id="card.id" />
      <h2 class="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
        {{ card.label }}
      </h2>
      <span
        class="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium"
        :class="statusClass"
      >
        {{ statusText }}
      </span>
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
      v-else-if="card.result.status === PROVIDER_STATUS.MISSING_CREDENTIAL"
      class="text-[0.7rem] text-amber-500"
    >
      未配置凭据，无法查询余额
    </div>

    <ul v-if="details.length > 0" class="flex flex-col gap-0.5">
      <li
        v-for="detail in details"
        :key="detail.label"
        class="flex justify-between gap-2 text-[0.7rem] text-gray-500 dark:text-gray-400"
      >
        <span class="truncate">{{ detail.label }}</span>
        <span class="shrink-0 font-medium text-gray-700 dark:text-gray-300">{{ detail.value }}</span>
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
import { PROVIDER_STATUS, type ProviderId } from '../shared/provider'
import type { ProviderCardModel } from '../stores/providers'
import { formatCurrencySymbol } from '../utils/format'

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

function onOpenConsole(): void {
  emit('openConsole', props.card.id)
}
</script>
