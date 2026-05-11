import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { fmt, monthLabel, uid } from '../../utils/format'
import { generateSchedule, getProgress, getNapolesProjection } from '../../utils/napoles'
import { NAPOLES, CHECKLIST_ITEMS } from '../../constants'
import { fetchGoals, upsertGoal, deleteGoal } from '../../lib/sync'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const DEFAULT_GOALS = [
  { title:'Reserva de Emergência', icon:'🛡️', color:'#00B894', target_amount:8000, description:'6 meses de custo de vida', shared:false },
  { title:'Móveis & Porcelanato 407A', icon:'🏠', color:'#6C3AE0', target_amount:15000, description:'Para quando as chaves chegarem', shared:false },
  { title:'Fundo do Carro', icon:'🚗', color:'#F97316', target_amount:60000, description:'Carro próprio — meta de médio prazo', shared:false },
]

function GoalCard({ goal, onDeposit, onDelete }) {
  const pct      = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
  const remaining = goal.target_amount - goal.current_amount
  const [dep, setDep] = useState('')

  function submit() {
    const v = parseFloat(dep.replace(',','.'))
    if (!isNaN(v) && v > 0) { onDeposit(goal, v); setDep('') }
  }

  return (
    <div style={{
      background:'var(--bg-card)', border:`1.5px solid ${goal.color}30`,
      borderRadius:18, padding:'16px', marginBottom:10,
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:42, height:42, borderRadius:13, background:`${goal.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
            {goal.icon}
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>{goal.title}</div>
            {goal.description && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{goal.description}</div>}
          </div>
        </div>
        <button onClick={() => onDelete(goal.id)} style={{ padding:'4px 8px', borderRadius:8, border:'none', background:'var(--danger-dim)', color:'var(--danger)', fontSize:11, cursor:'pointer' }}>×</button>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <div>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>Acumulado</div>
          <div style={{ fontFamily:'DM Mono', fontSize:18, fontWeight:600, color:goal.color }}>{fmt(goal.current_amount)}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>Meta</div>
          <div style={{ fontFamily:'DM Mono', fontSize:18, fontWeight:600 }}>{fmt(goal.target_amount)}</div>
        </div>
      </div>

      <div style={{ height:10, background:'var(--bg-elevated)', borderRadius:100, overflow:'hidden', marginBottom:6 }}>
        <div style={{ height:'100%', width:`${pct}%`, background: pct>=100 ? 'var(--success)' : goal.color, borderRadius:100, transition:'width 0.5s' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:700, color:goal.color }}>{pct}% concluído</span>
        {remaining > 0 && <span style={{ fontSize:11, color:'var(--text-muted)' }}>faltam {fmt(remaining)}</span>}
        {pct >= 100 && <span style={{ fontSize:11, fontWeight:700, color:'var(--success)' }}>🎉 Meta atingida!</span>}
      </div>

      {pct < 100 && (
        <div style={{ display:'flex', gap:8 }}>
          <input className="input input-mono" placeholder="R$ depositar" value={dep}
            onChange={e => setDep(e.target.value)} inputMode="decimal"
            style={{ flex:1, padding:'9px 12px', fontSize:13, borderRadius:10 }}
            onKeyDown={e => e.key==='Enter' && submit()}/>
          <button className="btn btn-primary btn-sm" onClick={submit} style={{ background:goal.color }}>+ Depositar</button>
        </div>
      )}
    </div>
  )
}

function AddGoalSheet({ onClose, onAdd, userId, householdId }) {
  const [form, setForm] = useState({ title:'', icon:'🎯', color:'#6C3AE0', target_amount:'', description:'', shared:false, deadline:'' })
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const ICONS = ['🎯','🛡️','🏠','🚗','✈️','📱','💻','🎓','💍','🐾','🎸','🏋️']
  const COLORS = ['#6C3AE0','#00B894','#F97316','#3B82F6','#EC4899','#F59E0B','#EF4444','#8B5CF6']

  function submit() {
    const amt = parseFloat(form.target_amount.replace(',','.'))
    if (!form.title.trim() || isNaN(amt) || amt <= 0) return
    onAdd({ id: `goal-${Date.now()}`, user_id: userId, household_id: form.shared ? householdId : null,
      title:form.title.trim(), icon:form.icon, color:form.color, target_amount:amt,
      current_amount:0, description:form.description, shared:form.shared,
      deadline:form.deadline||null, active:true, created_at:new Date().toISOString() })
    onClose()
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title">🎯 Nova meta / sonho</div>
        <div className="form-group">
          <label className="form-label">Nome da meta</label>
          <input className="input" placeholder="ex: Viagem Europa, Carro, Celular novo…" value={form.title} onChange={e=>set('title',e.target.value)} autoFocus/>
        </div>
        <div className="form-group">
          <label className="form-label">Valor alvo (R$)</label>
          <input className="input input-mono" placeholder="0,00" value={form.target_amount} onChange={e=>set('target_amount',e.target.value)} inputMode="decimal"/>
        </div>
        <div className="grid-2" style={{gap:12,marginBottom:14}}>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Prazo (opcional)</label>
            <input className="input" type="date" value={form.deadline} onChange={e=>set('deadline',e.target.value)}/>
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Descrição</label>
            <input className="input" placeholder="detalhes…" value={form.description} onChange={e=>set('description',e.target.value)}/>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Ícone</label>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            {ICONS.map(ic=>(
              <button key={ic} onClick={()=>set('icon',ic)} style={{width:38,height:38,borderRadius:9,border:`2px solid ${form.icon===ic?'var(--accent)':'var(--border-md)'}`,background:form.icon===ic?'var(--accent-light)':'var(--bg-elevated)',fontSize:17,cursor:'pointer'}}>{ic}</button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Cor</label>
          <div style={{display:'flex',gap:8}}>
            {COLORS.map(c=>(
              <button key={c} onClick={()=>set('color',c)} style={{width:30,height:30,borderRadius:'50%',background:c,border:`3px solid ${form.color===c?'var(--text)':'transparent'}`,cursor:'pointer'}}/>
            ))}
          </div>
        </div>
        {householdId && (
          <div className="row-between mb-16">
            <div>
              <div style={{fontSize:14,fontWeight:600}}>Meta compartilhada</div>
              <div style={{fontSize:12,color:'var(--text-muted)'}}>Visível para o casal</div>
            </div>
            <button onClick={()=>set('shared',!form.shared)} style={{
              width:44,height:24,borderRadius:100,border:'none',cursor:'pointer',
              background:form.shared?'var(--accent)':'var(--bg-elevated)',
              position:'relative',transition:'background 0.2s',
            }}>
              <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,left:form.shared?23:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
            </button>
          </div>
        )}
        <button className="btn btn-primary btn-full" onClick={submit}>Criar meta</button>
      </div>
    </div>
  )
}

export default function Metas() {
  const { state, dispatch, getSummary } = useApp()
  const { activeMonth } = state
  const [goals, setGoals] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [userId, setUserId] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const schedule   = generateSchedule()
  const prog       = getProgress(schedule)
  const projection = getNapolesProjection()
  const monthCheck = state.checklist[activeMonth] || {}
  const doneCount  = CHECKLIST_ITEMS.filter(i => monthCheck[i.id]).length
  const summary    = getSummary(activeMonth)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id
      setUserId(uid)
      if (!uid) return
      // Check household
      const { data: membership } = await supabase.from('household_members').select('household_id').eq('user_id', uid).single()
      const hhId = membership?.household_id
      setHouseholdId(hhId)
      const loaded = await fetchGoals(uid, hhId)
      if (loaded.length === 0) {
        // Seed default goals
        const defaults = DEFAULT_GOALS.map(g => ({ ...g, id:`goal-${Date.now()}-${Math.random()}`, user_id:uid, household_id:null, current_amount:0, active:true, created_at:new Date().toISOString() }))
        for (const g of defaults) await upsertGoal(g)
        setGoals(defaults)
      } else {
        setGoals(loaded)
      }
    })
  }, [])

  async function handleDeposit(goal, amount) {
    const updated = { ...goal, current_amount: Math.min(goal.target_amount, goal.current_amount + amount) }
    await upsertGoal(updated)
    setGoals(prev => prev.map(g => g.id === goal.id ? updated : g))
  }

  async function handleDelete(id) {
    await deleteGoal(id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  async function handleAdd(goal) {
    await upsertGoal(goal)
    setGoals(prev => [...prev, goal])
  }

  // Surplus chart last 6 months
  const surplusData = Array.from({ length: 6 }, (_,i) => {
    let mk = activeMonth
    for (let j=0;j<5-i;j++) { const [y,m]=mk.split('-').map(Number); const d=new Date(y,m-2,1); mk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
    const s = getSummary(mk)
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const [,mm] = mk.split('-').map(Number)
    return { name: months[mm-1], value: Math.round(s.surplus) }
  })

  return (
    <div className="screen">
      <div className="screen-title">Metas & Sonhos</div>

      {/* Checklist */}
      <div className="card">
        <div className="row-between mb-12">
          <div className="section-label" style={{marginBottom:0}}>🎯 Checklist do mês</div>
          <span className="badge badge-accent">{doneCount}/{CHECKLIST_ITEMS.length}</span>
        </div>
        <div className="prog-track prog-track-lg mb-12">
          <div className="prog-fill" style={{width:`${(doneCount/CHECKLIST_ITEMS.length)*100}%`,background:doneCount===CHECKLIST_ITEMS.length?'var(--success)':'var(--accent)'}}/>
        </div>
        {CHECKLIST_ITEMS.map(item => {
          const done = !!monthCheck[item.id]
          return (
            <div key={item.id} className="check-row" onClick={() => dispatch({type:'TOGGLE_CHECKLIST',month:activeMonth,itemId:item.id})}>
              <div className={`checkmark${done?' done':''}`}>
                {done && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5l3.5 3L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{fontSize:16,flexShrink:0}}>{item.icon}</span>
              <span style={{fontSize:14,color:done?'var(--text-muted)':'var(--text)',textDecoration:done?'line-through':'none',flex:1}}>{item.label}</span>
            </div>
          )
        })}
      </div>

      {/* Surplus chart */}
      <div className="card">
        <div className="section-label">📊 Sobra mensal (6 meses)</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={surplusData} margin={{top:4,right:4,left:-24,bottom:0}}>
            <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:'var(--text-muted)',fontSize:10,fontFamily:'DM Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>Math.abs(v)>=1000?`${(v/1000).toFixed(1)}k`:v}/>
            <Tooltip formatter={v=>fmt(v)} contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--border-strong)',borderRadius:10,fontSize:13}}/>
            <Bar dataKey="value" radius={[5,5,0,0]} maxBarSize={38}>
              {surplusData.map((d,i) => <Cell key={i} fill={d.value>=0?'var(--accent)':'var(--danger)'}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Goals */}
      <div className="row-between mb-12">
        <div className="section-label" style={{marginBottom:0}}>✨ Metas & Sonhos</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Nova meta</button>
      </div>

      {goals.map(g => (
        <GoalCard key={g.id} goal={g} onDeposit={handleDeposit} onDelete={handleDelete}/>
      ))}

      {/* Nápoles */}
      <div style={{background:'linear-gradient(135deg,#1a0533,#0f172a)',borderRadius:22,padding:'18px',marginBottom:12,boxShadow:'0 4px 20px rgba(108,58,224,0.18)'}}>
        <div className="row-between mb-10">
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1}}>🏗️ Nápoles 407A</div>
          <span style={{background:'rgba(167,139,250,0.2)',color:'#C4B5FD',fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:100}}>
            {prog.paid}/48 pagas
          </span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          {[
            {l:'Entrega contratual',v:'31/Jul/2028'},
            {l:'Parcela base',v:fmt(NAPOLES.monthlyBase)+'/mês'},
            {l:'Financiamento Caixa',v:fmt(NAPOLES.caixaFinancing)},
            {l:'Próximo reforço',v:'R$2.000 em Dez/26'},
          ].map((s,i) => (
            <div key={i} style={{background:'rgba(255,255,255,0.06)',borderRadius:10,padding:'8px 10px'}}>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',marginBottom:2}}>{s.l}</div>
              <div style={{fontFamily:'DM Mono',fontSize:12,fontWeight:500,color:'white'}}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{height:6,background:'rgba(255,255,255,0.1)',borderRadius:100,overflow:'hidden',marginBottom:6}}>
          <div style={{height:'100%',width:`${(prog.paid/48)*100}%`,background:'#A78BFA',borderRadius:100,transition:'width 0.5s'}}/>
        </div>
        <button style={{width:'100%',padding:'9px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'rgba(255,255,255,0.6)',fontSize:12,cursor:'pointer',fontFamily:'DM Sans'}}
          onClick={()=>setScheduleOpen(v=>!v)}>
          {scheduleOpen?'▲ Fechar cronograma':'▼ Ver 48 parcelas completas'}
        </button>
        {scheduleOpen && (
          <div style={{maxHeight:280,overflowY:'auto',marginTop:10}}>
            {projection.map(p => (
              <div key={p.month} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.06)',opacity:p.month<new Date().toISOString().slice(0,7)?0.4:1}}>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.6)'}}>{p.label} — {p.number}/48</span>
                <span style={{fontFamily:'DM Mono',fontSize:11,color:p.isObraPhase?'#FCD34D':'#A78BFA'}}>{fmt(p.entrada)}{p.reforco>0?` + ${fmt(p.reforco)}`:''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddGoalSheet onClose={()=>setShowAdd(false)} onAdd={handleAdd} userId={userId} householdId={householdId}/>}
    </div>
  )
}
