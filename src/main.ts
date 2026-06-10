import './assets/main.css'
import './utils/dateExtensions'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
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
