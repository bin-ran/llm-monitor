<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
    <header class="flex items-center gap-3">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-50">设置</h1>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          API Key 仅保存在本机配置文件，不会同步到任何服务器
        </p>
      </div>
      <RouterLink
        class="ml-auto rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition hover:border-teal-500 hover:text-teal-600 dark:border-gray-700 dark:text-gray-300"
        to="/"
      >
        返回总览
      </RouterLink>
    </header>

    <section class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">平台 API Key</h2>

      <div class="flex flex-col gap-4">
        <div
          v-for="card in store.cards"
          :key="card.id"
          class="flex flex-col gap-2 border-b border-gray-100 pb-4 last:border-none last:pb-0 dark:border-gray-800"
        >
          <div class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: card.accent }" />
            <span class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ card.label }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ card.hasCredential ? `已配置 ${card.credentialPreview}` : '未配置' }}
            </span>
            <button
              class="ml-auto cursor-pointer text-xs text-teal-600 transition hover:text-teal-700"
              @click="onOpenConsole(card.id)"
            >
              打开控制台
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input
              v-model="keyInputs[card.id]"
              :type="isVisible[card.id] ? 'text' : 'password'"
              :placeholder="card.hasCredential ? '输入新的 Key 以覆盖' : 'sk-...'"
              class="min-w-60 flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800"
            />
            <button
              class="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition hover:border-teal-500 dark:border-gray-700 dark:text-gray-300"
              @click="isVisible[card.id] = !isVisible[card.id]"
            >
              {{ isVisible[card.id] ? '隐藏' : '显示' }}
            </button>
            <button
              class="cursor-pointer rounded-md bg-teal-600 px-3 py-1.5 text-xs text-white transition hover:bg-teal-700 disabled:cursor-default disabled:opacity-50"
              :disabled="savingId === card.id || keyInputs[card.id].trim().length === 0"
              @click="onSaveKey(card.id)"
            >
              {{ savingId === card.id ? '保存中…' : '保存' }}
            </button>
            <button
              v-if="card.hasCredential"
              class="cursor-pointer rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-500 transition hover:border-red-500 disabled:cursor-default disabled:opacity-50"
              :disabled="savingId === card.id"
              @click="onDeleteKey(card.id)"
            >
              删除
            </button>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-500 dark:text-gray-400" :for="`threshold-${card.id}`">
              余额告警阈值
            </label>
            <input
              :id="`threshold-${card.id}`"
              :value="thresholdValue(card.id)"
              type="number"
              min="0"
              step="1"
              placeholder="不告警"
              class="w-28 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs outline-none transition focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800"
              @change="onThresholdChange(card.id, $event)"
            />
            <span class="text-xs text-gray-500 dark:text-gray-400">
              低于该金额时弹出系统通知
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">刷新与存储</h2>

      <div class="flex flex-wrap items-center gap-4">
        <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input v-model="isAutoRefreshEnabled" type="checkbox" />
          自动刷新
        </label>
        <select
          :value="store.settings.refreshIntervalSeconds"
          class="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800"
          @change="onIntervalChange"
        >
          <option v-for="option in intervalOptions" :key="option" :value="option">
            每 {{ option }} 秒
          </option>
        </select>
      </div>

      <dl class="mt-4 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
        <div class="flex gap-2">
          <dt>配置文件</dt>
          <dd class="break-all text-gray-700 dark:text-gray-300">{{ store.configPath }}</dd>
        </div>
        <div class="flex gap-2">
          <dt>密钥加密</dt>
          <dd class="text-gray-700 dark:text-gray-300">
            {{ store.isEncryptionAvailable ? '系统密钥环已启用' : '系统密钥环不可用，Key 以明文保存' }}
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { PROVIDER_IDS, REFRESH_INTERVAL_OPTIONS, type ProviderId } from '../shared/provider'
import { useProvidersStore } from '../stores/providers'

const store = useProvidersStore()

function createKeyInputs(): Record<ProviderId, string> {
  const inputs = {} as Record<ProviderId, string>
  for (const providerId of PROVIDER_IDS) {
    inputs[providerId] = ''
  }
  return inputs
}

function createVisibilityMap(): Record<ProviderId, boolean> {
  const visibility = {} as Record<ProviderId, boolean>
  for (const providerId of PROVIDER_IDS) {
    visibility[providerId] = false
  }
  return visibility
}

const keyInputs = reactive(createKeyInputs())

const isVisible = reactive(createVisibilityMap())

const savingId = ref<ProviderId | null>(null)

const intervalOptions = REFRESH_INTERVAL_OPTIONS

const isAutoRefreshEnabled = computed({
  get: () => store.settings.autoRefreshEnabled,
  set: (value: boolean) => {
    void store.saveSettings({ autoRefreshEnabled: value })
  },
})

function thresholdValue(providerId: ProviderId): number | '' {
  const threshold = store.settings.thresholds[providerId]
  return threshold ?? ''
}

async function onSaveKey(providerId: ProviderId): Promise<void> {
  const credential = keyInputs[providerId].trim()
  if (credential.length === 0) return

  savingId.value = providerId
  try {
    await store.saveCredential(providerId, credential)
    keyInputs[providerId] = ''
    isVisible[providerId] = false
  } finally {
    savingId.value = null
  }
}

async function onDeleteKey(providerId: ProviderId): Promise<void> {
  savingId.value = providerId
  try {
    await store.removeCredential(providerId)
    keyInputs[providerId] = ''
  } finally {
    savingId.value = null
  }
}

function onThresholdChange(providerId: ProviderId, event: Event): void {
  const input = event.target as HTMLInputElement
  const value = Number.parseFloat(input.value)

  if (!Number.isFinite(value) || value <= 0) {
    void store.saveSettings({ thresholds: { [providerId]: undefined } })
    input.value = ''
    return
  }

  void store.saveSettings({ thresholds: { [providerId]: value } })
}

function onIntervalChange(event: Event): void {
  const select = event.target as HTMLSelectElement
  const value = Number.parseInt(select.value, 10)
  if (!Number.isFinite(value)) return
  void store.saveSettings({ refreshIntervalSeconds: value })
}

function onOpenConsole(providerId: ProviderId): void {
  store.openConsole(providerId)
}

onMounted(async () => {
  await store.init()
})
</script>
