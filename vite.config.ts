import { fileURLToPath, URL } from 'node:url'
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    {
      // Prefix the tab title with "LOCAL" when running the dev server, so a dev
      // tab is never mistaken for the real app. Builds (deployed web, Capacitor,
      // the Docker preview) keep the plain title. Done in the HTML, not from JS,
      // so the right title shows from first paint.
      name: 'local-title',
      apply: 'serve',
      transformIndexHtml(html) {
        return html.replace('<title>Activity Manager</title>', '<title>LOCAL Activity Manager</title>')
      },
    },
    {
      // jeep-sqlite (the SQLite plugin's web fallback) fetches sql-wasm.wasm
      // from /assets/ at runtime. The wasm must come from the sql.js version
      // jeep-sqlite itself resolves to — its dist bundles the matching JS glue,
      // and a version-mismatched wasm fails at instantiation with a LinkError.
      // (sql.js is pinned via package.json "overrides" for the same reason.)
      name: 'copy-sql-wasm',
      buildStart() {
        const require = createRequire(import.meta.url)
        const jeepDir = dirname(require.resolve('jeep-sqlite/package.json'))
        const src = createRequire(`${jeepDir}/`).resolve('sql.js/dist/sql-wasm.wasm')
        const destDir = fileURLToPath(new URL('./public/assets', import.meta.url))
        mkdirSync(destDir, { recursive: true })
        copyFileSync(src, `${destDir}/sql-wasm.wasm`)
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
