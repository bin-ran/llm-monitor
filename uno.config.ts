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
      'px-4 py-1 rounded inline-block bg-teal-600 text-white cursor-pointer hover:bg-teal-700 disabled:cursor-default disabled:bg-gray-600 disabled:opacity-50',
    ],
    [
      'icon-btn',
      'text-[0.9em] inline-block cursor-pointer select-none opacity-75 transition duration-200 ease-in-out hover:opacity-100 hover:text-teal-600',
    ],
  ],
  // 字体通过 @fontsource 本地引入（src/main.ts），不使用 CDN，保证 CSP 可锁死为 'self'
  theme: {
    fontFamily: {
      sans: "'DM Sans', ui-sans-serif, system-ui, 'Segoe UI', sans-serif",
      mono: "'DM Mono', ui-monospace, 'Cascadia Code', monospace",
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
