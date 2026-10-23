import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import UnoCSS from 'unocss/vite'
import VueRouter from 'vue-router/vite'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import electron from 'vite-plugin-electron/simple'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [VueRouter(), vue(), vueDevTools(), UnoCSS()]

  if (mode === 'electron') {
    plugins.push(
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: 'electron/main.ts',
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`
          input: 'electron/preload.ts',
        },
        // Optional: Use Node.js API in the Renderer process
        renderer: {},
      }),
    )
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vue',
                test: /node_modules\/vue/,
              },
              {
                name: 'pinia',
                test: /node_modules\/pinia/,
              },
            ],
          },
        },
      },
    },
    server: {
      port: 5173,
    },
  }
})
