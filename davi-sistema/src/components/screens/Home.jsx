import { useApp } from '../../context/AppContext'
import MonthSelector from '../MonthSelector'
import { CATEGORIES, USER, NAPOLES } from '../../constants'
import { fmt } from '../../utils/format'

function CommitmentRing({ pct }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const color =
    pct >= 90 ? 'var(--danger)' :
    pct >= 70 ? 'var(--warning)' :
    'var(--accent)'

  return (
    <svg width="124" height="124" viewBox="0 0 124 124" aria-label={`${pct}% comprometido`}>
      <circle cx="62" cy="62" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
      <circle
        cx="62" cy="62" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${(Math.min(pct, 100) / 100) * circ} ${circ}`}
        strokeLinecap="round" transform="rotate(-90 62 62)"
        style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
      />
      <text x="62" y="57" textAnchor="middle" fill={color} fontSize="22"
        fontFamily="DM Mono, monospace" fontWeight="500">{pct}%</text>
      <text x="62" y="73" textAnchor="middle" fill="var(--text-muted)" fontSize="9.5"
        fontFamily="DM Sans, sans-serif" fontWeight="600">COMPROMETIDO</text>
    </svg>
  )
}

export default function Home({ onImpulse }) {
  const { state, dispatch, getSummary, getByCategory } = useApp()
  const { activeMonth } = state
  const s    = getSummary(activeMonth)
  const cats = getByCategory(activeMonth)
  const top4 = cats.slice(0, 4)

  const alertLevel =
    s.pct >= 90 ? 'danger' :
    s.pct >= 70 ? 'warn' :
    s.pct >= 30 ? 'info' : null

  const [y, m] = activeMonth.split('-').map(Number)
  const isObraPhase = y > 2028 || (y === 2028 && m >= 6)

  return (
    <div className="screen">
      {/* Header */}
      <div className="row-between mb-16">
        <div>
          <div className="fs-12 c-muted">Olá, Davi 👋</div>
          <div className="screen-title" style={{ marginBottom: 0 }}>Visão Geral</div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>💰</div>
      </div>

      <MonthSelector month={activeMonth} onChange={m => dispatch({ type: 'SET_MONTH', month: m })} />

      {/* Hero balance card */}
      <div className="card-hero">
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, paddingRight: 8 }}>
            <div className="section-label">Saldo disponível</div>
            <div
              className={`amt-xl lh-1 mb-6 ${s.surplus >= 0 ? 'c-accent' : 'c-danger'}`}
              style={{ fontSize: s.surplus < -999 ? '22px' : '28px' }}
            >
              {fmt(s.surplus)}
            </div>
            <div className="fs-13 c-secondary">de {fmt(USER.netIncome)} líquido/mês</div>

            {alertLevel && (
              <div className={`alert alert-${alertLevel}`} style={{ marginTop: 14, marginBottom: 0, padding: '10px 12px' }}>
                <span className="alert-icon fs-15">
                  {alertLevel === 'danger' ? '🚨' : alertLevel === 'warn' ? '⚠️' : 'ℹ️'}
                </span>
                <span className="fs-12 lh-14">
                  {alertLevel === 'danger'
                    ? `${s.pct}% comprometido! Corte gastos variáveis.`
                    : alertLevel === 'warn'
                    ? `${s.pct}% da renda comprometida. Atenção!`
                    : `${s.pct}% da renda comprometida.`
                  }
                </span>
              </div>
            )}
          </div>
          <CommitmentRing pct={s.pct} />
        </div>

        <div className="divider" style={{ margin: '14px 0' }} />

        <div className="grid-2" style={{ gap: 8 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '11px 13px' }}>
            <div className="fs-11 c-muted mb-4">Fixos</div>
            <div className="amt-md c-secondary">-{fmt(s.fixedTotal)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '11px 13px' }}>
            <div className="fs-11 c-muted mb-4">Variáveis</div>
            <div className="amt-md c-secondary">-{fmt(s.expenses)}</div>
          </div>
        </div>

        {s.credits > 0 && (
          <div className="alert alert-ok" style={{ marginTop: 10, marginBottom: 0, padding: '9px 12px' }}>
            <span className="alert-icon">↑</span>
            <span className="fs-13">Entradas extras: <strong>{fmt(s.credits)}</strong></span>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {top4.length > 0 && (
        <div className="card">
          <div className="section-label">Maiores gastos</div>
          {top4.map(cat => {
            const pct  = Math.min(100, Math.round((cat.total / (cat.budget || 1)) * 100))
            const over = cat.total > cat.budget
            return (
              <div key={cat.id} style={{ marginBottom: 13 }}>
                <div className="row-between mb-5">
                  <div className="row gap-6">
                    <span style={{ fontSize: 15 }}>{cat.icon}</span>
                    <span className="fs-14 fw-500">{cat.name}</span>
                  </div>
                  <div className="row gap-6">
                    <span className={`amt-xs ${over ? 'c-danger' : 'c-secondary'}`}>{fmt(cat.total)}</span>
                    {over && (
                      <span className="badge badge-danger" style={{ padding: '2px 7px', fontSize: 10 }}>
                        +{Math.round(((cat.total / cat.budget) - 1) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="prog-track">
                  <div className="prog-fill" style={{ width: `${pct}%`, background: over ? 'var(--danger)' : cat.color }} />
                </div>
                <div className="row-between mt-4">
                  <span className="fs-11 c-muted">orçamento: {fmt(cat.budget)}</span>
                  <span className={`fs-11 ${over ? 'c-danger' : 'c-muted'}`}>{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Nápoles mini */}
      <div className="napoles-card">
        <div className="row-between mb-10">
          <div className="section-label" style={{ marginBottom: 0 }}>🏗️ Nápoles 407A</div>
          <span className={`badge ${isObraPhase ? 'badge-warning' : 'badge-accent'}`}>
            {isObraPhase ? 'Fase Obra' : 'Em construção'}
          </span>
        </div>
        <div className="fs-15 fw-700 mb-4" style={{ letterSpacing: '-0.2px' }}>
          Entrega: 31/Jul/2028 (tol. jan/2029)
        </div>
        <div className="fs-13 c-secondary mb-10">
          48x R${NAPOLES.monthlyBase.toFixed(2)} + INCC 0,6%/mês
          {isObraPhase && <span className="c-warning"> + Caixa ~R$1.160 + Cond ~R$300</span>}
        </div>
        <div className="divider" />
        <div className="row-between">
          <span className="fs-12 c-muted">Financiamento Caixa</span>
          <span className="amt-xs c-accent">{fmt(NAPOLES.caixaFinancing)}</span>
        </div>
      </div>

      {/* Impulse button */}
      <button className="impulse-btn" onClick={onImpulse}>
        🛑 Tô com vontade de comprar algo — me para
      </button>
    </div>
  )
}
