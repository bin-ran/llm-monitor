<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-3 p-3">
    <header class="flex flex-wrap items-center gap-2">
      <img class="h-8 w-8 shrink-0 rounded-lg" src="/logo.svg" alt="LLM Monitor" />
      <div class="min-w-0">
        <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-50">LLM Monitor</h1>
        <p class="text-[0.7rem] text-gray-500 dark:text-gray-400">
          已配置 {{ store.configuredCount }} / {{ store.cards.length }} 个平台 ·
          {{ lastUpdatedText }}
        </p>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <RouterLink
          v-if="invalidCredentialLabels.length > 0"
          class="rounded-md bg-orange-100 px-2 py-1 text-[0.7rem] text-orange-700 transition hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/60"
          :title="`失效平台：${invalidCredentialLabels.join('、')}`"
          to="/settings"
        >
          ⚠ {{ invalidCredentialLabels.length }} 个凭证失效
        </RouterLink>
        <label
          class="flex cursor-pointer items-center gap-1.5 text-[0.7rem] text-gray-600 dark:text-gray-300"
        >
          <input v-model="isAutoRefreshEnabled" type="checkbox" />
          自动刷新（{{ intervalText }}）
        </label>
        <button
          class="cursor-pointer rounded-md bg-teal-600 px-2.5 py-1 text-[0.7rem] text-white transition hover:bg-teal-700 disabled:cursor-default disabled:opacity-50"
          :disabled="store.isRefreshing"
          @click="onRefreshAll"
        >
          {{ store.isRefreshing ? '刷新中…' : '全部刷新' }}
        </button>
        <RouterLink
          class="rounded-md border border-gray-300 px-2.5 py-1 text-[0.7rem] text-gray-600 transition hover:border-teal-500 hover:text-teal-600 dark:border-gray-700 dark:text-gray-300"
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
      <span>
        还没有配置任何平台，先到
        <RouterLink class="text-teal-600 underline" to="/settings">设置页</RouterLink>
        填写凭据。
      </span>
    </div>

    <div v-else class="grid grid-cols-3 gap-3">
      <ProviderCard
        v-for="card in store.configuredCards"
        :key="card.id"
        :card="card"
        @open-console="onOpenConsole"
        @refresh="onRefreshOne"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'

import ProviderCard from '../components/ProviderCard.vue'
import { PROVIDER_STATUS, type ProviderId } from '../shared/provider'
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

const invalidCredentialLabels = computed(() =>
  store.configuredCards
    .filter((card) => card.result.status === PROVIDER_STATUS.INVALID_CREDENTIAL)
    .map((card) => card.label),
)

async function onRefreshAll(): Promise<void> {
  await store.refresh()
}

function onOpenConsole(providerId: ProviderId): void {
  store.openConsole(providerId)
}

function onRefreshOne(providerId: ProviderId): void {
  void store.refreshOne(providerId)
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
