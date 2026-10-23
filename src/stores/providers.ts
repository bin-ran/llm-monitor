import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  DEFAULT_SETTINGS,
  PROVIDER_IDS,
  PROVIDER_META,
  PROVIDER_STATUS,
  type AppConfigView,
  type AppSettings,
  type LoginResult,
  type ProviderCredential,
  type ProviderCredentialState,
  type ProviderId,
  type ProviderResult,
} from '../shared/provider'

export interface ProviderCardModel {
  id: ProviderId
  label: string
  accent: string
  homepage: string
  result: ProviderResult
  hasCredential: boolean
  credentialPreview: string
  threshold: number | null
}

function createInitialResults(): Record<ProviderId, ProviderResult> {
  const results = {} as Record<ProviderId, ProviderResult>
  for (const providerId of PROVIDER_IDS) {
    results[providerId] = {
      providerId,
      status: PROVIDER_STATUS.IDLE,
      balance: null,
      errorMessage: '',
      updatedAt: 0,
    }
  }
  return results
}

function createInitialCredentialStates(): Record<ProviderId, ProviderCredentialState> {
  const states = {} as Record<ProviderId, ProviderCredentialState>
  for (const providerId of PROVIDER_IDS) {
    states[providerId] = {
      providerId,
      hasCredential: false,
      credentialPreview: '',
    }
  }
  return states
}

export const useProvidersStore = defineStore('providers', () => {
  const results = ref<Record<ProviderId, ProviderResult>>(createInitialResults())
  const credentialStates = ref<Record<ProviderId, ProviderCredentialState>>(
    createInitialCredentialStates(),
  )
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS, thresholds: {} })
  const configPath = ref('')
  const isEncryptionAvailable = ref(true)
  const isRefreshing = ref(false)
  const lastUpdatedAt = ref(0)

  const cards = computed<ProviderCardModel[]>(() =>
    PROVIDER_IDS.map((providerId) => {
      const meta = PROVIDER_META[providerId]
      const credentialState = credentialStates.value[providerId]
      const threshold = settings.value.thresholds[providerId]

      return {
        id: providerId,
        label: meta.label,
        accent: meta.accent,
        homepage: meta.homepage,
        result: results.value[providerId],
        hasCredential: credentialState.hasCredential,
        credentialPreview: credentialState.credentialPreview,
        threshold: threshold ?? null,
      }
    }),
  )

  const configuredCount = computed(
    () => PROVIDER_IDS.filter((id) => credentialStates.value[id].hasCredential).length,
  )

  function applyConfig(config: AppConfigView): void {
    for (const provider of config.providers) {
      credentialStates.value[provider.providerId] = provider
    }
    settings.value = config.settings
    configPath.value = config.configPath
    isEncryptionAvailable.value = config.isEncryptionAvailable
  }

  function applyResults(list: ProviderResult[]): void {
    for (const result of list) {
      results.value[result.providerId] = result
    }
    lastUpdatedAt.value = Date.now()
  }

  async function init(): Promise<void> {
    applyConfig(await window.llmMonitor.getConfig())
  }

  async function refresh(): Promise<void> {
    if (isRefreshing.value) return
    isRefreshing.value = true
    try {
      applyResults(await window.llmMonitor.refreshBalances())
    } finally {
      isRefreshing.value = false
    }
  }

  async function saveCredential(
    providerId: ProviderId,
    values: ProviderCredential,
  ): Promise<void> {
    applyConfig(await window.llmMonitor.saveCredential(providerId, values))
    await refresh()
  }

  async function removeCredential(providerId: ProviderId): Promise<void> {
    applyConfig(await window.llmMonitor.removeCredential(providerId))
  }

  async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
    applyConfig(await window.llmMonitor.updateSettings(patch))
  }

  async function startLogin(providerId: ProviderId): Promise<LoginResult> {
    const result = await window.llmMonitor.startLogin(providerId)
    await init()
    if (result.ok) await refresh()
    return result
  }

  function openConsole(providerId: ProviderId): void {
    void window.llmMonitor.openConsole(providerId)
  }

  function subscribeBalances(callback: (list: ProviderResult[]) => void): () => void {
    return window.llmMonitor.onBalancesUpdated((list) => {
      applyResults(list)
      callback(list)
    })
  }

  return {
    results,
    settings,
    configPath,
    isEncryptionAvailable,
    isRefreshing,
    lastUpdatedAt,
    cards,
    configuredCount,
    init,
    refresh,
    saveCredential,
    removeCredential,
    saveSettings,
    startLogin,
    openConsole,
    subscribeBalances,
  }
})
