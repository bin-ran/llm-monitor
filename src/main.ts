import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import '@unocss/reset/tailwind.css'

// 本地字体（随包分发，不请求外部 CDN）
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-mono/400.css'

import './styles/main.css'
import 'uno.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
