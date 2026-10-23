<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-5 p-5">
    <header class="flex flex-wrap items-center gap-3">
      <img class="h-9 w-9 shrink-0 rounded-lg" src="/logo.svg" alt="LLM Monitor" />
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-50">LLM Monitor</h1>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          已配置 {{ store.configuredCount }} / {{ store.cards.length }} 个平台 ·
          {{ lastUpdatedText }}
        </p>
      </div>

      <div class="ml-auto flex items-center gap-3">
        <label class="flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input v-model="isAutoRefreshEnabled" type="checkbox" />
          自动刷新（{{ intervalText }}）
        </label>
        <button
          class="cursor-pointer rounded-md bg-teal-600 px-3 py-1.5 text-xs text-white transition hover:bg-teal-700 disabled:cursor-default disabled:opacity-50"
          :disabled="store.isRefreshing"
          @click="onRefreshAll"
        >
          {{ store.isRefreshing ? '刷新中…' : '全部刷新' }}
        </button>
        <RouterLink
          class="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition hover:border-teal-500 hover:text-teal-600 dark:border-gray-700 dark:text-gray-300"
          to="/settings"
        >
          设置
        </RouterLink>
      </div>
    </header>

    <div
      v-if="store.configuredCount === 0"
      class="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
    >
      还没有配置任何平台，先到
      <RouterLink class="text-teal-600 underline" to="/settings">设置页</RouterLink>
      填写 API Key。
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ProviderCard
        v-for="card in store.cards"
        :key="card.id"
        :card="card"
        @refresh="onRefreshOne"
        @open-console="onOpenConsole"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'

import ProviderCard from '../components/ProviderCard.vue'
import type { ProviderId } from '../shared/provider'
import { useProvidersStore } from '../stores/providers'
import { formatTime } from '../utils/format'

const store = useProvidersStore()

let unsubscribe: (() => void) | null = null

const isAutoRefreshEnabled = computed({
  get: () => store.settings.autoRefreshEnabled,
  set: (value: boolean) => {
    void store.saveSettings({ autoRefreshEnabled: value })
  },
})

const intervalText = computed(() => `${store.settings.refreshIntervalSeconds} 秒`)

const lastUpdatedText = computed(() => formatTime(store.lastUpdatedAt))

async function onRefreshAll(): Promise<void> {
  await store.refresh()
}

function onRefreshOne(): void {
  void store.refresh()
}

function onOpenConsole(providerId: ProviderId): void {
  store.openConsole(providerId)
}

onMounted(async () => {
  await store.init()
  unsubscribe = store.subscribeBalances(() => {})
  await store.refresh()
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>
