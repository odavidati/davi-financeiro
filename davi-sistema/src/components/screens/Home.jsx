import { useApp } from '../../context/AppContext'
import MonthSelector from '../MonthSelector'
import { NAPOLES, USER, INCOME_SOURCES } from '../../constants'
import { fmt } from '../../utils/format'

const MOTIVATION = [
  { icon:'🏗️', text:'Cada real guardado hoje é um tijolo no Nápoles 407A.' },
  { icon:'📈', text:'Primo Pobre diz: sobrou dinheiro? Investe. Não torrar com idiotice.' },
  { icon:'🎯', text:'Nati diz: dinheiro não aceita desaforo. Consciência em cada gasto.' },
  { icon:'🔑', text:'Jul/2028: chaves do 407A na sua mão. Foca.' },
  { icon:'💪', text:'Você está acompanhando suas finanças — isso já te coloca na frente de 70% dos brasileiros.' },
]

function Ring({ pct }) {
  const r = 50; const circ = 2 * Math.PI * r
  const color = pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--warning)' : 'var(--accent)'
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(108,58,224,0.12)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${(Math.min(pct,100)/100)*circ} ${circ}`}
        strokeLinecap="round" transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
      />
      <text x="60" y="56" textAnchor="middle" fill={color} fontSize="21" fontFamily="DM Mono" fontWeight="500">{pct}%</text>
      <text x="60" y="72" textAnchor="middle" fill="var(--text-muted)" fontSize="9.5" fontFamily="DM Sans" fontWeight="600">COMPROMETIDO</text>
    </svg>
  )
}

export default function Home({ onImpulse, onGoToContas }) {
  const { state, dispatch, getSummary, getByCategory, getBillsSummary } = useApp()
  const { activeMonth } = state
  const s    = getSummary(activeMonth)
  const cats = getByCategory(activeMonth)
  const bills = getBillsSummary(activeMonth)
  const top3 = cats.slice(0, 3)
  const tip  = MOTIVATION[Math.floor(new Date().getDate() % MOTIVATION.length)]

  const alertLevel = s.pct >= 90 ? 'danger' : s.pct >= 70 ? 'warn' : null

  return (
    <div className="screen">
      {/* Greeting */}
      <div className="row-between mb-20">
        <div>
          <div className="fs-12 c-secondary mb-2">Bom dia, Davi 👋</div>
          <div className="screen-title" style={{ marginBottom: 0 }}>Financeiro</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💰</div>
      </div>

      <MonthSelector month={activeMonth} onChange={m => dispatch({ type: 'SET_MONTH', month: m })} />

      {/* Main balance card */}
      <div className="card-accent" style={{ marginBottom: 12 }}>
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, paddingRight: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Saldo disponível</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 30, fontWeight: 500, letterSpacing: -1, lineHeight: 1, marginBottom: 6, color: 'white' }}>
              {fmt(s.surplus)}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              {s.variableIncome > 0
                ? <>CLT {fmt(USER.netIncome)} + extras {fmt(s.variableIncome)} = <strong>{fmt(s.totalIncome)}</strong></>
                : <>de {fmt(USER.netIncome)} CLT/mês</>
              }
            </div>

            {alertLevel && (
              <div style={{ marginTop: 12, background: alertLevel === 'danger' ? 'rgba(231,76,60,0.25)' : 'rgba(243,156,18,0.25)', borderRadius: 10, padding: '9px 12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>
                  {alertLevel === 'danger' ? `🚨 ${s.pct}% comprometido! Corte gastos agora.` : `⚠️ ${s.pct}% da renda comprometida.`}
                </span>
              </div>
            )}
          </div>
          <Ring pct={s.pct} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          {[
            { label: 'Fixos', value: `-${fmt(s.fixedTotal)}` },
            { label: 'Variáveis', value: `-${fmt(s.expenses)}` },
          ].map((r,i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 3 }}>{r.label}</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 15, fontWeight: 500 }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bills summary shortcut */}
      {bills.allBills.length > 0 && (
        <button
          className="card"
          onClick={onGoToContas}
          style={{ cursor: 'pointer', border: bills.allPaid ? '1.5px solid var(--success)' : '1.5px solid var(--warning)', display: 'block', width: '100%', textAlign: 'left' }}
        >
          <div className="row-between">
            <div>
              <div className="row gap-8 mb-6">
                <span style={{ fontSize: 18 }}>{bills.allPaid ? '✅' : '📋'}</span>
                <span className="fs-15 fw-700">{bills.allPaid ? 'Todas pagas!' : 'Contas do mês'}</span>
              </div>
              <div className="fs-13 c-secondary">
                {bills.paid.length}/{bills.allBills.length} pagas · {bills.allPaid ? 'Você mandou bem! 🎉' : `falta ${fmt(bills.totalUnpaid)}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="fs-12 c-muted mb-4">{bills.pct}%</div>
              <div style={{ width: 48, height: 48, position: 'relative' }}>
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border-md)" strokeWidth="5" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke={bills.allPaid ? 'var(--success)' : 'var(--warning)'} strokeWidth="5"
                    strokeDasharray={`${(bills.pct/100)*125.6} 125.6`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                </svg>
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Top categories */}
      {top3.length > 0 && (
        <div className="card">
          <div className="section-label">Maiores gastos</div>
          {top3.map(cat => {
            const pct  = Math.min(100, Math.round((cat.total / (cat.budget||1)) * 100))
            const over = cat.total > cat.budget
            return (
              <div key={cat.id} style={{ marginBottom: 13 }}>
                <div className="row-between mb-5">
                  <div className="row gap-8">
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span className="fs-14 fw-600">{cat.name}</span>
                  </div>
                  <div className="row gap-8">
                    <span className={`amt-xs ${over ? 'c-danger' : 'c-secondary'}`}>{fmt(cat.total)}</span>
                    {over && <span className="badge badge-danger" style={{ fontSize: 10, padding: '2px 7px' }}>+{Math.round(((cat.total/cat.budget)-1)*100)}%</span>}
                  </div>
                </div>
                <div className="prog-track prog-track-sm">
                  <div className="prog-fill" style={{ width:`${pct}%`, background: over ? 'var(--danger)' : cat.color }} />
                </div>
                <div className="row-between mt-3">
                  <span className="fs-10 c-muted">orçamento: {fmt(cat.budget)}</span>
                  <span className={`fs-10 ${over ? 'c-danger' : 'c-muted'}`}>{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Nápoles mini */}
      <div className="napoles-card">
        <div className="row-between mb-8">
          <span className="fs-11" style={{ color: 'rgba(255,255,255,0.6)' }}>🏗️ Nápoles 407A</span>
          <span className="badge" style={{ background: 'rgba(167,139,250,0.2)', color: '#C4B5FD', fontSize: 10 }}>Em construção</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 4 }}>Entrega: 31/Jul/2028</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>48x {fmt(NAPOLES.monthlyBase)} + INCC 0,6%/mês</div>
        <div className="divider" style={{ background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
        <div className="row-between">
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Financiamento Caixa</span>
          <span style={{ fontFamily: 'DM Mono', fontSize: 13, fontWeight: 500, color: '#A78BFA' }}>{fmt(NAPOLES.caixaFinancing)}</span>
        </div>
      </div>

      {/* Daily tip */}
      <div className="card" style={{ background: 'var(--accent-light)', border: '1.5px solid var(--accent-border)' }}>
        <div className="row gap-10">
          <span style={{ fontSize: 22, flexShrink: 0 }}>{tip.icon}</span>
          <div className="fs-13 c-secondary lh-14">{tip.text}</div>
        </div>
      </div>

      {/* Impulse button */}
      <button className="impulse-btn" onClick={onImpulse}>
        🛑 Tô com vontade de comprar algo — me para
      </button>
    </div>
  )
}
