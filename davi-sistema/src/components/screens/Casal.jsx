import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { fmt, monthLabel, prevMonth } from '../../utils/format'
import { CATEGORIES } from '../../constants'
import {
  createHousehold, joinHousehold, getMyHousehold,
  getHouseholdMembers, getPartnerTransactions,
} from '../../lib/sync'
import { supabase } from '../../lib/supabase'
import MonthSelector from '../MonthSelector'

const AVATARS = ['😎','🦸','🧑','👨','👩','🧔','👱','🐱','🦊','🌟']
const COLORS  = ['#6C3AE0','#00B894','#F97316','#3B82F6','#EC4899','#F59E0B']

/* ─── Setup screen ─── */
function SetupScreen({ userId, onDone }) {
  const [step, setStep]         = useState('choice') // choice | create | join
  const [name, setName]         = useState('')
  const [code, setCode]         = useState('')
  const [avatar, setAvatar]     = useState('😎')
  const [color, setColor]       = useState('#6C3AE0')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [inviteCode, setInviteCode] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    const hh = await createHousehold(userId, name.trim(), color, avatar)
    if (!hh) { setError('Erro ao criar. Tente novamente.'); setLoading(false); return }
    setInviteCode(hh.invite_code)
    setStep('created')
    setLoading(false)
  }

  async function handleJoin() {
    if (!name.trim() || !code.trim()) return
    setLoading(true)
    const result = await joinHousehold(userId, code.trim(), name.trim(), color, avatar)
    if (result.error) { setError(result.error); setLoading(false); return }
    setLoading(false)
    onDone()
  }

  if (step === 'created') {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 50, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Grupo criado!</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
          Mande esse código para o Vicente entrar no app e digitar em "Entrar em grupo existente":
        </div>
        <div style={{
          background: 'var(--accent-light)', border: '2px solid var(--accent)',
          borderRadius: 16, padding: '20px', marginBottom: 24,
        }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: 36, fontWeight: 700, letterSpacing: 8, color: 'var(--accent)' }}>
            {inviteCode}
          </div>
        </div>
        <button
          className="btn btn-primary btn-full"
          onClick={() => { navigator.clipboard?.writeText(inviteCode); onDone() }}
        >
          📋 Copiar código e entrar
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>💑</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Modo casal</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Vincula sua conta com a do Vicente para ter uma visão financeira conjunta.
        </div>
      </div>

      {step === 'choice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary btn-full" style={{ padding: 16, fontSize: 15 }}
            onClick={() => setStep('create')}>
            ✨ Criar grupo (você convida o Vicente)
          </button>
          <button className="btn btn-ghost btn-full" style={{ padding: 16, fontSize: 15 }}
            onClick={() => setStep('join')}>
            🔗 Entrar em grupo existente
          </button>
        </div>
      )}

      {(step === 'create' || step === 'join') && (
        <div>
          <button className="btn btn-ghost btn-sm mb-16" onClick={() => { setStep('choice'); setError('') }}>← Voltar</button>

          <div className="form-group">
            <label className="form-label">Seu nome no grupo</label>
            <input className="input" placeholder="ex: Davi" value={name} onChange={e => setName(e.target.value)} autoFocus/>
          </div>

          {step === 'join' && (
            <div className="form-group">
              <label className="form-label">Código do grupo</label>
              <input className="input input-mono" placeholder="ABC123" value={code}
                onChange={e => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: 4, fontSize: 18 }}/>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Seu avatar</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AVATARS.map(a => (
                <button key={a} onClick={() => setAvatar(a)} style={{
                  width: 40, height: 40, borderRadius: 12, fontSize: 20, border: `2px solid ${avatar === a ? 'var(--accent)' : 'var(--border-md)'}`,
                  background: avatar === a ? 'var(--accent-light)' : 'var(--bg-elevated)', cursor: 'pointer',
                }}>{a}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sua cor</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 34, height: 34, borderRadius: '50%', background: c, border: `3px solid ${color === c ? 'var(--text)' : 'transparent'}`, cursor: 'pointer',
                }}/>
              ))}
            </div>
          </div>

          {error && <div className="alert alert-danger mb-12"><span className="alert-icon">❌</span>{error}</div>}

          <button className="btn btn-primary btn-full" style={{ fontSize: 15, padding: 14 }}
            onClick={step === 'create' ? handleCreate : handleJoin}
            disabled={loading || !name.trim() || (step === 'join' && !code.trim())}>
            {loading ? '⏳ Aguarde…' : step === 'create' ? 'Criar grupo' : 'Entrar no grupo'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Summary card per member ─── */
function MemberCard({ member, txs, month }) {
  const expenses = Object.values(txs).flat()
    .filter(t => {
      const [y,m] = month.split('-').map(Number)
      const [ty,tm] = t.date.split('-').map(Number)
      return ty === y && tm === m && t.amount < 0
        && !['rdb_aplicacao','rdb_resgate','empresa_encerrada','estorno'].includes(t.category)
        && !t.exclude
    })
  const salary = Object.values(txs).flat()
    .filter(t => {
      const [y,m] = month.split('-').map(Number)
      const [ty,tm] = t.date.split('-').map(Number)
      return ty === y && tm === m && t.category === 'salario'
    })
  const totalExp = expenses.reduce((s,t) => s+Math.abs(t.amount), 0)
  const totalInc = salary.reduce((s,t) => s+t.amount, 0)
  const surplus  = totalInc - totalExp

  // Top categories
  const catMap = {}
  expenses.forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + Math.abs(t.amount)
  })
  const topCats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,3)

  return (
    <div style={{
      background: 'var(--bg-card)', border: `2px solid ${member.color}30`,
      borderRadius: 18, padding: '16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 14,
          background: `${member.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, border: `2px solid ${member.color}40`,
        }}>{member.avatar}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{member.display_name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{monthLabel(month)}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: 18, fontWeight: 600, color: surplus >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {fmt(surplus)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>saldo do mês</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { l: 'Recebeu', v: fmt(totalInc), c: 'var(--success)' },
          { l: 'Gastou',  v: fmt(totalExp), c: 'var(--danger)' },
        ].map((s,i) => (
          <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{s.l}</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 14, fontWeight: 600, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {topCats.length > 0 && (
        <div>
          {topCats.map(([catId, total]) => {
            const cat = CATEGORIES.find(c=>c.id===catId) || { icon:'📦', name: catId, color:'#94A3B8' }
            return (
              <div key={catId} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:15 }}>{cat.icon}</span>
                <span style={{ flex:1, fontSize:12, color:'var(--text-secondary)' }}>{cat.name}</span>
                <span style={{ fontFamily:'DM Mono', fontSize:12, color:'var(--text)' }}>{fmt(total)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── MAIN CASAL SCREEN ─── */
export default function Casal() {
  const { state, dispatch, getSummary } = useApp()
  const { activeMonth } = state
  const [household, setHousehold] = useState(null)
  const [members, setMembers] = useState([])
  const [partnerTxs, setPartnerTxs] = useState({})
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id
      setUserId(uid)
      if (!uid) { setLoading(false); return }
      getMyHousehold(uid).then(async hh => {
        if (!hh) { setLoading(false); return }
        setHousehold(hh)
        const mems = await getHouseholdMembers(hh.id)
        setMembers(mems)
        const pTxs = await getPartnerTransactions(hh.id, uid)
        setPartnerTxs(pTxs)
        setLoading(false)
      })
    })
  }, [])

  if (loading) {
    return (
      <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>💑</div>
          <div style={{ fontSize:13, color:'var(--text-muted)' }}>Carregando…</div>
        </div>
      </div>
    )
  }

  if (!household) {
    return <SetupScreen userId={userId} onDone={() => { setLoading(true); window.location.reload() }}/>
  }

  // Combined summary
  const myS = getSummary(activeMonth)
  const partnerMonthTxs = (partnerTxs[activeMonth] || [])
  const partnerExp = partnerMonthTxs.filter(t=>t.amount<0&&!t.exclude&&!['rdb_aplicacao','rdb_resgate','empresa_encerrada'].includes(t.category)).reduce((s,t)=>s+Math.abs(t.amount),0)
  const partnerInc = partnerMonthTxs.filter(t=>t.category==='salario').reduce((s,t)=>s+t.amount,0)
  const totalExp   = myS.expenses + partnerExp
  const totalInc   = myS.totalIncome + partnerInc

  const myMember      = members.find(m=>m.user_id===userId) || { display_name:'Eu', avatar:'🙂', color:'#6C3AE0', user_id:userId }
  const partnerMember = members.find(m=>m.user_id!==userId)

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:2 }}>
            💑 {members.map(m=>m.display_name).join(' & ')}
          </div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.5px' }}>Visão Casal</div>
        </div>
        <div style={{
          background:'var(--accent-light)', border:'1px solid var(--accent-border)',
          borderRadius:100, padding:'4px 12px', fontSize:11, fontWeight:700, color:'var(--accent)',
        }}>
          🔗 Vinculados
        </div>
      </div>

      <MonthSelector month={activeMonth} onChange={m => dispatch({type:'SET_MONTH',month:m})}/>

      {/* Combined hero */}
      <div style={{
        background:'linear-gradient(135deg,#1a0a3d 0%,#0d1a3a 100%)',
        borderRadius:24, padding:'20px', marginBottom:12,
        boxShadow:'0 8px 24px rgba(108,58,224,0.2)',
      }}>
        <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>
          Financeiro combinado — {monthLabel(activeMonth)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          {[
            { l:'Receita total', v:`+${fmt(totalInc)}`, c:'#4ADE80' },
            { l:'Gastos totais', v:`-${fmt(totalExp)}`, c:'#F87171' },
          ].map((s,i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.07)', borderRadius:12, padding:'12px' }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:3 }}>{s.l}</div>
              <div style={{ fontFamily:'DM Mono', fontSize:16, fontWeight:600, color:s.c }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Member bars */}
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>Proporção dos gastos</div>
        <div style={{ height:8, background:'rgba(255,255,255,0.1)', borderRadius:100, overflow:'hidden', display:'flex' }}>
          {totalExp > 0 && (
            <>
              <div style={{ height:'100%', width:`${(myS.expenses/totalExp)*100}%`, background:myMember.color, transition:'width 0.5s' }}/>
              {partnerMember && <div style={{ height:'100%', flex:1, background:partnerMember.color, opacity:0.8 }}/>}
            </>
          )}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
          <span style={{ fontSize:10, color:myMember.color, fontWeight:600 }}>
            {myMember.avatar} {myMember.display_name}: {totalExp > 0 ? Math.round((myS.expenses/totalExp)*100) : 0}%
          </span>
          {partnerMember && (
            <span style={{ fontSize:10, color:partnerMember.color, fontWeight:600 }}>
              {partnerMember.avatar} {partnerMember.display_name}: {totalExp > 0 ? Math.round((partnerExp/totalExp)*100) : 0}%
            </span>
          )}
        </div>
      </div>

      {/* Individual cards */}
      <div style={{ marginBottom:8, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'var(--text-muted)' }}>
        Individual
      </div>

      <MemberCard member={myMember} txs={{ ...state.transactions }} month={activeMonth}/>

      {partnerMember ? (
        <MemberCard member={partnerMember} txs={partnerTxs} month={activeMonth}/>
      ) : (
        <div className="card" style={{ textAlign:'center', padding:'24px 20px' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>⏳</div>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>Aguardando Vicente</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6, marginBottom:16 }}>
            Compartilhe o código abaixo para o Vicente entrar:
          </div>
          <div style={{
            background:'var(--accent-light)', border:'2px solid var(--accent)',
            borderRadius:14, padding:'14px', marginBottom:12,
          }}>
            <div style={{ fontFamily:'DM Mono', fontSize:28, fontWeight:700, letterSpacing:6, color:'var(--accent)' }}>
              {household.invite_code}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-full"
            onClick={() => navigator.clipboard?.writeText(household.invite_code)}>
            📋 Copiar código
          </button>
        </div>
      )}
    </div>
  )
}
