import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Buffer } from 'buffer'

// Polyfill Buffer for browser
if (!window.Buffer) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Buffer = Buffer;
}

import App from './App.vue'
import router from './router'

// Global Styles
import './assets/styles/global.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
