import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWind4,
  transformerDirectives,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    [
      'btn',
      'px-4 py-1 rounded-md inline-block cursor-pointer bg-primary text-on-primary hover:bg-primary-hover disabled:cursor-default disabled:opacity-50',
    ],
    [
      'icon-btn',
      'text-[0.9em] inline-block cursor-pointer select-none opacity-75 transition duration-200 ease-in-out hover:opacity-100 hover:text-ink',
    ],
  ],
  // 字体通过 @fontsource 本地引入（src/main.ts），不使用 CDN，保证 CSP 可锁死为 'self'
  theme: {
    fontFamily: {
      sans: "'DM Sans', ui-sans-serif, system-ui, 'Segoe UI', sans-serif",
      mono: "'DM Mono', ui-monospace, 'Cascadia Code', monospace",
    },
    colors: {
      bg: 'var(--color-background)',
      surface: 'var(--color-surface)',
      sec: 'var(--color-surface-secondary)',
      tertiary: 'var(--color-surface-tertiary)',
      ink: 'var(--color-text-primary)',
      sub: 'var(--color-text-secondary)',
      mute: 'var(--color-text-muted)',
      line: 'var(--color-border)',
      primary: 'var(--color-primary)',
      'primary-hover': 'var(--color-primary-hover)',
      'on-primary': 'var(--color-primary-foreground)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      error: 'var(--color-error)',
      info: 'var(--color-info)',
    },
  },
  presets: [
    presetWind4(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  transformers: [transformerDirectives()],
})
