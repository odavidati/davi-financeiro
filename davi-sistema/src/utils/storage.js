const KEY = 'davi-finance-v3'

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Storage error:', e)
  }
}

export function clearState() {
  try { localStorage.removeItem(KEY) } catch {}
}
