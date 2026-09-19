import { ref } from 'vue'

// Marks this browser as a demo instance (seeded with demo data). Per-browser and
// deliberately NOT synced — it only drives the "purge demo data" affordance.
// localStorage can be unavailable (private mode) or cleared, so every access is
// guarded and the flag is treated as a convenience, never as source of truth.
const KEY = 'demo.active'

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

// Module-level ref so every component shares one reactive flag.
const isDemo = ref(read())

export function useDemoMode() {
  const setDemo = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore — flag is best-effort */
    }
    isDemo.value = true
  }
  const clearDemo = () => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    isDemo.value = false
  }
  return { isDemo, setDemo, clearDemo }
}
