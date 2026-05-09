import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp } from './context/AppContext'
import { isSupabaseConfigured } from './lib/supabase'
import BottomNav from './components/BottomNav'
import FAB from './components/FAB'
import ImpulseOverlay from './components/ImpulseOverlay'
import LoginScreen from './components/LoginScreen'
import Home from './components/screens/Home'
import Contas from './components/screens/Contas'
import Gastos from './components/screens/Gastos'
import Analise from './components/screens/Analise'
import Metas from './components/screens/Metas'
import Assistente from './components/screens/Assistente'
import Config from './components/screens/Config'
import { categorize } from './utils/categorizer'
import { uid } from './utils/format'
import { CATEGORIES } from './constants'

function QuickAddSheet({ month, mode, onClose, dispatch }) {
  const [form, setForm] = useState({ description:'', amount:'', category: mode==='income' ? 'salario' : 'outros', type: mode || 'expense', source:'salario' })
  const set = (k,v) => setForm(p => ({...p,[k]:v}))

  function handleDesc(e) {
    const desc = e.target.value
    set('description', desc)
    if (desc.length > 2) set('category', categorize(desc))
  }
  function submit() {
    const amt = parseFloat(form.amount.replace(',','.'))
    if (!form.description.trim() || isNaN(amt) || amt <= 0) return
    dispatch({ type:'ADD_TRANSACTION', month, tx:{ id:uid(), date:new Date().toISOString().slice(0,10), description:form.description.trim(), amount:form.type==='expense'?-amt:amt, category:form.category, type:'manual' } })
    onClose()
  }
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title">Lançamento rápido</div>
        <div className="row gap-8 mb-16">
          {[{t:'expense',l:'↓ Despesa',c:'var(--danger)'},{t:'income',l:'↑ Receita',c:'var(--success)'}].map(({t,l,c}) => (
            <button key={t} className="btn btn-sm flex-1" onClick={() => set('type',t)}
              style={{background:form.type===t?`${c}18`:'var(--bg-elevated)',color:form.type===t?c:'var(--text-secondary)',border:`1.5px solid ${form.type===t?c:'var(--border-md)'}`}}>
              {l}
            </button>
          ))}
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input className="input" placeholder="ex: iFood, Uber, Farmácia…" value={form.description} onChange={handleDesc} autoFocus/>
        </div>
        <div className="form-group">
          <label className="form-label">Valor (R$)</label>
          <input className="input input-mono" placeholder="0,00" value={form.amount} onChange={e => set('amount',e.target.value)} inputMode="decimal"/>
        </div>
        <div className="form-group">
          <label className="form-label">
            Categoria
            {form.description.length>2 && <span className="badge badge-accent" style={{marginLeft:8,fontSize:10}}>auto</span>}
          </label>
          <select className="input" value={form.category} onChange={e => set('category',e.target.value)}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-full" style={{fontSize:15,padding:'15px'}} onClick={submit}>Lançar agora</button>
      </div>
    </div>
  )
}

function SyncBadge({ userId }) {
  if (!isSupabaseConfigured() || !userId) return null
  return (
    <div style={{position:'fixed',top:10,right:10,zIndex:200,background:'var(--success-dim)',border:'1px solid rgba(0,184,148,0.25)',borderRadius:100,padding:'3px 9px',fontSize:10,fontWeight:700,color:'var(--success)',letterSpacing:0.3}}>
      ☁️ sync
    </div>
  )
}

function AppShell({ user, signOut }) {
  const { state, dispatch } = useApp()
  const [tab, setTab]             = useState('home')
  const [showImpulse, setImpulse] = useState(false)
  const [showQuickAdd, setQuick]  = useState(null) // null | 'expense' | 'income'
  const [showConfig, setConfig]   = useState(false)

  const showFAB  = tab === 'home' || tab === 'gastos'
  // Assistente gets full height (no padding for nav padding-bottom)
  const isChat   = tab === 'assistente'

  return (
    <div className="app">
      <SyncBadge userId={user?.id} />

      {showImpulse && <ImpulseOverlay onClose={() => setImpulse(false)} />}
      {showQuickAdd && <QuickAddSheet month={state.activeMonth} mode={showQuickAdd} onClose={() => setQuick(null)} dispatch={dispatch} />}
      {showConfig && (
        <div className="overlay-backdrop" onClick={() => setConfig(false)} style={{zIndex:90}}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"/>
            <Config onSignOut={signOut} />
          </div>
        </div>
      )}

      {/* Screens */}
      {tab === 'home'       && <Home onImpulse={() => setImpulse(true)} onGoToContas={() => setTab('contas')} onGoToMetas={() => setTab('metas')} onOpenConfig={() => setConfig(true)} />}
      {tab === 'contas'     && <Contas />}
      {tab === 'gastos'     && <Gastos />}
      {tab === 'analise'    && <Analise />}
      {tab === 'metas'      && <Metas />}
      {tab === 'assistente' && <Assistente />}

      {showFAB && <FAB onClick={(mode) => setQuick(mode || 'expense')} />}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

function AppContent() {
  const { user, loading, signOut } = useAuth()

  if (loading) return (
    <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:42,marginBottom:12}}>💰</div>
        <div style={{fontSize:13,color:'var(--text-muted)'}}>Carregando…</div>
      </div>
    </div>
  )

  if (isSupabaseConfigured() && !user) return <LoginScreen />

  return (
    <AppProvider userId={user?.id}>
      <AppShell user={user} signOut={signOut} />
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
