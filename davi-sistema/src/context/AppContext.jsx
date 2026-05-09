import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import { FIXED_EXPENSES, CATEGORIES, USER } from '../constants'
import { loadState, saveState, clearState } from '../utils/storage'
import { todayMonth } from '../utils/format'
import { categorize } from '../utils/categorizer'
import { SEED_TRANSACTIONS } from '../utils/seedData'
import { syncTransactionsUp, fetchTransactions, syncSettingsUp, fetchSettings, syncChecklistUp, fetchChecklist, deleteTransactionRemote } from '../lib/sync'
import { isSupabaseConfigured } from '../lib/supabase'

export const AppContext = createContext(null)

function getPhase(month) {
  const [y, m] = month.split('-').map(Number)
  if (y < 2026 || (y === 2026 && m < 6)) return 'pre'
  if (y < 2028 || (y === 2028 && m < 6)) return 'post'
  return 'obra'
}

function buildFreshState() {
  const seeded = {}
  for (const [month, txs] of Object.entries(SEED_TRANSACTIONS)) {
    seeded[month] = txs.map(tx => ({ ...tx, category: categorize(tx.description) }))
  }
  return {
    activeMonth: todayMonth(),
    transactions: seeded,
    settings: {
      ccsEmitted: false,
      emergencyFundCurrent: 0,
      emergencyFundGoal: 8000,
      theme: 'light',
    },
    checklist: {},
    bills: {},
    _seeded: true,
  }
}

function buildLocalState() {
  try {
    const saved = loadState()
    // Validate that saved state has required fields
    if (saved && saved._seeded && saved.transactions && typeof saved.transactions === 'object') {
      // Apply theme on load
      const theme = saved.settings?.theme || 'light'
      document.documentElement.setAttribute('data-theme', theme)
      // Ensure all required fields exist (merge with defaults)
      return {
        activeMonth: saved.activeMonth || todayMonth(),
        transactions: saved.transactions,
        settings: { ccsEmitted: false, emergencyFundCurrent: 0, emergencyFundGoal: 8000, theme: 'light', ...(saved.settings || {}) },
        checklist: saved.checklist || {},
        bills: saved.bills || {},
        _seeded: true,
      }
    }
  } catch (e) {
    console.warn('Failed to load saved state, rebuilding:', e)
    try { clearState() } catch {}
  }
  const fresh = buildFreshState()
  document.documentElement.setAttribute('data-theme', 'light')
  saveState(fresh)
  return fresh
}

function reducer(state, action) {
  let next
  switch (action.type) {
    case 'SET_MONTH':
      next = { ...state, activeMonth: action.month }
      break
    case 'UPSERT_TRANSACTIONS': {
      const { month, list } = action
      const existing = ((state.transactions || {})[month] || []).filter(t => !list.some(n => n.id === t.id))
      next = { ...state, transactions: { ...state.transactions, [month]: [...existing, ...list].sort((a,b) => b.date.localeCompare(a.date)) } }
      break
    }
    case 'ADD_TRANSACTION': {
      const { month, tx } = action
      next = { ...state, transactions: { ...(state.transactions||{}), [month]: [tx, ...((state.transactions||{})[month] || [])].sort((a,b) => b.date.localeCompare(a.date)) } }
      break
    }
    case 'DELETE_TRANSACTION': {
      const { month, id } = action
      next = { ...state, transactions: { ...(state.transactions||{}), [month]: ((state.transactions||{})[month] || []).filter(t => t.id !== id) } }
      break
    }
    case 'UPDATE_TRANSACTION': {
      const { month, tx } = action
      next = { ...state, transactions: { ...(state.transactions||{}), [month]: ((state.transactions||{})[month] || []).map(t => t.id === tx.id ? tx : t) } }
      break
    }
    case 'SET_SETTING': {
      const newSettings = { ...state.settings, [action.key]: action.value }
      if (action.key === 'theme') {
        document.documentElement.setAttribute('data-theme', action.value)
      }
      next = { ...state, settings: newSettings }
      break
    }
    case 'TOGGLE_CHECKLIST': {
      const { month, itemId } = action
      const mc = state.checklist[month] || {}
      next = { ...state, checklist: { ...state.checklist, [month]: { ...mc, [itemId]: !mc[itemId] } } }
      break
    }
    case 'TOGGLE_BILL': {
      const { month, billId } = action
      const mb = state.bills[month] || {}
      const current = mb[billId] || { paid: false, paidDate: null }
      const paid = !current.paid
      next = { ...state, bills: { ...state.bills, [month]: { ...mb, [billId]: { paid, paidDate: paid ? new Date().toISOString().slice(0,10) : null } } } }
      break
    }
    case 'ADD_CUSTOM_BILL': {
      const { month, bill } = action
      const mb = state.bills[month] || {}
      const custom = mb._custom || []
      next = { ...state, bills: { ...state.bills, [month]: { ...mb, _custom: [...custom, bill] } } }
      break
    }
    case 'DELETE_CUSTOM_BILL': {
      const { month, billId } = action
      const mb = state.bills[month] || {}
      const custom = (mb._custom || []).filter(b => b.id !== billId)
      next = { ...state, bills: { ...state.bills, [month]: { ...mb, _custom: custom } } }
      break
    }
    case 'MERGE_REMOTE':
      next = { ...state, transactions: action.transactions ?? state.transactions, settings: action.settings ?? state.settings, checklist: action.checklist ?? state.checklist }
      break
    case 'RESET':
      clearState()
      document.documentElement.setAttribute('data-theme', 'light')
      next = buildFreshState()
      saveState(next)
      break
    default:
      return state
  }
  saveState(next)
  return next
}

export function AppProvider({ children, userId }) {
  const [state, dispatch] = useReducer(reducer, null, buildLocalState)
  const syncTimeout = useRef({})

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return
    async function load() {
      const [txs, settings, checklist] = await Promise.all([fetchTransactions(userId), fetchSettings(userId), fetchChecklist(userId)])
      if (txs || settings || checklist) dispatch({ type: 'MERGE_REMOTE', transactions: txs, settings, checklist })
    }
    load()
  }, [userId])

  function scheduleSyncTransactions(month, list) {
    if (!userId || !isSupabaseConfigured()) return
    clearTimeout(syncTimeout.current[`tx_${month}`])
    syncTimeout.current[`tx_${month}`] = setTimeout(() => syncTransactionsUp(userId, month, list), 1500)
  }
  function scheduleSyncSettings(settings) {
    if (!userId || !isSupabaseConfigured()) return
    clearTimeout(syncTimeout.current.settings)
    syncTimeout.current.settings = setTimeout(() => syncSettingsUp(userId, settings), 1500)
  }
  function scheduleSyncChecklist(month, items) {
    if (!userId || !isSupabaseConfigured()) return
    clearTimeout(syncTimeout.current[`ck_${month}`])
    syncTimeout.current[`ck_${month}`] = setTimeout(() => syncChecklistUp(userId, month, items), 1500)
  }

  function dispatchAndSync(action) {
    dispatch(action)
    switch (action.type) {
      case 'UPSERT_TRANSACTIONS': case 'ADD_TRANSACTION': case 'UPDATE_TRANSACTION': {
        const month = action.month
        setTimeout(() => { const s = loadState(); scheduleSyncTransactions(month, s?.transactions?.[month] || []) }, 0)
        break
      }
      case 'DELETE_TRANSACTION':
        if (userId && isSupabaseConfigured()) deleteTransactionRemote(userId, action.id)
        setTimeout(() => { const s = loadState(); scheduleSyncTransactions(action.month, s?.transactions?.[action.month] || []) }, 0)
        break
      case 'SET_SETTING':
        setTimeout(() => { const s = loadState(); scheduleSyncSettings(s?.settings || {}) }, 0)
        break
      case 'TOGGLE_CHECKLIST':
        setTimeout(() => { const s = loadState(); scheduleSyncChecklist(action.month, s?.checklist?.[action.month] || {}) }, 0)
        break
    }
  }

  const getFixed    = useCallback((month) => FIXED_EXPENSES[getPhase(month)] || [], [])
  const getTx       = useCallback((month) => (state.transactions || {})[month] || [], [state.transactions])
  const getBills    = useCallback((month) => (state.bills || {})[month] || {}, [state.bills])

  const getSummary  = useCallback((month) => {
    const fixed = getFixed(month); const txs = getTx(month)
    const fixedTotal = fixed.reduce((s,f) => s+f.amount, 0)
    const expenses   = txs.filter(t => t.amount < 0).reduce((s,t) => s+Math.abs(t.amount), 0)
    const credits    = txs.filter(t => t.amount > 0).reduce((s,t) => s+t.amount, 0)
    const totalSpent = fixedTotal + expenses
    const surplus    = USER.netIncome - totalSpent + credits
    const pct        = Math.round((totalSpent / USER.netIncome) * 100)
    return { fixedTotal, expenses, credits, totalSpent, surplus, pct, net: USER.netIncome }
  }, [getFixed, getTx])

  const getByCategory = useCallback((month) => {
    const fixed = getFixed(month); const txs = getTx(month)
    const map = {}
    CATEGORIES.forEach(c => { map[c.id] = { ...c, total: 0, items: [] } })
    fixed.forEach(f => {
      if (!map[f.category]) map[f.category] = { id: f.category, name: f.category, icon: '📦', color: '#94A3B8', budget: 0, total: 0, items: [] }
      map[f.category].total += f.amount
      map[f.category].items.push({ ...f, isFixed: true, amount: -f.amount })
    })
    txs.filter(t => t.amount < 0).forEach(t => {
      const cat = map[t.category] || map['outros']
      cat.total += Math.abs(t.amount); cat.items.push(t)
    })
    return Object.values(map).filter(c => c.total > 0).sort((a,b) => b.total - a.total)
  }, [getFixed, getTx])

  // Bills summary for a month
  const getBillsSummary = useCallback((month) => {
    const fixed = getFixed(month)
    const billStatus = getBills(month)
    const custom = billStatus._custom || []
    const allBills = [
      ...fixed.map(f => ({ ...f, billId: f.id, isPaid: !!(billStatus[f.id]?.paid), paidDate: billStatus[f.id]?.paidDate })),
      ...custom.map(b => ({ ...b, billId: b.id, isPaid: !!(billStatus[b.id]?.paid), paidDate: billStatus[b.id]?.paidDate })),
    ]
    const paid   = allBills.filter(b => b.isPaid)
    const unpaid = allBills.filter(b => !b.isPaid)
    const totalPaid   = paid.reduce((s,b) => s+b.amount, 0)
    const totalUnpaid = unpaid.reduce((s,b) => s+b.amount, 0)
    const pct = allBills.length > 0 ? Math.round((paid.length / allBills.length) * 100) : 0
    return { allBills, paid, unpaid, totalPaid, totalUnpaid, pct, allPaid: unpaid.length === 0 && allBills.length > 0 }
  }, [getFixed, getBills])

  return (
    <AppContext.Provider value={{ state, dispatch: dispatchAndSync, getFixed, getTx, getSummary, getByCategory, getBills, getBillsSummary }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
