import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { generateSchedule, getNapolesProjection, getProgress } from '../../utils/napoles'
import { NAPOLES, CHECKLIST_ITEMS } from '../../constants'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ComposedChart, Line, Legend,
} from 'recharts'
import { fmt, fmtShort, prevMonth, monthShort, monthLabel } from '../../utils/format'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-strong)',
      borderRadius: 10, padding: '8px 12px', fontSize: 13,
    }}>
      <div className="fs-11 c-muted mb-4">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: 'DM Mono', fontSize: 13 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function Metas() {
  const { state, dispatch, getSummary } = useApp()
  const { activeMonth, settings, checklist } = state
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [projView, setProjView] = useState('schedule') // schedule | chart
  const [efInput, setEfInput] = useState('')

  const schedule    = generateSchedule()
  const projection  = getNapolesProjection()
  const prog        = getProgress(schedule)
  const monthCheck  = checklist[activeMonth] || {}
  const doneCount   = CHECKLIST_ITEMS.filter(i => monthCheck[i.id]).length

  const efCurrent = settings.emergencyFundCurrent || 0
  const efGoal    = settings.emergencyFundGoal    || 8000
  const efPct     = Math.min(100, Math.round((efCurrent / efGoal) * 100))

  // Surplus history (last 6 months)
  const surplusData = Array.from({ length: 6 }, (_, i) => {
    let mk = activeMonth
    for (let j = 0; j < 5 - i; j++) mk = prevMonth(mk)
    const s = getSummary(mk)
    return { name: monthShort(mk), value: Math.round(s.surplus) }
  })

  // Current month Nápoles
  const currentNapoles = schedule.find(s => s.month === activeMonth)
  const currentProj    = projection.find(p => p.month === activeMonth)

  // Chart data: projeção custos Nápoles por mês (agrupado por semestre pra não poluir)
  // Mostra todos os 48 meses em formato compacto
  const projChartData = projection.map(p => ({
    name: p.label,
    entrada: Math.round(p.entrada + p.reforco),
    caixa: Math.round(p.caixa),
    cond: Math.round(p.cond),
    total: Math.round(p.total),
    isObraPhase: p.isObraPhase,
  }))

  function handleEfDeposit() {
    const v = parseFloat(efInput.replace(',', '.'))
    if (!isNaN(v) && v > 0) {
      dispatch({ type: 'SET_SETTING', key: 'emergencyFundCurrent', value: Math.min(efGoal, efCurrent + v) })
      setEfInput('')
    }
  }

  // Count parcelas by phase
  const obraCount = projection.filter(p => p.isObraPhase).length
  const normalCount = 48 - obraCount

  return (
    <div className="screen">
      <div className="screen-title">Metas</div>

      {/* ── Checklist ── */}
      <div className="card">
        <div className="row-between mb-12">
          <div className="section-label" style={{ marginBottom: 0 }}>🎯 Checklist do mês</div>
          <div className="row gap-8">
            <span className="badge badge-accent">{doneCount}/{CHECKLIST_ITEMS.length}</span>
            {doneCount === CHECKLIST_ITEMS.length && <span>🏆</span>}
          </div>
        </div>

        <div className="prog-track prog-track-lg mb-14">
          <div
            className="prog-fill"
            style={{
              width: `${(doneCount / CHECKLIST_ITEMS.length) * 100}%`,
              background: doneCount === CHECKLIST_ITEMS.length ? 'var(--accent)' : 'var(--warning)',
            }}
          />
        </div>

        {CHECKLIST_ITEMS.map(item => {
          const done = !!monthCheck[item.id]
          return (
            <div
              key={item.id} className="check-row"
              onClick={() => dispatch({ type: 'TOGGLE_CHECKLIST', month: activeMonth, itemId: item.id })}
            >
              <div className={`checkmark${done ? ' done' : ''}`}>
                {done && (
                  <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                    <path d="M1 5l3.5 3.5L12 1" stroke="#020e0a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 17, flexShrink: 0 }}>{item.icon}</span>
              <span className="fs-14" style={{
                color: done ? 'var(--text-muted)' : 'var(--text)',
                textDecoration: done ? 'line-through' : 'none', flex: 1,
              }}>
                {item.label}
              </span>
            </div>
          )
        })}

        {doneCount === CHECKLIST_ITEMS.length && (
          <div className="alert alert-ok mt-12" style={{ marginBottom: 0 }}>
            <span className="alert-icon">🏆</span>
            <span className="fs-13 fw-700">Mês 100% organizado! Excelente, Davi!</span>
          </div>
        )}
      </div>

      {/* ── Reserva de emergência ── */}
      <div className="card">
        <div className="section-label">🛡️ Reserva de emergência</div>
        <div className="row-between mb-10">
          <div>
            <div className="amt-lg c-accent">{fmt(efCurrent)}</div>
            <div className="fs-12 c-muted mt-4">de {fmt(efGoal)} (meta)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: efPct >= 100 ? 'var(--success)' : 'var(--text-secondary)' }}>
              {efPct}%
            </div>
            <div className="fs-11 c-muted">completado</div>
          </div>
        </div>

        <div className="prog-track prog-track-lg mb-10">
          <div
            className="prog-fill"
            style={{
              width: `${efPct}%`,
              background: efPct >= 100 ? 'var(--success)' : efPct >= 50 ? 'var(--accent)' : 'var(--warning)',
            }}
          />
        </div>

        {efCurrent < efGoal && (
          <div className="fs-12 c-muted mb-12">
            Faltam <strong style={{ color: 'var(--text-secondary)' }}>{fmt(efGoal - efCurrent)}</strong>
            {' '}· ~{Math.ceil((efGoal - efCurrent) / 300)} meses guardando R$300/mês
          </div>
        )}

        <div className="row gap-8">
          <input
            className="input input-mono flex-1"
            placeholder="R$ quanto depositar"
            value={efInput}
            onChange={e => setEfInput(e.target.value)}
            inputMode="decimal"
            style={{ padding: '10px 13px', fontSize: 14 }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleEfDeposit}>+ Depositar</button>
        </div>
      </div>

      {/* ── Sobra mensal ── */}
      <div className="card">
        <div className="section-label">📊 Sobra mensal (6 meses)</div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={surplusData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: '#8899B8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#3D4F6B', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(Math.abs(v))} />
            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 10, fontSize: 13 }} />
            <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={40}>
              {surplusData.map((d, i) => <Cell key={i} fill={d.value >= 0 ? 'var(--accent)' : 'var(--danger)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Nápoles 407A — card principal ── */}
      <div className="napoles-card">
        <div className="row-between mb-14">
          <div>
            <div className="fs-11 c-muted mb-4">📍 Av. Santos Ferreira, 4200 – Canoas/RS</div>
            <div className="fs-17 fw-800" style={{ letterSpacing: '-0.3px' }}>Nápoles 407A</div>
          </div>
          <span className="badge badge-accent">
            {prog.paid > 0 ? `${prog.paid}/48 pagas` : 'Jun/2026'}
          </span>
        </div>

        {/* Key financial stats */}
        <div className="grid-2 mb-14" style={{ gap: 10 }}>
          {[
            { label: 'Valor total',     value: fmt(NAPOLES.totalValue),       sub: 'imóvel + vaga 110' },
            { label: 'Entrada total',   value: fmt(NAPOLES.entradaTotal),      sub: '48x + 3 reforços' },
            { label: 'Financiamento',   value: fmt(NAPOLES.caixaFinancing),    sub: 'após subsídios' },
            { label: 'Pós-chaves (est)', value: `~${fmt(NAPOLES.caixaInstallmentApprox)}/mês`, sub: 'Caixa' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(0,200,150,0.05)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: '11px 12px' }}>
              <div className="fs-10 c-muted mb-4">{s.label}</div>
              <div className="amt-xs c-accent">{s.value}</div>
              <div className="fs-10 c-muted mt-3">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Mês atual */}
        {currentProj && (
          <div style={{ background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.18)', borderRadius: 13, padding: '13px 14px', marginBottom: 14 }}>
            <div className="fs-11 c-muted mb-6">Compromisso de {monthLabel(activeMonth)}</div>
            <div className="row-between mb-8">
              <div>
                <div className="fs-11 c-muted mb-3">Entrada (parcela {currentProj.number}/48)</div>
                <div className="amt-md c-accent">{fmt(currentProj.entrada)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="fs-11 c-muted mb-3">INCC acum.</div>
                <div className="fs-13 c-secondary">+{(((currentProj.entrada / NAPOLES.monthlyBase) - 1) * 100).toFixed(2)}%</div>
              </div>
            </div>

            {currentProj.reforco > 0 && (
              <div className="row-between mb-8">
                <span className="fs-13 c-warning">🔔 Reforço anual dezembro</span>
                <span className="amt-xs c-warning">{fmt(currentProj.reforco)}</span>
              </div>
            )}

            {currentProj.isObraPhase && (
              <>
                <div className="divider" style={{ margin: '8px 0' }} />
                <div className="row-between mb-4">
                  <span className="fs-12 c-secondary">Juros de Obra (Caixa)</span>
                  <span className="amt-xs c-warning">~{fmt(currentProj.caixa)}</span>
                </div>
                <div className="row-between mb-4">
                  <span className="fs-12 c-secondary">Condomínio (estimado)</span>
                  <span className="amt-xs c-warning">~{fmt(currentProj.cond)}</span>
                </div>
              </>
            )}

            <div className="divider" style={{ margin: '8px 0' }} />
            <div className="row-between">
              <span className="fs-13 fw-700">Total comprometido</span>
              <span className="amt-md c-accent">{fmt(currentProj.total)}</span>
            </div>
          </div>
        )}

        {!currentProj && (
          <div className="alert alert-info mb-14">
            <span className="alert-icon">📅</span>
            <div className="fs-13">
              Parcelas de entrada começam em <strong>Jun/2026</strong>.
              Selecione um mês a partir de jun/2026.
            </div>
          </div>
        )}

        {/* Porta de Entrada RS */}
        <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 13, padding: '13px 14px', marginBottom: 14 }}>
          <div className="row-between mb-10">
            <div className="fs-14 fw-700">🏛️ Porta de Entrada RS</div>
            <button
              className={`badge ${settings.ccsEmitted ? 'badge-success' : 'badge-warning'}`}
              style={{ cursor: 'pointer', border: 'none', fontFamily: 'DM Sans' }}
              onClick={() => dispatch({ type: 'SET_SETTING', key: 'ccsEmitted', value: !settings.ccsEmitted })}
            >
              {settings.ccsEmitted ? '✅ CCS emitido' : '⏳ CCS pendente'}
            </button>
          </div>
          <div className="grid-2 mb-10" style={{ gap: 8 }}>
            {[
              { label: 'Subsídio RS',      value: fmt(NAPOLES.subsidyRS),      color: 'c-success' },
              { label: 'Subsídio Federal', value: fmt(NAPOLES.subsidyFederal), color: 'c-purple' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px 0' }}>
                <div className="fs-11 c-muted mb-3">{s.label}</div>
                <div className={`amt-xs ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '10px 12px' }}>
            <div className="row-between">
              <div>
                <div className="fs-12 fw-600">Financiamento real</div>
                <div className="fs-11 c-muted">após subsídios</div>
              </div>
              <div className="amt-sm c-warning">{fmt(NAPOLES.caixaFinancing - NAPOLES.subsidyRS - NAPOLES.subsidyFederal)}</div>
            </div>
          </div>
          {!settings.ccsEmitted && (
            <div className="alert alert-warn mt-10" style={{ marginBottom: 0, padding: '9px 12px' }}>
              <span className="alert-icon fs-13">⚠️</span>
              <span className="fs-12">Emita o CCS para liberar o subsídio RS de {fmt(NAPOLES.subsidyRS)}.</span>
            </div>
          )}
        </div>

        {/* Marcos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {[
            { icon: '📅', label: '1ª parcela entrada', value: '10/Jun/2026' },
            { icon: '📅', label: '1º reforço anual', value: '31/Dez/2026 – R$2.000' },
            { icon: '🏗️', label: 'Juros de obra + Cond.', value: 'Jun/2028' },
            { icon: '🔑', label: 'Entrega contratual', value: '31/Jul/2028' },
            { icon: '⏳', label: 'Prazo máximo (tolerância)', value: 'Jan/2029' },
          ].map((m, i) => (
            <div key={i} className="row-between" style={{ padding: '7px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <div className="row gap-8">
                <span>{m.icon}</span>
                <span className="fs-13 c-secondary">{m.label}</span>
              </div>
              <span className="fs-12 fw-600">{m.value}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="row-between mb-6">
          <span className="fs-12 c-muted">Progresso entrada ({prog.paid}/48)</span>
          <span className="fs-12 c-secondary">{Math.round((prog.paid / 48) * 100)}%</span>
        </div>
        <div className="prog-track prog-track-lg mb-14">
          <div className="prog-fill" style={{ width: `${(prog.paid / 48) * 100}%`, background: 'var(--accent)' }} />
        </div>

        <button
          className="btn btn-ghost btn-sm btn-full"
          onClick={() => setScheduleOpen(v => !v)}
        >
          {scheduleOpen ? '▲ Fechar cronograma' : '▼ Ver projeção completa (48 parcelas)'}
        </button>
      </div>

      {/* ── Cronograma completo ── */}
      {scheduleOpen && (
        <>
          {/* View selector */}
          <div className="row gap-8 mb-12">
            <button className={`btn btn-sm flex-1 ${projView === 'schedule' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setProjView('schedule')}>
              📋 Lista
            </button>
            <button className={`btn btn-sm flex-1 ${projView === 'chart' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setProjView('chart')}>
              📊 Gráfico
            </button>
          </div>

          {projView === 'chart' ? (
            <div className="card">
              <div className="section-label">Custo mensal Nápoles — 48 meses</div>
              <div className="alert alert-info mb-12" style={{ padding: '9px 12px' }}>
                <span className="alert-icon">ℹ️</span>
                <span className="fs-12">A partir de <strong>Jun/2028</strong>: entrada + juros de obra (~R$1.160) + condomínio (~R$300).</span>
              </div>

              {/* Simplified chart showing total cost per month */}
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart
                  data={projChartData.filter((_, i) => i % 3 === 0)} // every 3 months for readability
                  margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fill: '#8899B8', fontSize: 8 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#3D4F6B', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="entrada" name="Entrada" stackId="a" fill="var(--accent)" fillOpacity={0.8} />
                  <Bar dataKey="caixa" name="Juros Obra" stackId="a" fill="var(--warning)" fillOpacity={0.85} />
                  <Bar dataKey="cond" name="Condomínio" stackId="a" fill="var(--purple)" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>

              <div className="row gap-16 mt-8" style={{ paddingLeft: 8, flexWrap: 'wrap' }}>
                {[
                  { color: 'var(--accent)',   label: 'Entrada (48x + reforços)' },
                  { color: 'var(--warning)',  label: 'Juros de Obra Caixa' },
                  { color: 'var(--purple)',   label: 'Condomínio (est.)' },
                ].map((l, i) => (
                  <div key={i} className="row gap-6">
                    <div style={{ width: 10, height: 3, background: l.color, borderRadius: 2 }} />
                    <span className="fs-10 c-muted">{l.label}</span>
                  </div>
                ))}
              </div>

              <div className="divider" />
              <div className="grid-2" style={{ gap: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="fs-11 c-muted mb-3">Parcelas normais (jun/26–mai/28)</div>
                  <div className="amt-xs c-accent">{normalCount} meses</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="fs-11 c-muted mb-3">Fase obra (jun/28 em diante)</div>
                  <div className="amt-xs c-warning">{obraCount} meses</div>
                  <div className="fs-10 c-muted">+{fmt(NAPOLES.caixaInstallmentApprox + NAPOLES.condominiumEstimate)}/mês extras</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="section-label">Cronograma completo — 48 parcelas</div>

              {/* Phase legend */}
              <div className="grid-2 mb-12" style={{ gap: 8 }}>
                <div style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
                  <div className="fw-700 c-accent mb-3">Fase Normal</div>
                  <div className="c-muted">Jun/2026 – Mai/2028</div>
                  <div className="c-secondary">Entrada apenas</div>
                </div>
                <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
                  <div className="fw-700 c-warning mb-3">Fase Obra</div>
                  <div className="c-muted">Jun/2028 – Mai/2030</div>
                  <div className="c-secondary">Entrada + Caixa + Cond.</div>
                </div>
              </div>

              <div style={{ maxHeight: 450, overflowY: 'auto' }}>
                {projection.map(p => {
                  const isCurrent = p.month === activeMonth
                  const isPast    = p.month < prog.currentMonth
                  const isReinf   = p.reforco > 0
                  return (
                    <div
                      key={p.month}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: isCurrent ? '9px 10px' : '8px 2px',
                        borderBottom: '1px solid var(--border)',
                        borderRadius: isCurrent ? 10 : 0,
                        background: isCurrent ? 'rgba(0,200,150,0.06)' : 'transparent',
                        opacity: isPast ? 0.4 : 1,
                      }}
                    >
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: p.isDelivery ? 'var(--accent-dim)' : p.isObraPhase ? 'rgba(251,191,36,0.12)' : 'var(--bg-elevated)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontFamily: 'DM Mono', fontWeight: 500, flexShrink: 0,
                        color: p.isDelivery ? 'var(--accent)' : p.isObraPhase ? 'var(--warning)' : 'var(--text-muted)',
                      }}>
                        {p.number}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fs-13 fw-500">{p.label}</div>
                        {isReinf   && <div className="fs-11 c-warning">+ Reforço {fmt(p.reforco)}</div>}
                        {p.isObraPhase && <div className="fs-10 c-warning">+ Caixa ~{fmt(p.caixa)} + Cond ~{fmt(p.cond)}</div>}
                        {p.isDelivery  && <div className="fs-11 c-accent">🔑 Entrega!</div>}
                        {isCurrent    && <div className="fs-11 c-accent">← mês atual</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="amt-xs c-secondary">{fmt(p.entrada)}</div>
                        {(isReinf || p.isObraPhase) && (
                          <div className="amt-xs c-warning fw-600">{fmt(p.total)}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
