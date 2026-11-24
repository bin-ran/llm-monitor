<template>
  <AppShell>
    <template #header>
      <h1 class="text-[24px] font-semibold">余额总览</h1>
      <p class="mt-1 text-[11px] text-sub">
        {{ rows.length }} 家供应商 · 每 {{ store.settings.refreshIntervalSeconds }} 秒自动刷新
      </p>
    </template>

    <section>
      <div class="flex flex-wrap items-end justify-between gap-8">
        <div>
          <p class="font-mono text-[48px] leading-none tracking-tight text-ink">￥{{ totalText }}</p>
          <p class="mt-3 text-[11px] text-sub">总可用余额</p>
        </div>

        <div class="flex items-center gap-8">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-error" />
            <span class="text-[11px] text-sub">需处理</span>
            <span class="font-mono text-[16px] text-ink">{{ attentionCount }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-success" />
            <span class="text-[11px] text-sub">正常</span>
            <span class="font-mono text-[16px] text-ink">{{ normalCount }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-mute" />
            <span class="text-[11px] text-sub">未配置</span>
            <span class="font-mono text-[16px] text-ink">{{ pendingCount }}</span>
          </div>
          <button
            type="button"
            class="cursor-pointer rounded-md border border-line px-3 py-1.5 text-[11px] text-ink transition hover:bg-sec disabled:cursor-default disabled:opacity-50"
            :disabled="store.isRefreshing"
            @click="onRefreshAll"
          >
            {{ store.isRefreshing ? '刷新中…' : '刷新余额' }}
          </button>
        </div>
      </div>

      <div class="mt-8 border-t border-line" />

      <div
        class="grid grid-cols-[2fr_1fr_0.8fr_0.8fr_0.7fr_0.6fr] gap-3 bg-sec px-4 py-2 text-[10px] text-sub"
      >
        <span>供应商</span>
        <span>可用余额</span>
        <span>告警阈值</span>
        <span>状态</span>
        <span>更新</span>
        <span>操作</span>
      </div>

      <div>
        <div
          v-for="row in rows"
          :key="row.id"
          class="grid grid-cols-[2fr_1fr_0.8fr_0.8fr_0.7fr_0.6fr] items-center gap-3 border-b border-line px-4 py-4 transition hover:bg-sec"
        >
          <span class="flex min-w-0 items-center gap-3">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="dotClass(row.tone)" />
            <ProviderIcon :provider-id="row.id" class="!h-6 !w-6 shrink-0" />
            <span class="truncate text-[13px] font-semibold">{{ row.label }}</span>
          </span>
          <span class="font-mono text-[16px]" :class="amountClass(row.tone)">
            {{ row.amountText }}
          </span>
          <span class="font-mono text-[11px] text-sub">{{ row.thresholdText }}</span>
          <span class="text-[11px]" :class="statusClass(row.tone)">{{ row.statusText }}</span>
          <span class="font-mono text-[11px] text-sub">{{ row.timeText }}</span>
          <button
            type="button"
            class="cursor-pointer text-left text-[11px] font-semibold text-ink transition hover:opacity-60"
            @click="onOpenProvider(row.id)"
          >
            配置
          </button>
        </div>
      </div>

      <footer class="mt-6 flex flex-wrap items-center gap-4 text-[11px] text-sub">
        <label class="flex cursor-pointer items-center gap-2">
          <input v-model="isAutoRefreshEnabled" type="checkbox" />
          自动刷新
        </label>
        <span>{{ rows.length }} 家供应商</span>
        <span class="ml-auto">上次成功 {{ lastUpdatedText }}</span>
      </footer>
    </section>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import AppShell from '../components/AppShell.vue'
import ProviderIcon from '../components/ProviderIcon.vue'
import { buildProviderGroups, type ProviderBoardTone } from '../shared/provider-board'
import type { ProviderId } from '../shared/provider'
import { useProvidersStore } from '../stores/providers'
import { formatTime } from '../utils/format'

const DOT_CLASS: Record<ProviderBoardTone, string> = {
  danger: 'bg-error',
  warning: 'bg-warning',
  muted: 'bg-mute',
  normal: 'bg-success',
}

const AMOUNT_CLASS: Record<ProviderBoardTone, string> = {
  danger: 'text-sub',
  warning: 'text-warning',
  muted: 'text-mute',
  normal: 'text-ink',
}

const STATUS_CLASS: Record<ProviderBoardTone, string> = {
  danger: 'text-error',
  warning: 'text-warning',
  muted: 'text-mute',
  normal: 'text-success',
}

const store = useProvidersStore()
const router = useRouter()

let unsubscribe: (() => void) | null = null

const rows = computed(() =>
  buildProviderGroups(store.cards, store.settings.thresholds).flatMap((group) => group.items),
)

const totalText = computed(() =>
  store.cards.reduce((sum, card) => sum + (card.result.balance?.available ?? 0), 0).toFixed(2),
)

const attentionCount = computed(
  () => rows.value.filter((row) => row.tone === 'danger' || row.tone === 'warning').length,
)

const normalCount = computed(() => rows.value.filter((row) => row.tone === 'normal').length)

const pendingCount = computed(() => rows.value.filter((row) => row.tone === 'muted').length)

const isAutoRefreshEnabled = computed({
  get: () => store.settings.autoRefreshEnabled,
  set: (value: boolean) => {
    void store.saveSettings({ autoRefreshEnabled: value })
  },
})

const lastUpdatedText = computed(() => formatTime(store.lastUpdatedAt))

function dotClass(tone: ProviderBoardTone): string {
  return DOT_CLASS[tone] ?? DOT_CLASS.muted
}

function amountClass(tone: ProviderBoardTone): string {
  return AMOUNT_CLASS[tone] ?? AMOUNT_CLASS.muted
}

function statusClass(tone: ProviderBoardTone): string {
  return STATUS_CLASS[tone] ?? STATUS_CLASS.muted
}

async function onRefreshAll(): Promise<void> {
  await store.refresh()
}

function onOpenProvider(providerId: ProviderId): void {
  void router.push({ path: '/settings', query: { provider: providerId } })
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
