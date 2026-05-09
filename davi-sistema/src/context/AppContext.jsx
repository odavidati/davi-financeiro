import { createContext, useContext, useReducer, useCallback } from 'react'
import { FIXED_EXPENSES, CATEGORIES, USER } from '../constants'
import { loadState, saveState, clearState } from '../utils/storage'
import { todayMonth } from '../utils/format'
import { categorize } from '../utils/categorizer'
import { SEED_TRANSACTIONS } from '../utils/seedData'

export const AppContext = createContext(null)

// ─── Fase do mês ───
function getPhase(month) {
  const [y, m] = month.split('-').map(Number)
  if (y < 2026 || (y === 2026 && m < 6)) return 'pre'    // até mai/2026
  if (y < 2028 || (y === 2028 && m < 6)) return 'post'   // jun/2026 – mai/2028
  return 'obra'                                           // jun/2028 em diante
}

// ─── Estado inicial com seed de transações reais ───
function buildInitialState() {
  const saved = loadState()

  if (saved && saved._seeded) {
    // Já foi inicializado antes — usa o estado salvo
    return saved
  }

  // Primeira execução: aplica categorias nas transações seed
  const seededTransactions = {}
  for (const [month, txs] of Object.entries(SEED_TRANSACTIONS)) {
    seededTransactions[month] = txs.map(tx => ({
      ...tx,
      category: categorize(tx.description),
    }))
  }

  const initial = {
    activeMonth: todayMonth(),
    transactions: seededTransactions,
    settings: {
      ccsEmitted: false,
      emergencyFundCurrent: 0,
      emergencyFundGoal: 8000,
    },
    checklist: {},
    surplusHistory: {},
    _seeded: true,
  }

  saveState(initial)
  return initial
}

function reducer(state, action) {
  let next

  switch (action.type) {
    case 'SET_MONTH':
      next = { ...state, activeMonth: action.month }
      break

    case 'UPSERT_TRANSACTIONS': {
      const { month, list } = action
      const existing = (state.transactions[month] || []).filter(
        t => !list.some(n => n.id === t.id)
      )
      const merged = [...existing, ...list].sort((a, b) =>
        b.date.localeCompare(a.date)
      )
      next = {
        ...state,
        transactions: { ...state.transactions, [month]: merged },
      }
      break
    }

    case 'ADD_TRANSACTION': {
      const { month, tx } = action
      const existing = state.transactions[month] || []
      const merged = [tx, ...existing].sort((a, b) =>
        b.date.localeCompare(a.date)
      )
      next = {
        ...state,
        transactions: { ...state.transactions, [month]: merged },
      }
      break
    }

    case 'DELETE_TRANSACTION': {
      const { month, id } = action
      next = {
        ...state,
        transactions: {
          ...state.transactions,
          [month]: (state.transactions[month] || []).filter(t => t.id !== id),
        },
      }
      break
    }

    case 'UPDATE_TRANSACTION': {
      const { month, tx } = action
      next = {
        ...state,
        transactions: {
          ...state.transactions,
          [month]: (state.transactions[month] || []).map(t =>
            t.id === tx.id ? tx : t
          ),
        },
      }
      break
    }

    case 'SET_SETTING':
      next = {
        ...state,
        settings: { ...state.settings, [action.key]: action.value },
      }
      break

    case 'TOGGLE_CHECKLIST': {
      const { month, itemId } = action
      const mc = state.checklist[month] || {}
      next = {
        ...state,
        checklist: {
          ...state.checklist,
          [month]: { ...mc, [itemId]: !mc[itemId] },
        },
      }
      break
    }

    case 'RESET':
      clearState()
      next = buildInitialState()
      break

    default:
      return state
  }

  saveState(next)
  return next
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState)

  const getFixed = useCallback(
    (month) => {
      const phase = getPhase(month)
      return FIXED_EXPENSES[phase]
    },
    []
  )

  const getTx = useCallback(
    (month) => state.transactions[month] || [],
    [state.transactions]
  )

  const getSummary = useCallback(
    (month) => {
      const fixed = getFixed(month)
      const txs = getTx(month)
      const fixedTotal = fixed.reduce((s, f) => s + f.amount, 0)
      const expenses = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
      const credits = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
      const totalSpent = fixedTotal + expenses
      const net = USER.netIncome
      const surplus = net - totalSpent + credits
      const pct = Math.round((totalSpent / net) * 100)
      return { fixedTotal, expenses, credits, totalSpent, surplus, pct, net }
    },
    [getFixed, getTx]
  )

  const getByCategory = useCallback(
    (month) => {
      const fixed = getFixed(month)
      const txs = getTx(month)
      const map = {}
      CATEGORIES.forEach(c => {
        map[c.id] = { ...c, total: 0, items: [] }
      })

      fixed.forEach(f => {
        if (!map[f.category]) {
          map[f.category] = { id: f.category, name: f.category, icon: '📦', color: '#94A3B8', budget: 0, total: 0, items: [] }
        }
        map[f.category].total += f.amount
        map[f.category].items.push({ ...f, isFixed: true, amount: -f.amount })
      })

      txs
        .filter(t => t.amount < 0)
        .forEach(t => {
          const cat = map[t.category] || map['outros']
          cat.total += Math.abs(t.amount)
          cat.items.push(t)
        })

      return Object.values(map)
        .filter(c => c.total > 0)
        .sort((a, b) => b.total - a.total)
    },
    [getFixed, getTx]
  )

  return (
    <AppContext.Provider value={{ state, dispatch, getFixed, getTx, getSummary, getByCategory }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
