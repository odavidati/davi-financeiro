import { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_FIXED, PRESET_BILLS, CATEGORIES, INCOME_SOURCES, USER, RDB_INITIAL_BALANCE } from '../constants'
import { todayMonth } from '../utils/format'
import { categorize } from '../utils/categorizer'
import { SEED_TRANSACTIONS } from '../utils/seedData'
import {
  fetchAllTransactions, upsertTransaction, upsertTransactionsBulk,
  deleteTransactionDb, deleteAllTransactions,
  fetchSettings, saveSettings,
  fetchChecklist, saveChecklistMonth,
} from '../lib/sync'
import { isSupabaseConfigured } from '../lib/supabase'

export const AppContext = createContext(null)

// ─── Fase do mês ───
function getPhase(month) {
  const [y, m] = month.split('-').map(Number)
  if (y < 2026 || (y === 2026 && m < 6)) return 'pre'
  if (y < 2028 || (y === 2028 && m < 6)) return 'post'
  return 'obra'
}

// ─── Fixed expenses por fase ───
function getEffectiveFixed(month, customFixed) {
  const phase = getPhase(month)
  const base  = DEFAULT_FIXED[phase] || []
  const overrides = customFixed?.[month] || {}
  return [
    ...base
      .filter(f => overrides.hidden?.[f.id] !== true)
      .map(f => ({ ...f, amount: overrides.amounts?.[f.id] ?? f.amount })),
    ...(overrides.extra || []),
  ]
}

// ─── Default state (no data yet) ───
const EMPTY_STATE = {
  activeMonth: todayMonth(),
  transactions: {},
  settings: {
    ccsEmitted: false,
    emergencyFundCurrent: 600,
    emergencyFundGoal: 8000,
    rdbInitialBalance: RDB_INITIAL_BALANCE,
    theme: 'light',
  },
  checklist: {},
  bills: {},
  customFixed: {},
  reminders: [],
  installments: [],
}

// ─── Reducer — pure state updates, NO persistence ───
function reducer(state, action) {
  switch (action.type) {
    case 'SET_MONTH':
      return { ...state, activeMonth: action.month }

    case 'SET_STATE':
      return { ...action.state }

    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.transactions }

    case 'ADD_TRANSACTION': {
      const { month, tx } = action
      const existing = (state.transactions[month] || [])
      const updated  = [tx, ...existing.filter(t => t.id !== tx.id)]
        .sort((a,b) => b.date.localeCompare(a.date))
      return { ...state, transactions: { ...state.transactions, [month]: updated } }
    }

    case 'UPSERT_TRANSACTIONS': {
      const { month, list } = action
      const existing = (state.transactions[month] || [])
        .filter(t => !list.some(n => n.id === t.id))
      const merged = [...existing, ...list].sort((a,b) => b.date.localeCompare(a.date))
      return { ...state, transactions: { ...state.transactions, [month]: merged } }
    }

    case 'DELETE_TRANSACTION': {
      const { month, id } = action
      return {
        ...state,
        transactions: {
          ...state.transactions,
          [month]: (state.transactions[month] || []).filter(t => t.id !== id),
        },
      }
    }

    case 'UPDATE_TRANSACTION': {
      const { month, tx } = action
      return {
        ...state,
        transactions: {
          ...state.transactions,
          [month]: (state.transactions[month] || []).map(t => t.id === tx.id ? tx : t),
        },
      }
    }

    case 'SET_SETTING': {
      const newSettings = { ...state.settings, [action.key]: action.value }
      if (action.key === 'theme') {
        document.documentElement.setAttribute('data-theme', action.value)
      }
      return { ...state, settings: newSettings }
    }

    case 'TOGGLE_CHECKLIST': {
      const { month, itemId } = action
      const mc = state.checklist[month] || {}
      return { ...state, checklist: { ...state.checklist, [month]: { ...mc, [itemId]: !mc[itemId] } } }
    }

    case 'TOGGLE_BILL': {
      const { month, billId } = action
      const mb  = (state.bills[month] || {})
      const cur = mb[billId] || { paid: false, paidDate: null }
      const paid = !cur.paid
      return {
        ...state,
        bills: {
          ...state.bills,
          [month]: { ...mb, [billId]: { paid, paidDate: paid ? new Date().toISOString().slice(0,10) : null } },
        },
      }
    }

    case 'ADD_CUSTOM_BILL': {
      const { month, bill } = action
      const mb = state.bills[month] || {}
      return { ...state, bills: { ...state.bills, [month]: { ...mb, _custom: [...(mb._custom||[]), bill] } } }
    }

    case 'DELETE_CUSTOM_BILL': {
      const { month, billId } = action
      const mb = state.bills[month] || {}
      return { ...state, bills: { ...state.bills, [month]: { ...mb, _custom: (mb._custom||[]).filter(b=>b.id!==billId) } } }
    }

    case 'SET_FIXED_AMOUNT': {
      const { month, fixedId, amount } = action
      const cf = state.customFixed || {}
      const mf = cf[month] || {}
      return { ...state, customFixed: { ...cf, [month]: { ...mf, amounts: { ...(mf.amounts||{}), [fixedId]: amount } } } }
    }

    case 'TOGGLE_FIXED_HIDDEN': {
      const { month, fixedId } = action
      const cf = state.customFixed || {}
      const mf = cf[month] || {}
      const cur = mf.hidden?.[fixedId] || false
      return { ...state, customFixed: { ...cf, [month]: { ...mf, hidden: { ...(mf.hidden||{}), [fixedId]: !cur } } } }
    }

    case 'ADD_EXTRA_FIXED': {
      const { month, item } = action
      const cf = state.customFixed || {}
      const mf = cf[month] || {}
      return { ...state, customFixed: { ...cf, [month]: { ...mf, extra: [...(mf.extra||[]), item] } } }
    }

    case 'ADD_REMINDER':
      return { ...state, reminders: [...(state.reminders||[]), action.reminder] }

    case 'UPDATE_REMINDER':
      return { ...state, reminders: (state.reminders||[]).map(r=>r.id===action.reminder.id?action.reminder:r) }

    case 'DELETE_REMINDER':
      return { ...state, reminders: (state.reminders||[]).filter(r=>r.id!==action.id) }

    case 'ADD_INSTALLMENT':
      return { ...state, installments: [...(state.installments||[]), action.installment] }

    case 'DELETE_INSTALLMENT':
      return { ...state, installments: (state.installments||[]).filter(i=>i.id!==action.id) }

    default:
      return state
  }
}

// ─── Provider ───
export function AppProvider({ children, userId }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const settingsSaveTimer = useRef(null)

  // ─── Apply theme ───
  useEffect(() => {
    const theme = state.settings?.theme || 'light'
    document.documentElement.setAttribute('data-theme', theme)
  }, [state.settings?.theme])

  // ─── LOAD FROM SUPABASE ON MOUNT ───
  useEffect(() => {
    if (!userId) { setLoading(false); return }

    async function loadFromSupabase() {
      setLoading(true)
      try {
        // Load all data in parallel
        const [remoteTxs, remoteSettings, remoteChecklist] = await Promise.all([
          fetchAllTransactions(userId),
          fetchSettings(userId),
          fetchChecklist(userId),
        ])

        const remoteCount = Object.values(remoteTxs || {}).flat().length

        if (remoteCount === 0) {
          // ── First time: seed from CSV data ──
          console.log('🌱 First time: seeding from CSV data...')
          const seeded = {}
          for (const [month, txs] of Object.entries(SEED_TRANSACTIONS)) {
            seeded[month] = txs.map(tx => ({ ...tx, category: categorize(tx.description, tx.amount) }))
          }
          // Save seed to Supabase
          setSyncing(true)
          for (const [month, txList] of Object.entries(seeded)) {
            await upsertTransactionsBulk(userId, month, txList)
          }
          const defaultSettings = EMPTY_STATE.settings
          await saveSettings(userId, defaultSettings)
          setSyncing(false)
          dispatch({ type: 'SET_STATE', state: { ...EMPTY_STATE, transactions: seeded } })
          console.log('✅ Seed data saved to Supabase')
        } else {
          // ── Load existing data from Supabase ──
          console.log(`📥 Loading ${remoteCount} transactions from Supabase`)
          const mergedSettings = { ...EMPTY_STATE.settings, ...(remoteSettings || {}) }
          dispatch({
            type: 'SET_STATE',
            state: {
              ...EMPTY_STATE,
              transactions: remoteTxs || {},
              settings: mergedSettings,
              checklist: remoteChecklist || {},
            },
          })
        }
      } catch (err) {
        console.error('Error loading from Supabase:', err)
        // Fallback to seed data
        const seeded = {}
        for (const [month, txs] of Object.entries(SEED_TRANSACTIONS)) {
          seeded[month] = txs.map(tx => ({ ...tx, category: categorize(tx.description, tx.amount) }))
        }
        dispatch({ type: 'SET_STATE', state: { ...EMPTY_STATE, transactions: seeded } })
      } finally {
        setLoading(false)
      }
    }

    loadFromSupabase()
  }, [userId])

  // ─── Save settings to Supabase (debounced) ───
  function scheduleSaveSettings(newSettings) {
    if (!userId) return
    clearTimeout(settingsSaveTimer.current)
    settingsSaveTimer.current = setTimeout(() => {
      saveSettings(userId, newSettings)
    }, 800)
  }

  // ─── Dispatch with Supabase persistence ───
  async function dispatchAndPersist(action) {
    dispatch(action)  // update UI immediately

    if (!userId) return

    switch (action.type) {
      case 'ADD_TRANSACTION':
        await upsertTransaction(userId, action.month, action.tx)
        break

      case 'UPSERT_TRANSACTIONS':
        await upsertTransactionsBulk(userId, action.month, action.list)
        break

      case 'DELETE_TRANSACTION':
        await deleteTransactionDb(userId, action.id)
        break

      case 'UPDATE_TRANSACTION':
        await upsertTransaction(userId, action.month, action.tx)
        break

      case 'SET_SETTING':
      case 'SET_FIXED_AMOUNT':
      case 'TOGGLE_FIXED_HIDDEN':
      case 'ADD_EXTRA_FIXED':
      case 'TOGGLE_BILL':
      case 'ADD_CUSTOM_BILL':
      case 'DELETE_CUSTOM_BILL':
      case 'ADD_REMINDER':
      case 'DELETE_REMINDER':
      case 'ADD_INSTALLMENT':
      case 'DELETE_INSTALLMENT': {
        // Save entire settings blob (includes bills, customFixed, reminders, installments)
        // We read the updated state in next tick
        setTimeout(() => {
          // Get latest state after reducer update
          scheduleSaveSettings({
            ...state.settings,
            ...(action.type === 'SET_SETTING' ? { [action.key]: action.value } : {}),
          })
        }, 0)
        break
      }

      case 'TOGGLE_CHECKLIST':
        setTimeout(async () => {
          // Read updated checklist from latest state
          const updatedCk = { ...(state.checklist[action.month] || {}), [action.itemId]: !(state.checklist[action.month]?.[action.itemId]) }
          await saveChecklistMonth(userId, action.month, updatedCk)
        }, 0)
        break

      case 'SET_MONTH':
        break // no persistence needed

      default:
        break
    }
  }

  // ─── RESET: clear Supabase + reseed ───
  async function resetAndReseed() {
    if (!userId) return
    setLoading(true)
    try {
      await deleteAllTransactions(userId)
      const seeded = {}
      for (const [month, txs] of Object.entries(SEED_TRANSACTIONS)) {
        seeded[month] = txs.map(tx => ({ ...tx, category: categorize(tx.description, tx.amount) }))
      }
      for (const [month, txList] of Object.entries(seeded)) {
        await upsertTransactionsBulk(userId, month, txList)
      }
      await saveSettings(userId, EMPTY_STATE.settings)
      dispatch({ type: 'SET_STATE', state: { ...EMPTY_STATE, transactions: seeded } })
    } catch (err) {
      console.error('Reset error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─── Computed getters ───
  const getFixed = useCallback((month) =>
    getEffectiveFixed(month, state.customFixed), [state.customFixed])

  const getTx = useCallback((month) =>
    (state.transactions[month] || []), [state.transactions])

  const getBills = useCallback((month) =>
    (state.bills[month] || {}), [state.bills])

  const getCustomFixed = useCallback((month) =>
    (state.customFixed[month] || {}), [state.customFixed])

  const getReminders = useCallback((month) => {
    const [y, m] = month.split('-').map(Number)
    return (state.reminders||[]).filter(r => {
      if (!r.dueDate) return false
      const [ry, rm] = r.dueDate.split('-').map(Number)
      return ry === y && rm === m
    })
  }, [state.reminders])

  const getInstallmentsForMonth = useCallback((month) => {
    const [y, m] = month.split('-').map(Number)
    return (state.installments||[]).filter(inst => {
      if (!inst.active) return false
      const [sy, sm] = inst.startMonth.split('-').map(Number)
      const monthsIn = (y - sy) * 12 + (m - sm)
      return monthsIn >= 0 && monthsIn < inst.totalInstallments
    }).map(inst => {
      const [sy, sm] = inst.startMonth.split('-').map(Number)
      const [yy, mm] = month.split('-').map(Number)
      const number = (yy - sy) * 12 + (mm - sm) + 1
      return { ...inst, number, isPaid: number <= inst.paidCount }
    })
  }, [state.installments])

  const getSummary = useCallback((month) => {
    const txs = getTx(month)

    const salary = txs
      .filter(t => t.amount > 0 && t.category === 'salario')
      .reduce((s,t) => s+t.amount, 0)

    const INCOME_CATS = ['aulas','freela','convites','outros_rec','emprestimo']
    const variableIncome = txs
      .filter(t => t.amount > 0 && INCOME_CATS.includes(t.category))
      .reduce((s,t) => s+t.amount, 0)

    const rdbResgates = txs
      .filter(t => t.category === 'rdb_resgate')
      .reduce((s,t) => s+t.amount, 0)

    const rdbAplicacoes = txs
      .filter(t => t.category === 'rdb_aplicacao')
      .reduce((s,t) => s+Math.abs(t.amount), 0)

    const EXCLUDE_CATS = ['rdb_aplicacao','rdb_resgate','empresa_encerrada','salario','aulas','freela','convites','outros_rec','emprestimo','estorno']
    const expenses = txs
      .filter(t => t.amount < 0 && !EXCLUDE_CATS.includes(t.category) && !t.exclude)
      .reduce((s,t) => s+Math.abs(t.amount), 0)

    const effectiveIncome = (salary + variableIncome) > 0
      ? (salary + variableIncome)
      : (txs.length === 0 ? USER.netIncome : 0)

    const surplus = effectiveIncome - expenses
    const pct     = Math.round((expenses / Math.max(effectiveIncome, 1)) * 100)

    const fixed       = getFixed(month)
    const fixedBudget = fixed.reduce((s,f) => s+f.amount, 0)

    return {
      salary, variableIncome,
      totalIncome: effectiveIncome,
      cltSalary: salary,
      expenses, fixedBudget, fixedTotal: fixedBudget,
      totalSpent: expenses, surplus, pct,
      net: effectiveIncome,
      rdbResgates, rdbAplicacoes,
      hasTx: txs.length > 0,
      isEstimated: effectiveIncome === USER.netIncome && txs.length === 0,
    }
  }, [getFixed, getTx])

  const getByCategory = useCallback((month) => {
    const txs = getTx(month)
    const map = {}
    CATEGORIES.forEach(c => { map[c.id] = { ...c, total: 0, items: [] } })

    const SKIP = ['rdb_aplicacao','rdb_resgate','empresa_encerrada','estorno','salario','aulas','freela','convites','outros_rec','emprestimo']
    txs
      .filter(t => t.amount < 0 && !SKIP.includes(t.category) && !t.exclude)
      .forEach(t => {
        const cat = map[t.category] || map['outros']
        cat.total += Math.abs(t.amount)
        cat.items.push(t)
      })

    return Object.values(map).filter(c => c.total > 0).sort((a,b) => b.total - a.total)
  }, [getTx])

  const getBillsSummary = useCallback((month) => {
    const billStatus = getBills(month)
    const custom  = billStatus._custom || []
    const presets = PRESET_BILLS.filter(b => b.month === month)
    const allBills = [
      ...presets.map(b => ({ ...b, billId:b.id, isPaid:!!(billStatus[b.id]?.paid), paidDate:billStatus[b.id]?.paidDate, isPreset:true })),
      ...custom.map(b => ({ ...b, billId:b.id, isPaid:!!(billStatus[b.id]?.paid), paidDate:billStatus[b.id]?.paidDate })),
    ]
    const paid        = allBills.filter(b => b.isPaid)
    const unpaid      = allBills.filter(b => !b.isPaid)
    const totalPaid   = paid.reduce((s,b) => s+b.amount, 0)
    const totalUnpaid = unpaid.reduce((s,b) => s+b.amount, 0)
    const pct         = allBills.length > 0 ? Math.round((paid.length/allBills.length)*100) : 0
    return { allBills, paid, unpaid, totalPaid, totalUnpaid, pct, allPaid: unpaid.length===0 && allBills.length>0 }
  }, [getBills])

  return (
    <AppContext.Provider value={{
      state, dispatch: dispatchAndPersist,
      loading, syncing, resetAndReseed,
      getFixed, getTx, getSummary, getByCategory,
      getBills, getBillsSummary, getCustomFixed,
      getReminders, getInstallmentsForMonth,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
