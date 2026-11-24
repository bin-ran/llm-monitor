<template>
  <div class="flex h-screen overflow-hidden bg-bg text-ink">
    <aside class="flex h-full w-16 shrink-0 flex-col border-r border-line bg-surface">
      <nav class="mt-8 flex flex-col gap-2">
        <RouterLink
          v-for="item in NAV_ITEMS"
          :key="item.path"
          :to="item.path"
          class="relative mx-1 flex h-14 flex-col items-center justify-center gap-1.5 rounded-md transition"
          :class="isActive(item.path) ? 'bg-tertiary text-ink' : 'text-mute hover:bg-sec'"
        >
          <span v-if="isActive(item.path)" class="absolute left-0 top-0 h-full w-[3px] bg-primary" />

          <svg
            v-if="item.icon === NAV_ICON.OVERVIEW"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <svg
            v-else-if="item.icon === NAV_ICON.PROVIDERS"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <ellipse cx="12" cy="5.5" rx="8" ry="2.5" />
            <path d="M4 5.5v13c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-13" />
            <path d="M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5" />
          </svg>
          <svg
            v-else
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 7h9M17 7h3M4 17h4M12 17h8" />
            <circle cx="15" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>

          <span class="text-[11px] font-medium leading-none">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <span class="mt-auto px-1 pb-5 text-center text-[9px] text-mute">v0.0.2</span>
    </aside>

    <main class="flex min-h-0 min-w-0 flex-1 flex-col">
      <div class="flex items-start justify-between gap-6 px-10 pt-3">
        <div class="min-w-0"><slot name="header" /></div>
        <ThemeSwitch class="shrink-0" />
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-10 pb-10 pt-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

import ThemeSwitch from './ThemeSwitch.vue'

const NAV_ICON = {
  OVERVIEW: 'overview',
  PROVIDERS: 'providers',
  PREFERENCES: 'preferences',
} as const

type NavIcon = (typeof NAV_ICON)[keyof typeof NAV_ICON]

interface NavItem {
  path: string
  label: string
  icon: NavIcon
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: '余额总览', icon: NAV_ICON.OVERVIEW },
  { path: '/settings', label: '平台设置', icon: NAV_ICON.PROVIDERS },
  { path: '/preferences', label: '偏好设置', icon: NAV_ICON.PREFERENCES },
]

const route = useRoute()

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
