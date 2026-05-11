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
import Casal from './components/screens/Casal'
import Config from './components/screens/Config'
import { categorize } from './utils/categorizer'
import { uid } from './utils/format'
import { CATEGORIES, INCOME_SOURCES } from './constants'

/* ─── Loading screen ─── */
function LoadingScreen({ message }) {
  return (
    <div style={{
      height:'100%', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'var(--bg)', gap:16,
    }}>
      <div style={{fontSize:44}}>💰</div>
      <div style={{fontSize:14,color:'var(--text-secondary)',fontWeight:600}}>{message || 'Carregando...'}</div>
      <div style={{
        width:40, height:4, background:'var(--accent-light)',
        borderRadius:100, overflow:'hidden',
      }}>
        <div style={{
          height:'100%', width:'40%', background:'var(--accent)',
          borderRadius:100,
          animation:'loading-bar 1.2s ease-in-out infinite',
        }}/>
      </div>
      <style>{`
        @keyframes loading-bar {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(150%); }
          100% { transform: translateX(150%); }
        }
      `}</style>
    </div>
  )
}

/* ─── Quick add sheet ─── */
function QuickAddSheet({ month, onClose, dispatch }) {
  const [form, setForm] = useState({ description:'', amount:'', category:'outros', type:'expense', source:'salario' })
  const set = (k,v) => setForm(p => ({...p,[k]:v}))

  function handleDesc(e) {
    const desc = e.target.value; set('description', desc)
    if (desc.length > 2) set('category', categorize(desc, form.type==='expense'?-1:1))
  }
  function submit() {
    const amt = parseFloat(form.amount.replace(',','.'))
    if (!form.description.trim() || isNaN(amt) || amt <= 0) return
    dispatch({ type:'ADD_TRANSACTION', month, tx:{
      id: uid(), date: new Date().toISOString().slice(0,10),
      description: form.description.trim(),
      amount: form.type==='expense' ? -amt : amt,
      category: form.type==='income' ? form.source : form.category,
      exclude: false, type:'manual',
    }})
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
              style={{background:form.type===t?`${c}15`:'var(--bg-elevated)',color:form.type===t?c:'var(--text-secondary)',border:`1.5px solid ${form.type===t?c:'var(--border-md)'}`}}>
              {l}
            </button>
          ))}
        </div>
        {form.type==='income' && (
          <div className="form-group">
            <label className="form-label">Fonte</label>
            <div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:4}}>
              {INCOME_SOURCES.map(src => (
                <button key={src.id} onClick={() => { set('source',src.id); set('description',src.name) }}
                  style={{padding:'6px 12px',borderRadius:100,fontSize:12,fontWeight:600,border:`1.5px solid ${form.source===src.id?src.color:'var(--border-md)'}`,background:form.source===src.id?`${src.color}15`:'var(--bg-elevated)',color:form.source===src.id?src.color:'var(--text-secondary)',cursor:'pointer'}}>
                  {src.icon} {src.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input className="input" placeholder={form.type==='income'?'ex: Aula UNOPAR, Convite digital…':'ex: iFood, Uber, Farmácia…'} value={form.description} onChange={handleDesc} autoFocus/>
        </div>
        <div className="form-group">
          <label className="form-label">Valor (R$)</label>
          <input className="input input-mono" placeholder="0,00" value={form.amount} onChange={e => set('amount',e.target.value)} inputMode="decimal"/>
        </div>
        {form.type==='expense' && (
          <div className="form-group">
            <label className="form-label">Categoria {form.description.length>2&&<span className="badge badge-accent" style={{marginLeft:8,fontSize:10}}>auto</span>}</label>
            <select className="input" value={form.category} onChange={e => set('category',e.target.value)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        )}
        <button className="btn btn-full btn-primary" style={{fontSize:15,padding:'15px',background:form.type==='income'?'var(--success)':undefined}} onClick={submit}>
          Lançar agora
        </button>
      </div>
    </div>
  )
}

/* ─── Sync badge ─── */
function SyncBadge({ syncing }) {
  if (!isSupabaseConfigured()) return null
  return (
    <div style={{
      position:'fixed', top:10, right:10, zIndex:200,
      background: syncing ? 'rgba(245,158,11,0.15)' : 'rgba(0,184,148,0.12)',
      border:`1px solid ${syncing ? 'rgba(245,158,11,0.3)' : 'rgba(0,184,148,0.25)'}`,
      borderRadius:100, padding:'3px 9px',
      fontSize:10, fontWeight:700,
      color: syncing ? 'var(--warning)' : 'var(--success)',
    }}>
      {syncing ? '⏳ salvando…' : '☁️ sincronizado'}
    </div>
  )
}

/* ─── Main app shell ─── */
function AppShell({ user, signOut }) {
  const { state, dispatch, loading, syncing, resetAndReseed } = useApp()
  const [tab, setTab]             = useState('home')
  const [showImpulse, setImpulse] = useState(false)
  const [showQuickAdd, setQuick]  = useState(null)
  const [showConfig, setConfig]   = useState(false)

  if (loading) return <LoadingScreen message="Carregando seus dados…"/>

  return (
    <div className="app">
      <SyncBadge syncing={syncing}/>

      {showImpulse && <ImpulseOverlay onClose={() => setImpulse(false)}/>}
      {showQuickAdd && (
        <QuickAddSheet month={state.activeMonth} mode={showQuickAdd} onClose={() => setQuick(null)} dispatch={dispatch}/>
      )}
      {showConfig && (
        <div className="overlay-backdrop" onClick={() => setConfig(false)} style={{zIndex:90}}>
          <div className="sheet" style={{paddingBottom:40}} onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"/>
            <Config onSignOut={signOut} onReset={resetAndReseed}/>
          </div>
        </div>
      )}

      {tab==='home'       && <Home onImpulse={() => setImpulse(true)} onGoToContas={() => setTab('contas')} onOpenConfig={() => setConfig(true)}/>}
      {tab==='contas'     && <Contas/>}
      {tab==='gastos'     && <Gastos/>}
      {tab==='analise'    && <Analise/>}
      {tab==='metas'      && <Metas/>}
      {tab==='assistente' && <Assistente/>}
      {tab==='casal'      && <Casal/>}

      {(tab==='home'||tab==='gastos') && <FAB onClick={(mode) => setQuick(mode||'expense')}/>}
      <BottomNav active={tab} onChange={setTab}/>
    </div>
  )
}

/* ─── Auth gate ─── */
function AppContent() {
  const { user, loading, signOut } = useAuth()

  if (loading) return <LoadingScreen message="Verificando login…"/>
  if (isSupabaseConfigured() && !user) return <LoginScreen/>

  return (
    <AppProvider userId={user?.id}>
      <AppShell user={user} signOut={signOut}/>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent/>
    </AuthProvider>
  )
}
