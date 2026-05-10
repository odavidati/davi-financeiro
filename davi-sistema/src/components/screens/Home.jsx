import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import MonthSelector from '../MonthSelector'
import { NAPOLES, USER, INCOME_SOURCES, CATEGORIES } from '../../constants'
import { fmt, uid, monthLabel } from '../../utils/format'
import { parseInput, txConfirmation } from '../../utils/nlpParser'
import { callAI, extractText } from '../../lib/ai'
import { isSupabaseConfigured } from '../../lib/supabase'

/* ─── Balance ring ─── */
function Ring({ pct }) {
  const r = 46, circ = 2 * Math.PI * r
  const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#A78BFA'
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" style={{flexShrink:0}}>
      <circle cx="55" cy="55" r={r} fill="rgba(255,255,255,0.04)" stroke="transparent"/>
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8"/>
      <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${(Math.min(pct,100)/100)*circ} ${circ}`}
        strokeLinecap="round" transform="rotate(-90 55 55)"
        style={{transition:'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1),stroke 0.3s'}}/>
      <text x="55" y="51" textAnchor="middle" fill={color} fontSize="19" fontFamily="DM Mono" fontWeight="500">{pct}%</text>
      <text x="55" y="66" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="DM Sans" fontWeight="700" letterSpacing="1">GASTO</text>
    </svg>
  )
}

/* ─── Transaction result card ─── */
function TxResult({ txs }) {
  return (
    <div style={{marginTop:8,padding:'10px 12px',background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:12}}>
      <div style={{fontSize:12,fontWeight:700,color:'#4ADE80',marginBottom:txs.length>1?6:0}}>
        ✅ {txs.length > 1 ? `${txs.length} lançamentos registrados!` : 'Registrado!'}
      </div>
      {txs.map((tx,i) => {
        const isInc = tx.amount > 0
        const cat   = isInc ? INCOME_SOURCES.find(s=>s.id===tx.category) : CATEGORIES.find(c=>c.id===tx.category)
        return (
          <div key={i} style={{display:'flex',alignItems:'center',gap:8,paddingTop:i>0?6:4,borderTop:i>0?'1px solid rgba(255,255,255,0.06)':'none'}}>
            <span style={{fontSize:14}}>{cat?.icon||'📦'}</span>
            <span style={{flex:1,fontSize:12,color:'rgba(255,255,255,0.8)'}}>{tx.description}</span>
            <span style={{fontFamily:'DM Mono',fontSize:13,fontWeight:600,color:isInc?'#4ADE80':'#F87171'}}>
              {isInc?'+':'-'}{fmt(Math.abs(tx.amount))}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── AI Quick Widget ─── */
const CHIPS = [
  {label:'Uber',    text:'paguei X no uber'},
  {label:'iFood',   text:'gastei X no ifood'},
  {label:'Psico',   text:'paguei 70 na psicóloga'},
  {label:'Aula',    text:'recebi X da aula UNOPAR'},
  {label:'Convite', text:'recebi X de convite digital'},
  {label:'Saldo?',  text:'quanto sobrou esse mês?'},
]

function AIWidget({ activeMonth, dispatch, getSummary, getByCategory }) {
  const [input, setInput]     = useState('')
  const [status, setStatus]   = useState('idle') // idle|loading|done|error
  const [result, setResult]   = useState(null)
  const [lastTxs, setLastTxs] = useState([])
  const inputRef = useRef(null)

  // Build context for AI questions (only when API available)
  function buildAISystem(summary, cats) {
    const catLines = cats.map(c=>`- ${c.name}: ${fmt(c.total)}`).join('\n')
    return `Assistente financeiro do DAVI DA SILVA RAMOS, Canoas/RS.
Renda CLT: R$3.390. Comprando Nápoles 407A (48x R$927,98+INCC, jun/2026).
Novas fontes: aulas UNOPAR Gravataí, convites digitais, freelas.

Mês ${monthLabel(activeMonth)}: Saldo ${fmt(summary.surplus)} (${summary.pct}% comprometido)
${catLines}

Responda de forma direta, curta e humana. Máximo 3 linhas. Sem enrolação.
NÃO retorne JSON — apenas texto normal.`
  }

  async function send(text) {
    const msg = (text || input).trim()
    if (!msg || status === 'loading') return
    setInput('')
    setStatus('loading')
    setResult(null)

    try {
      // 1. Try local parser first (always works, no API needed)
      const parsed = parseInput(msg)

      if (parsed.type === 'tx') {
        dispatch({ type:'ADD_TRANSACTION', month:activeMonth, tx:parsed.tx })
        setLastTxs([parsed.tx])
        setResult({ type:'txs', txs:[parsed.tx] })
        setStatus('done')

      } else if (parsed.type === 'txs') {
        parsed.txs.forEach(tx => dispatch({ type:'ADD_TRANSACTION', month:activeMonth, tx }))
        setLastTxs(parsed.txs)
        setResult({ type:'txs', txs:parsed.txs })
        setStatus('done')

      } else if (parsed.type === 'question') {
        // Questions need AI — check if configured
        if (!isSupabaseConfigured()) {
          setResult({ type:'reply', text:'💡 Para perguntas financeiras, configure o Supabase + Anthropic API. Para lançar gastos, continue digitando normalmente!' })
          setStatus('done')
        } else {
          const summary = getSummary(activeMonth)
          const cats    = getByCategory(activeMonth)
          const system  = buildAISystem(summary, cats)
          const data    = await callAI([{role:'user',content:msg}], system, 400)
          const reply   = extractText(data) || 'Não consegui responder.'
          setResult({ type:'reply', text:reply })
          setStatus('done')
        }
      } else {
        // Unknown — try to be helpful
        setResult({ type:'reply', text:'Não entendi. Tente: "paguei 45 uber", "recebi 300 de aula" ou "quanto sobrou?"' })
        setStatus('done')
      }
    } catch(e) {
      setResult({ type:'reply', text:'Algo deu errado. Tente de novo.' })
      setStatus('error')
    }

    setTimeout(() => { setStatus('idle'); setResult(null) }, 7000)
  }

  function undo() {
    lastTxs.forEach(tx => dispatch({ type:'DELETE_TRANSACTION', month:activeMonth, id:tx.id }))
    setLastTxs([])
    setResult({ type:'reply', text:'↩️ Desfeito.' })
    setTimeout(() => setResult(null), 3000)
  }

  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--border-md)',
      borderRadius:20, padding:'14px 14px 12px', marginBottom:12,
      boxShadow:'var(--shadow-md)',
    }}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <div style={{width:28,height:28,borderRadius:9,background:'var(--accent-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>
          {status==='loading' ? '⌛' : '🤖'}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>Lançamento rápido</div>
          <div style={{fontSize:10,color:'var(--text-muted)'}}>Digite como você fala — funciona sem internet</div>
        </div>
        {lastTxs.length > 0 && (
          <button onClick={undo} style={{padding:'4px 10px',borderRadius:100,border:'1px solid var(--border-md)',background:'var(--bg-elevated)',fontSize:11,fontWeight:600,color:'var(--text-secondary)',cursor:'pointer'}}>
            ↩ Desfazer
          </button>
        )}
      </div>

      {/* Input row */}
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
        <input
          ref={inputRef}
          className="input"
          placeholder='"paguei 45 uber"  ·  "recebi 300 aula"  ·  "saldo?"'
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key==='Enter') send() }}
          disabled={status==='loading'}
          style={{flex:1,padding:'10px 13px',fontSize:13,borderRadius:12}}
        />
        <button onClick={() => send()} disabled={!input.trim()||status==='loading'} style={{
          width:38,height:38,borderRadius:11,flexShrink:0,border:'none',
          background:(!input.trim()||status==='loading')?'var(--bg-elevated)':'var(--accent)',
          color:(!input.trim()||status==='loading')?'var(--text-muted)':'white',
          fontSize:18,cursor:status==='loading'?'wait':(!input.trim()?'default':'pointer'),
          display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',
        }}>↑</button>
      </div>

      {/* Quick chips */}
      <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none',paddingBottom:2}}>
        {CHIPS.map((c,i) => (
          <button key={i} onClick={() => { setInput(c.text); inputRef.current?.focus() }}
            style={{padding:'5px 11px',borderRadius:100,border:'1px solid var(--border-md)',background:'var(--bg-elevated)',fontSize:11,fontWeight:600,color:'var(--text-secondary)',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Result */}
      {result && (
        result.type === 'txs'
          ? <TxResult txs={result.txs}/>
          : (
            <div style={{marginTop:8,padding:'10px 12px',background:result.type==='error'?'var(--danger-dim)':'var(--accent-light)',border:`1px solid ${result.type==='error'?'rgba(239,68,68,0.2)':'var(--accent-border)'}`,borderRadius:12}}>
              <div style={{fontSize:13,color:result.type==='error'?'var(--danger)':'var(--text)',lineHeight:1.5}}>{result.text}</div>
            </div>
          )
      )}
    </div>
  )
}

/* ─── MAIN HOME ─── */
export default function Home({ onImpulse, onGoToContas, onOpenConfig }) {
  const { state, dispatch, getSummary, getByCategory, getBillsSummary, getInstallmentsForMonth } = useApp()
  const { activeMonth } = state
  const summary  = getSummary(activeMonth)
  const cats     = getByCategory(activeMonth)
  const bills    = getBillsSummary(activeMonth)
  const installs = (getInstallmentsForMonth ? getInstallmentsForMonth(activeMonth) : []).filter(i => !i.isPaid)
  const top3     = cats.slice(0,3)

  return (
    <div className="screen">
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
        <div>
          <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:2}}>Olá, Davi 👋</div>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:'-0.5px',lineHeight:1}}>Financeiro</div>
        </div>
        <button onClick={onOpenConfig} style={{width:40,height:40,borderRadius:14,background:'var(--bg-card)',border:'1px solid var(--border-md)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,cursor:'pointer',boxShadow:'var(--shadow-sm)'}}>
          ⚙️
        </button>
      </div>

      <MonthSelector month={activeMonth} onChange={m => dispatch({type:'SET_MONTH',month:m})}/>

      {/* Balance hero */}
      <div style={{background:'linear-gradient(135deg,#1a0a3d 0%,#0d1a3a 50%,#060810 100%)',borderRadius:24,padding:'20px',marginBottom:12,boxShadow:'0 8px 32px rgba(108,58,224,0.2)',border:'1px solid rgba(108,58,224,0.18)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:200,height:200,background:'radial-gradient(circle,rgba(108,58,224,0.1) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:1.2,marginBottom:6}}>Saldo disponível</div>
            <div style={{fontFamily:'DM Mono',fontSize:Math.abs(summary.surplus)>=10000?24:30,fontWeight:500,letterSpacing:-1,lineHeight:1,marginBottom:6,color:summary.surplus>=0?'#4ADE80':'#F87171'}}>
              {fmt(summary.surplus)}
            </div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:summary.pct>=70?12:0}}>
              {summary.variableIncome>0 ? <>CLT {fmt(USER.netIncome)} + {fmt(summary.variableIncome)} extras</> : <>de {fmt(USER.netIncome)} CLT/mês</>}
            </div>
            {summary.pct >= 70 && (
              <div style={{padding:'8px 11px',borderRadius:10,background:summary.pct>=90?'rgba(239,68,68,0.18)':'rgba(245,158,11,0.14)',border:`1px solid ${summary.pct>=90?'rgba(239,68,68,0.3)':'rgba(245,158,11,0.25)'}`,fontSize:12,fontWeight:600,color:summary.pct>=90?'#FCA5A5':'#FCD34D'}}>
                {summary.pct>=90?`🚨 ${summary.pct}% comprometido — corte agora`:`⚠️ ${summary.pct}% comprometido`}
              </div>
            )}
          </div>
          <Ring pct={summary.pct}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:14}}>
          <div style={{background:'rgba(255,255,255,0.06)',borderRadius:12,padding:'10px 12px'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginBottom:3}}>
              Despesas{summary.hasTx ? '' : ' (est.)'}
            </div>
            <div style={{fontFamily:'DM Mono',fontSize:13,fontWeight:500,color:'#F87171'}}>
              -{fmt(summary.hasTx ? summary.expenses : summary.fixedBudget)}
            </div>
          </div>
          <div style={{background:'rgba(255,255,255,0.06)',borderRadius:12,padding:'10px 12px'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginBottom:3}}>
              Receita total
            </div>
            <div style={{fontFamily:'DM Mono',fontSize:13,fontWeight:500,color:'#4ADE80'}}>
              +{fmt(summary.totalIncome)}
            </div>
          </div>
        </div>
      </div>

      {/* AI widget */}
      <AIWidget activeMonth={activeMonth} dispatch={dispatch} getSummary={getSummary} getByCategory={getByCategory}/>

      {/* Bills shortcut */}
      {bills.allBills.length > 0 && (
        <button onClick={onGoToContas} style={{background:'var(--bg-card)',border:`1.5px solid ${bills.allPaid?'rgba(0,184,148,0.3)':'var(--border-md)'}`,borderRadius:18,padding:'14px 16px',marginBottom:12,width:'100%',textAlign:'left',cursor:'pointer',boxShadow:'var(--shadow-sm)',display:'block'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:bills.allPaid?'var(--success)':'var(--text)',marginBottom:3}}>
                {bills.allPaid?'✅ Todas as contas pagas!':`📋 ${bills.unpaid.length} conta${bills.unpaid.length>1?'s':''} pendente${bills.unpaid.length>1?'s':''}`}
              </div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>
                {bills.allPaid?`Total pago: ${fmt(bills.totalPaid)}`:`Falta pagar ${fmt(bills.totalUnpaid)}`}
              </div>
            </div>
            <div style={{fontFamily:'DM Mono',fontSize:15,fontWeight:700,color:bills.allPaid?'var(--success)':'var(--accent)'}}>{bills.pct}% →</div>
          </div>
        </button>
      )}

      {/* Pending installments */}
      {installs.length > 0 && (
        <div style={{background:'var(--bg-card)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:18,padding:'14px 16px',marginBottom:12,boxShadow:'var(--shadow-sm)'}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--warning)',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>📅 Parcelamentos do mês</div>
          {installs.map(inst => (
            <div key={inst.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:18}}>{inst.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{inst.description}</div>
                <div style={{fontSize:11,color:'var(--text-muted)'}}>{inst.number}/{inst.totalInstallments}ª parcela</div>
              </div>
              <div style={{fontFamily:'DM Mono',fontSize:14,fontWeight:600,color:'var(--warning)'}}>-{fmt(inst.installmentAmount)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top categories */}
      {top3.length > 0 && (
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:18,padding:'16px',marginBottom:12,boxShadow:'var(--shadow-sm)'}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'var(--text-muted)',marginBottom:12}}>Maiores gastos</div>
          {top3.map(cat => {
            const pct=Math.min(100,Math.round((cat.total/(cat.budget||1))*100))
            const over=cat.total>cat.budget
            return (
              <div key={cat.id} style={{marginBottom:11}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <span style={{fontSize:16}}>{cat.icon}</span>
                    <span style={{fontSize:13,fontWeight:600}}>{cat.name}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontFamily:'DM Mono',fontSize:12,color:over?'var(--danger)':'var(--text-secondary)'}}>{fmt(cat.total)}</span>
                    {over&&<span style={{fontSize:10,fontWeight:700,color:'var(--danger)',background:'var(--danger-dim)',padding:'2px 7px',borderRadius:100}}>+{Math.round(((cat.total/cat.budget)-1)*100)}%</span>}
                  </div>
                </div>
                <div style={{height:5,background:'var(--bg-elevated)',borderRadius:100,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:over?'var(--danger)':cat.color,borderRadius:100,transition:'width 0.5s ease'}}/>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Nápoles mini */}
      <div style={{background:'linear-gradient(135deg,#1a0533,#0f172a)',borderRadius:20,padding:'15px 16px',marginBottom:12,position:'relative',overflow:'hidden',boxShadow:'0 4px 20px rgba(108,58,224,0.15)'}}>
        <div style={{position:'absolute',right:12,bottom:6,fontSize:56,opacity:0.07}}>🏗️</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
          <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:1}}>🏗️ Nápoles 407A</div>
          <span style={{fontSize:10,fontWeight:700,color:'#A78BFA',background:'rgba(167,139,250,0.15)',padding:'3px 9px',borderRadius:100}}>Jul/2028</span>
        </div>
        <div style={{fontSize:14,fontWeight:700,color:'white',marginBottom:2}}>48x {fmt(NAPOLES.monthlyBase)} + INCC 0,6%/mês</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Financiamento Caixa pós-chaves: {fmt(NAPOLES.caixaFinancing)}</div>
      </div>

      {/* Impulse */}
      <button className="impulse-btn" onClick={onImpulse}>
        🛑 Tô com vontade de comprar algo — me para
      </button>
    </div>
  )
}
