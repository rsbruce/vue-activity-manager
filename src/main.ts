import './assets/main.css'
import './utils/dateExtensions'

import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// On web the SQLite plugin falls back to sql.js inside the jeep-sqlite custom
// element, persisted to IndexedDB. The element must exist in the DOM and the
// web store must be initialized before any connection is opened. Native
// platforms skip all of this.
if (Capacitor.getPlatform() === 'web') {
  defineJeepSqlite(window)
  await customElements.whenDefined('jeep-sqlite')
  document.body.appendChild(document.createElement('jeep-sqlite'))
  await new SQLiteConnection(CapacitorSQLite).initWebStore()
}
import { library } from '@fortawesome/fontawesome-svg-core'
import {
    faArrowLeft, faArrowRight, faArrowUp, faArrowDown,
    faUpDown, faArrowsUpToLine, faArrowsDownToLine, faFileLines, faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(
    faArrowLeft, faArrowRight, faArrowUp, faArrowDown,
    faUpDown, faArrowsUpToLine, faArrowsDownToLine, faFileLines, faXmark,
)

const app = createApp(App)

app.component('font-awesome-icon', FontAwesomeIcon)
app.use(router)

app.mount('#app')
