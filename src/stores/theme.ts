import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
} as const

export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE]

const STORAGE_KEY = 'color-schema'

function currentMode(): ThemeMode {
  return document.documentElement.getAttribute('data-theme') === THEME_MODE.DARK
    ? THEME_MODE.DARK
    : THEME_MODE.LIGHT
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(currentMode())
  const isDark = computed(() => mode.value === THEME_MODE.DARK)

  function setMode(next: ThemeMode): void {
    mode.value = next
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  function toggle(): void {
    setMode(isDark.value ? THEME_MODE.LIGHT : THEME_MODE.DARK)
  }

  return { mode, isDark, setMode, toggle }
})
