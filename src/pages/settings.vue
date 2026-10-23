<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <header class="flex items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-50">设置</h1>
        <p class="text-[0.7rem] text-gray-500 dark:text-gray-400">
          凭据仅保存在本机配置文件，不会同步到任何服务器
        </p>
      </div>
      <RouterLink
        class="ml-auto rounded-md border border-gray-300 px-2.5 py-1 text-[0.7rem] text-gray-600 transition hover:border-teal-500 hover:text-teal-600 dark:border-gray-700 dark:text-gray-300"
        to="/"
      >
        返回总览
      </RouterLink>
    </header>

    <section class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <h2 class="mb-2 text-xs font-semibold text-gray-800 dark:text-gray-100">平台凭据</h2>

      <div class="flex flex-col gap-3">
        <div
          v-for="card in store.cards"
          :key="card.id"
          class="flex flex-col gap-1.5 border-b border-gray-100 pb-3 last:border-none last:pb-0 dark:border-gray-800"
        >
          <div class="flex items-center gap-2">
            <ProviderIcon :provider-id="card.id" />
            <span class="text-xs font-medium text-gray-800 dark:text-gray-100">{{ card.label }}</span>
            <span class="text-[0.7rem] text-gray-500 dark:text-gray-400">
              {{ card.hasCredential ? `已配置 ${card.credentialPreview}` : '未配置' }}
            </span>
            <button
              class="ml-auto cursor-pointer text-[0.7rem] text-teal-600 transition hover:text-teal-700"
              @click="onOpenConsole(card.id)"
            >
              打开控制台
            </button>
          </div>

          <p class="text-[0.65rem] text-gray-400 dark:text-gray-500">{{ metaOf(card.id).credentialHint }}</p>

          <div
            v-for="field in metaOf(card.id).credentialFields"
            :key="field.key"
            class="flex flex-col gap-1"
          >
            <label class="text-xs text-gray-500 dark:text-gray-400" :for="`${card.id}-${field.key}`">
              {{ field.label }}
            </label>
            <div class="flex items-start gap-2">
              <textarea
                v-if="field.isMultiline"
                :id="`${card.id}-${field.key}`"
                :value="inputValue(card.id, field.key)"
                :placeholder="field.placeholder"
                rows="3"
                class="min-w-60 flex-1 resize-y rounded-md border border-gray-300 bg-white px-3 py-1.5 font-mono text-xs outline-none transition focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800"
                @input="onInput(card.id, field.key, $event)"
              />
              <input
                v-else
                :id="`${card.id}-${field.key}`"
                :value="inputValue(card.id, field.key)"
                :type="isSecretVisible(card.id, field.key) ? 'text' : 'password'"
                :placeholder="field.placeholder"
                class="min-w-60 flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800"
                @input="onInput(card.id, field.key, $event)"
              />
              <button
                v-if="field.isSecret"
                class="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition hover:border-teal-500 dark:border-gray-700 dark:text-gray-300"
                @click="toggleSecret(card.id, field.key)"
              >
                {{ isSecretVisible(card.id, field.key) ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              v-if="metaOf(card.id).loginUrl"
              class="cursor-pointer rounded-md border border-teal-500 px-3 py-1.5 text-xs text-teal-600 transition hover:bg-teal-50 disabled:cursor-default disabled:opacity-50 dark:hover:bg-teal-900/30"
              :disabled="loginId === card.id"
              @click="onStartLogin(card.id)"
            >
              {{ loginId === card.id ? '等待登录…' : '登录获取' }}
            </button>
            <button
              class="cursor-pointer rounded-md bg-teal-600 px-3 py-1.5 text-xs text-white transition hover:bg-teal-700 disabled:cursor-default disabled:opacity-50"
              :disabled="savingId === card.id || !isReadyToSave(card.id)"
              @click="onSaveKey(card.id)"
            >
              {{ savingId === card.id ? '保存中…' : '保存' }}
            </button>
            <button
              class="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition hover:border-teal-500 hover:text-teal-600 disabled:cursor-default disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              :disabled="testingId === card.id || savingId === card.id"
              @click="onTestConnection(card.id)"
            >
              {{ testingId === card.id ? '测试中…' : '测试连接' }}
            </button>
            <button
              v-if="card.hasCredential"
              class="cursor-pointer rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-500 transition hover:border-red-500 disabled:cursor-default disabled:opacity-50"
              :disabled="savingId === card.id"
              @click="onDeleteKey(card.id)"
            >
              删除
            </button>
            <span
              v-if="messages[card.id]"
              class="text-xs"
              :class="
                messageTone[card.id] === 'error'
                  ? 'text-red-500'
                  : messageTone[card.id] === 'ok'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-gray-400'
              "
            >
              {{ messages[card.id] }}
            </span>
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
            <span class="text-xs text-gray-500 dark:text-gray-400">低于该金额时弹出系统通知</span>
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
            {{ store.isEncryptionAvailable ? '系统密钥环已启用' : '系统密钥环不可用，凭据以明文保存' }}
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import ProviderIcon from '../components/ProviderIcon.vue'
import {
  PROVIDER_IDS,
  PROVIDER_META,
  PROVIDER_STATUS,
  REFRESH_INTERVAL_OPTIONS,
  type ProviderCredential,
  type ProviderId,
} from '../shared/provider'
import { useProvidersStore } from '../stores/providers'
import { formatCurrencyUnit } from '../utils/format'

const store = useProvidersStore()

const inputs = reactive<Record<string, string>>({})
const visibleSecrets = reactive<Record<string, boolean>>({})
const messages = reactive<Record<string, string>>({})

const savingId = ref<ProviderId | null>(null)
const testingId = ref<ProviderId | null>(null)
const messageTone = reactive<Record<string, 'ok' | 'error' | 'info'>>({})
const loginId = ref<ProviderId | null>(null)

const intervalOptions = REFRESH_INTERVAL_OPTIONS

const isAutoRefreshEnabled = computed({
  get: () => store.settings.autoRefreshEnabled,
  set: (value: boolean) => {
    void store.saveSettings({ autoRefreshEnabled: value })
  },
})

function metaOf(providerId: ProviderId) {
  return PROVIDER_META[providerId]
}

function inputKey(providerId: ProviderId, fieldKey: string): string {
  return `${providerId}.${fieldKey}`
}

function inputValue(providerId: ProviderId, fieldKey: string): string {
  return inputs[inputKey(providerId, fieldKey)] ?? ''
}

function isSecretVisible(providerId: ProviderId, fieldKey: string): boolean {
  return visibleSecrets[inputKey(providerId, fieldKey)] ?? false
}

function onInput(providerId: ProviderId, fieldKey: string, event: Event): void {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  inputs[inputKey(providerId, fieldKey)] = target.value
}

function toggleSecret(providerId: ProviderId, fieldKey: string): void {
  const key = inputKey(providerId, fieldKey)
  visibleSecrets[key] = !visibleSecrets[key]
}

function isReadyToSave(providerId: ProviderId): boolean {
  const fields = metaOf(providerId).credentialFields
  return fields.every((field) => inputValue(providerId, field.key).trim().length > 0)
}

function thresholdValue(providerId: ProviderId): number | '' {
  const threshold = store.settings.thresholds[providerId]
  return threshold ?? ''
}

async function onSaveKey(providerId: ProviderId): Promise<void> {
  const credential: ProviderCredential = {}

  for (const field of metaOf(providerId).credentialFields) {
    credential[field.key] = inputValue(providerId, field.key).trim()
  }

  savingId.value = providerId
  try {
    await store.saveCredential(providerId, credential)
    messages[providerId] = '已保存'
  } catch (error) {
    messages[providerId] = error instanceof Error ? error.message : '保存失败'
  } finally {
    savingId.value = null
  }
}

/** 用当前已保存的凭据真实查询一次，直接给出可用余额或错误原因 */
async function onTestConnection(providerId: ProviderId): Promise<void> {
  testingId.value = providerId
  messages[providerId] = ''
  messageTone[providerId] = 'info'

  try {
    const result = await store.refreshOne(providerId)

    if (result.status === PROVIDER_STATUS.OK && result.balance) {
      messages[providerId] = `连接正常，可用余额 ${result.balance.available.toFixed(2)} ${formatCurrencyUnit(result.balance.currency)}`
      messageTone[providerId] = 'ok'
      return
    }

    messages[providerId] = result.errorMessage || '查询失败'
    messageTone[providerId] = 'error'
  } catch (error) {
    messages[providerId] = error instanceof Error ? error.message : '测试失败'
    messageTone[providerId] = 'error'
  } finally {
    testingId.value = null
  }
}

async function onDeleteKey(providerId: ProviderId): Promise<void> {
  savingId.value = providerId
  try {
    await store.removeCredential(providerId)
    messages[providerId] = '已删除'
  } finally {
    savingId.value = null
  }
}

async function onStartLogin(providerId: ProviderId): Promise<void> {
  loginId.value = providerId
  try {
    const result = await store.startLogin(providerId)
    messages[providerId] = result.message
  } catch (error) {
    messages[providerId] = error instanceof Error ? error.message : '登录失败'
  } finally {
    loginId.value = null
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
  for (const providerId of PROVIDER_IDS) {
    messages[providerId] = ''
  }
})
</script>
