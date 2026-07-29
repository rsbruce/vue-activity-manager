<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getUserConfig, setSyncUser, setLocalOnly } from '@/data/userConfig'
import { getRefreshToken, login, registerAndLogin, logout } from '@/data/authClient'

type Tab = 'login' | 'register'

const tab = ref<Tab>('login')
const username = ref('')
const password = ref('')
const signupSecret = ref('')
const loggedIn = ref(false)
const busy = ref(false)
const error = ref('')

onMounted(async () => {
  const cfg = await getUserConfig()
  username.value = cfg.username ?? ''
  loggedIn.value = !!(await getRefreshToken())
})

const switchTab = (t: Tab) => {
  tab.value = t
  error.value = ''
}

const doLogin = async () => {
  const name = username.value.trim()
  if (!name || !password.value || busy.value) return
  await run(() => login(name, password.value), name)
}

const doRegister = async () => {
  const name = username.value.trim()
  if (!name || !password.value || !signupSecret.value || busy.value) return
  await run(() => registerAndLogin(name, password.value, signupSecret.value), name)
}

// Shared submit wrapper: on success, mark the user as a sync user and reload so
// boot re-runs against the sync database with authed sync.
const run = async (action: () => Promise<void>, name: string) => {
  busy.value = true
  error.value = ''
  try {
    await action()
    await setSyncUser(name)
    window.location.reload()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    busy.value = false
  }
}

const signOut = async () => {
  if (busy.value) return
  busy.value = true
  await logout()
  await setLocalOnly()
  window.location.reload()
}
</script>

<template>
  <div class="py-6 max-w-sm space-y-4">
    <template v-if="loggedIn">
      <p>Signed in as <strong>{{ username }}</strong>.</p>
      <button
        @click="signOut"
        :disabled="busy"
        class="bg-red-500 text-white rounded-md border-2 border-black px-3 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >Log out</button>
    </template>

    <template v-else>
      <div class="flex border-b">
        <button
          @click="switchTab('login')"
          class="px-4 py-1 cursor-pointer border-b-2 -mb-px"
          :class="tab === 'login' ? 'border-sky-400 font-semibold' : 'border-transparent opacity-60'"
        >Log in</button>
        <button
          @click="switchTab('register')"
          class="px-4 py-1 cursor-pointer border-b-2 -mb-px"
          :class="tab === 'register' ? 'border-sky-400 font-semibold' : 'border-transparent opacity-60'"
        >Register</button>
      </div>

      <label class="block">
        <span class="block mb-1">Username</span>
        <input v-model="username" type="text" autocomplete="username"
          class="w-full p-1 border rounded-md bg-white text-black" />
      </label>
      <label class="block">
        <span class="block mb-1">Password</span>
        <input v-model="password" type="password"
          :autocomplete="tab === 'login' ? 'current-password' : 'new-password'"
          class="w-full p-1 border rounded-md bg-white text-black"
          @keyup.enter="tab === 'login' ? doLogin() : undefined" />
      </label>
      <label v-if="tab === 'register'" class="block">
        <span class="block mb-1">Signup secret</span>
        <input v-model="signupSecret" type="password"
          class="w-full p-1 border rounded-md bg-white text-black"
          @keyup.enter="doRegister" />
      </label>

      <button
        v-if="tab === 'login'"
        @click="doLogin"
        :disabled="!username.trim() || !password || busy"
        class="bg-sky-500 text-white rounded-md border-2 border-black px-3 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >{{ busy ? 'Logging in…' : 'Log in' }}</button>
      <button
        v-else
        @click="doRegister"
        :disabled="!username.trim() || !password || !signupSecret || busy"
        class="bg-sky-500 text-white rounded-md border-2 border-black px-3 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >{{ busy ? 'Registering…' : 'Register' }}</button>

      <p v-if="error" class="text-red-400 text-sm whitespace-pre-wrap">{{ error }}</p>
    </template>
  </div>
</template>
