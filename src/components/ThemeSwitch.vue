<template>
  <div class="flex items-center rounded-md border border-line bg-surface p-1">
    <button
      v-for="option in THEME_OPTIONS"
      :key="option.mode"
      type="button"
      class="cursor-pointer rounded px-3 py-1 text-[11px] transition"
      :class="
        option.mode === theme.mode
          ? 'bg-primary text-on-primary'
          : 'text-sub hover:bg-sec hover:text-ink'
      "
      @click="onSelect(option.mode)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore, THEME_MODE, type ThemeMode } from '../stores/theme'

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: THEME_MODE.LIGHT, label: '浅色主题' },
  { mode: THEME_MODE.DARK, label: '深色主题' },
]

const theme = useThemeStore()

function onSelect(mode: ThemeMode): void {
  theme.setMode(mode)
}
</script>
