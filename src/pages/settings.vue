<template>
  <AppShell>
    <template #header>
      <h1 class="text-[24px] font-semibold">平台设置</h1>
      <p class="mt-1 text-[11px] text-sub">选一家 → 填凭据 → 保存 → 测试</p>
    </template>

    <div class="flex gap-10">
      <aside class="w-64 shrink-0">
        <p class="text-[11px] text-sub">平台</p>
        <div class="mt-3 border-t border-line">
          <button
            v-for="providerId in PROVIDER_IDS"
            :key="providerId"
            type="button"
            class="flex w-full items-center gap-3 border-b border-line py-3 text-left transition hover:bg-sec"
            @click="onSelect(providerId)"
          >
            <ProviderIcon :provider-id="providerId" class="!h-6 !w-6 shrink-0" />
            <span
              class="truncate text-[12px]"
              :class="providerId === selectedId ? 'font-semibold text-ink' : 'text-sub'"
            >
              {{ metaOf(providerId).label }}
            </span>
            <span class="ml-auto text-[10px]" :class="statusClass(providerId)">
              {{ statusLabel(providerId) }}
            </span>
          </button>
        </div>
      </aside>

      <section class="min-w-0 flex-1 rounded-lg border border-line bg-surface p-6">
        <h2 class="text-[24px] font-semibold">{{ metaOf(selectedId).label }}</h2>
        <p class="mt-1 text-[11px] text-sub">{{ metaOf(selectedId).credentialHint }}</p>

        <div class="mt-6 grid grid-cols-2 gap-6 border-t border-line pt-6">
          <label v-for="field in metaOf(selectedId).credentialFields" :key="field.key">
            <span class="text-[10px] text-sub">{{ field.label }}</span>
            <div class="mt-2 flex items-center gap-2">
              <textarea
                v-if="field.isMultiline"
                :value="inputValue(field.key)"
                :placeholder="field.placeholder"
                rows="2"
                class="min-w-0 flex-1 resize-y rounded-md border border-line bg-bg px-3 py-2 font-mono text-[12px] outline-none focus:border-ink"
                @input="onInput(field.key, $event)"
              />
              <input
                v-else
                :value="inputValue(field.key)"
                :type="isSecretVisible(field.key) ? 'text' : 'password'"
                :placeholder="field.placeholder"
                class="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2 font-mono text-[12px] outline-none focus:border-ink"
                @input="onInput(field.key, $event)"
              />
              <button
                v-if="field.isSecret"
                type="button"
                class="cursor-pointer text-[10px] text-sub transition hover:text-ink"
                @click="toggleSecret(field.key)"
              >
                {{ isSecretVisible(field.key) ? '隐藏' : '显示' }}
              </button>
            </div>
          </label>
        </div>

        <div class="mt-6 flex items-center gap-3 border-t border-line pt-6">
          <label class="text-[11px] text-sub" for="threshold">告警阈值</label>
          <input
            id="threshold"
            :value="thresholdValue"
            type="number"
            min="0"
            step="1"
            placeholder="不告警"
            class="w-24 rounded-md border border-line bg-bg px-3 py-2 font-mono text-[12px] outline-none focus:border-ink"
            @change="onThresholdChange"
          />
          <span class="text-[10px] text-sub">元 · 低于该值时提醒</span>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="cursor-pointer rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-default disabled:opacity-50"
            :disabled="isSaving || !isReadyToSave"
            @click="onSaveKey"
          >
            {{ isSaving ? '保存中…' : '保存凭据' }}
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-md border border-line px-4 py-2 text-[12px] transition hover:bg-sec disabled:cursor-default disabled:opacity-50"
            :disabled="isTesting || isSaving"
            @click="onTestConnection"
          >
            {{ isTesting ? '测试中…' : '测试连接' }}
          </button>
          <button
            v-if="metaOf(selectedId).loginUrl"
            type="button"
            class="cursor-pointer rounded-md border border-line px-4 py-2 text-[12px] transition hover:bg-sec disabled:cursor-default disabled:opacity-50"
            :disabled="isLoggingIn"
            @click="onStartLogin"
          >
            {{ isLoggingIn ? '等待登录…' : '登录获取' }}
          </button>
          <button
            v-if="cardOf(selectedId)?.hasCredential"
            type="button"
            class="cursor-pointer px-2 py-2 text-[12px] text-error transition hover:opacity-70 disabled:cursor-default disabled:opacity-50"
            :disabled="isSaving"
            @click="onDeleteKey"
          >
            删除凭据
          </button>
          <span v-if="message" class="max-w-[420px] truncate text-[11px]" :class="messageClass">
            {{ message }}
          </span>
        </div>

        <button
          type="button"
          class="mt-8 cursor-pointer text-[11px] text-sub underline transition hover:text-ink"
          @click="onOpenConsole"
        >
          打开{{ metaOf(selectedId).label }}控制台
        </button>
      </section>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppShell from '../components/AppShell.vue'
import ProviderIcon from '../components/ProviderIcon.vue'
import {
  PROVIDER_IDS,
  PROVIDER_META,
  PROVIDER_STATUS,
  type ProviderCredential,
  type ProviderId,
} from '../shared/provider'
import { useProvidersStore } from '../stores/providers'
import { formatCurrencyUnit } from '../utils/format'

const DEFAULT_PROVIDER: ProviderId = 'tokenhub'

const store = useProvidersStore()
const route = useRoute()
const router = useRouter()

const inputs = reactive<Record<string, string>>({})
const visibleSecrets = reactive<Record<string, boolean>>({})

const selectedId = ref<ProviderId>(resolveSelectedId())
const isSaving = ref(false)
const isTesting = ref(false)
const isLoggingIn = ref(false)
const message = ref('')
const messageTone = ref<'ok' | 'error' | 'info'>('info')

const isReadyToSave = computed(() =>
  metaOf(selectedId.value).credentialFields.every(
    (field) => inputValue(field.key).trim().length > 0,
  ),
)

const thresholdValue = computed<number | ''>(() => store.settings.thresholds[selectedId.value] ?? '')

const messageClass = computed(() => {
  if (messageTone.value === 'ok') return 'text-success'
  if (messageTone.value === 'error') return 'text-error'
  return 'text-sub'
})

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && (PROVIDER_IDS as readonly string[]).includes(value)
}

function resolveSelectedId(): ProviderId {
  const providerId = route.query.provider
  return isProviderId(providerId) ? providerId : DEFAULT_PROVIDER
}

function metaOf(providerId: ProviderId) {
  return PROVIDER_META[providerId]
}

function cardOf(providerId: ProviderId) {
  return store.cards.find((card) => card.id === providerId)
}

function statusLabel(providerId: ProviderId): string {
  switch (cardOf(providerId)?.result.status) {
    case PROVIDER_STATUS.OK:
      return '正常'
    case PROVIDER_STATUS.ERROR:
      return '异常'
    case PROVIDER_STATUS.INVALID_CREDENTIAL:
      return '凭证失效'
    case PROVIDER_STATUS.MISSING_CREDENTIAL:
      return '未配置'
    case PROVIDER_STATUS.LOADING:
      return '查询中'
    default:
      return '待查询'
  }
}

function statusClass(providerId: ProviderId): string {
  switch (cardOf(providerId)?.result.status) {
    case PROVIDER_STATUS.OK:
      return 'text-success'
    case PROVIDER_STATUS.ERROR:
    case PROVIDER_STATUS.INVALID_CREDENTIAL:
      return 'text-error'
    case PROVIDER_STATUS.MISSING_CREDENTIAL:
      return 'text-warning'
    default:
      return 'text-mute'
  }
}

function inputKey(fieldKey: string): string {
  return `${selectedId.value}.${fieldKey}`
}

function inputValue(fieldKey: string): string {
  return inputs[inputKey(fieldKey)] ?? ''
}

function isSecretVisible(fieldKey: string): boolean {
  return visibleSecrets[inputKey(fieldKey)] ?? false
}

function onInput(fieldKey: string, event: Event): void {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  inputs[inputKey(fieldKey)] = target.value
}

function toggleSecret(fieldKey: string): void {
  const key = inputKey(fieldKey)
  visibleSecrets[key] = !visibleSecrets[key]
}

function onSelect(providerId: ProviderId): void {
  selectedId.value = providerId
  message.value = ''
  void router.replace({ query: { provider: providerId } })
}

async function onSaveKey(): Promise<void> {
  const credential: ProviderCredential = {}

  for (const field of metaOf(selectedId.value).credentialFields) {
    credential[field.key] = inputValue(field.key).trim()
  }

  isSaving.value = true
  message.value = ''
  try {
    await store.saveCredential(selectedId.value, credential)
    message.value = '凭据已保存'
    messageTone.value = 'ok'
  } catch (error) {
    message.value = error instanceof Error ? error.message : '保存失败'
    messageTone.value = 'error'
  } finally {
    isSaving.value = false
  }
}

async function onTestConnection(): Promise<void> {
  isTesting.value = true
  message.value = ''
  messageTone.value = 'info'

  try {
    const result = await store.refreshOne(selectedId.value)

    if (result.status === PROVIDER_STATUS.OK && result.balance) {
      message.value = `连接正常，可用余额 ${result.balance.available.toFixed(2)} ${formatCurrencyUnit(result.balance.currency)}`
      messageTone.value = 'ok'
      return
    }

    message.value = result.errorMessage || '查询失败'
    messageTone.value = 'error'
  } catch (error) {
    message.value = error instanceof Error ? error.message : '测试失败'
    messageTone.value = 'error'
  } finally {
    isTesting.value = false
  }
}

async function onDeleteKey(): Promise<void> {
  isSaving.value = true
  try {
    await store.removeCredential(selectedId.value)
    message.value = '凭据已删除'
    messageTone.value = 'info'
  } finally {
    isSaving.value = false
  }
}

async function onStartLogin(): Promise<void> {
  isLoggingIn.value = true
  try {
    const result = await store.startLogin(selectedId.value)
    message.value = result.message
    messageTone.value = result.ok ? 'ok' : 'error'
  } finally {
    isLoggingIn.value = false
  }
}

function onThresholdChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const value = Number.parseFloat(input.value)

  if (!Number.isFinite(value) || value <= 0) {
    void store.saveSettings({ thresholds: { [selectedId.value]: undefined } })
    input.value = ''
    return
  }

  void store.saveSettings({ thresholds: { [selectedId.value]: value } })
}

function onOpenConsole(): void {
  store.openConsole(selectedId.value)
}

watch(
  () => route.query.provider,
  () => {
    selectedId.value = resolveSelectedId()
    message.value = ''
  },
)

onMounted(async () => {
  await store.init()
})
</script>
