<template>
  <AppShell>
    <template #header>
      <h1 class="text-[24px] font-semibold">偏好设置</h1>
      <p class="mt-1 text-[11px] text-sub">刷新节奏、配置备份与本机存储</p>
    </template>

    <div class="max-w-3xl">
      <section>
        <div class="flex items-center gap-3">
          <span class="h-5 w-[3px] bg-primary" />
          <h2 class="text-[14px] font-semibold">刷新</h2>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-8 pl-6">
          <label class="flex cursor-pointer items-center gap-2 text-[12px]">
            <input v-model="isAutoRefreshEnabled" type="checkbox" />
            自动刷新
          </label>
          <label class="flex items-center gap-2 text-[12px] text-sub">
            刷新间隔
            <select
              :value="store.settings.refreshIntervalSeconds"
              class="rounded-md border border-line bg-bg px-3 py-2 text-[12px] text-ink outline-none focus:border-ink"
              @change="onIntervalChange"
            >
              <option v-for="option in intervalOptions" :key="option" :value="option">
                {{ option }} 秒
              </option>
            </select>
          </label>
        </div>
      </section>

      <section class="mt-12">
        <div class="flex items-center gap-3">
          <span class="h-5 w-[3px] bg-primary" />
          <h2 class="text-[14px] font-semibold">配置备份</h2>
        </div>
        <p class="mt-4 pl-6 text-[11px] leading-5 text-sub">
          备份文件用下面的密码加密，可换机恢复；导入会替换现有凭据与设置。忘记密码无法恢复。
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-3 pl-6">
          <input
            v-model="backupPassword"
            type="password"
            placeholder="备份密码（至少 8 位）"
            class="w-64 rounded-md border border-line bg-bg px-3 py-2 font-mono text-[12px] outline-none focus:border-ink"
          />
          <button
            type="button"
            class="cursor-pointer rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-default disabled:opacity-50"
            :disabled="backupPassword.trim().length < 8"
            @click="onExportBackup"
          >
            导出备份
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-md border border-line px-4 py-2 text-[12px] transition hover:bg-sec disabled:cursor-default disabled:opacity-50"
            :disabled="backupPassword.trim().length < 8"
            @click="onImportBackup"
          >
            导入备份
          </button>
          <span v-if="backupMessage" class="max-w-[420px] truncate text-[11px] text-sub">
            {{ backupMessage }}
          </span>
        </div>
      </section>

      <section class="mt-12">
        <div class="flex items-center gap-3">
          <span class="h-5 w-[3px] bg-primary" />
          <h2 class="text-[14px] font-semibold">本机存储</h2>
        </div>
        <div class="mt-4 space-y-3 pl-6 text-[11px]">
          <p class="flex items-center gap-4">
            <span class="w-16 text-sub">配置文件</span>
            <span class="break-all font-mono text-ink">{{ store.configPath }}</span>
          </p>
          <p class="flex items-center gap-4">
            <span class="w-16 text-sub">密钥加密</span>
            <span :class="store.isEncryptionAvailable ? 'text-success' : 'text-error'">
              {{
                store.isEncryptionAvailable
                  ? '系统密钥环已启用'
                  : '系统密钥环不可用，凭据以明文保存'
              }}
            </span>
          </p>
        </div>
      </section>

      <section class="mt-12">
        <div class="flex items-center gap-3">
          <span class="h-5 w-[3px] bg-primary" />
          <h2 class="text-[14px] font-semibold">关于</h2>
        </div>
        <p class="mt-4 pl-6 text-[11px] text-sub">LLM Monitor v0.0.2 · 凭据仅保存在本机</p>
      </section>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AppShell from '../components/AppShell.vue'
import { REFRESH_INTERVAL_OPTIONS } from '../shared/provider'
import { useProvidersStore } from '../stores/providers'

const store = useProvidersStore()

const backupPassword = ref('')
const backupMessage = ref('')

const intervalOptions = REFRESH_INTERVAL_OPTIONS

const isAutoRefreshEnabled = computed({
  get: () => store.settings.autoRefreshEnabled,
  set: (value: boolean) => {
    void store.saveSettings({ autoRefreshEnabled: value })
  },
})

function onIntervalChange(event: Event): void {
  const select = event.target as HTMLSelectElement
  const value = Number.parseInt(select.value, 10)
  if (!Number.isFinite(value)) return
  void store.saveSettings({ refreshIntervalSeconds: value })
}

async function onExportBackup(): Promise<void> {
  backupMessage.value = ''
  try {
    backupMessage.value = (await store.exportBackup(backupPassword.value)).message
  } catch (error) {
    backupMessage.value = error instanceof Error ? error.message : '导出失败'
  }
}

async function onImportBackup(): Promise<void> {
  backupMessage.value = ''
  try {
    backupMessage.value = (await store.importBackup(backupPassword.value)).message
  } catch (error) {
    backupMessage.value = error instanceof Error ? error.message : '导入失败'
  }
}

onMounted(async () => {
  await store.init()
})
</script>
