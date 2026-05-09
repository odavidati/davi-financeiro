import { useApp } from '../../context/AppContext'
import MonthSelector from '../MonthSelector'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from 'recharts'
import { CATEGORIES, HISTORICAL, USER } from '../../constants'
import { fmt, fmtShort, prevMonth, monthShort } from '../../utils/format'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-strong)',
      borderRadius: 10,
      padding: '8px 13px',
      fontSize: 13,
    }}>
      <div className="fs-11 c-muted mb-4">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: 'DM Mono', fontSize: 14, fontWeight: 500 }}>
          {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

function buildInsights(activeMonth, summary, byCategory, txCount) {
  const insights = []

  if (txCount === 0) {
    insights.push({
      type: 'info',
      icon: '📥',
      title: 'Importe o extrato do Nubank',
      text: 'Sem lançamentos variáveis, a análise está incompleta. Vá em Gastos → 📥 CSV Nubank.',
    })
  }

  if (summary.pct >= 95) {
    insights.push({
      type: 'danger',
      icon: '🚨',
      title: 'Renda quase toda comprometida',
      text: `${summary.pct}% da renda foi para gastos. Sobra apenas ${fmt(summary.surplus)}. Revise os gastos variáveis com urgência.`,
    })
  } else if (summary.pct >= 80) {
    insights.push({
      type: 'warn',
      icon: '⚠️',
      title: `${summary.pct}% da renda comprometida`,
      text: `Você está ${summary.pct - 70}% acima do nível de atenção. Reduza gastos variáveis para aumentar a sobra.`,
    })
  }

  const transport = byCategory.find(c => c.id === 'transporte')
  if (transport && transport.total > HISTORICAL.transport * 1.15) {
    const excess = transport.total - HISTORICAL.transport
    insights.push({
      type: 'warn',
      icon: '🚗',
      title: 'Transporte acima da média',
      text: `${fmt(transport.total)} este mês vs. sua média de ${fmt(HISTORICAL.transport)}. ${fmt(excess)} a mais. Considere andar mais ou planejar melhor as rotas.`,
    })
  } else if (transport && transport.total <= HISTORICAL.transport * 0.85) {
    insights.push({
      type: 'ok',
      icon: '🚗',
      title: 'Transporte abaixo da média',
      text: `${fmt(transport.total)} vs. média de ${fmt(HISTORICAL.transport)}. Economizou ${fmt(HISTORICAL.transport - transport.total)} em transporte!`,
    })
  }

  const food = byCategory.find(c => c.id === 'alimentacao')
  if (food && food.total > HISTORICAL.food * 1.15) {
    insights.push({
      type: 'warn',
      icon: '🍔',
      title: 'Alimentação acima da média',
      text: `${fmt(food.total)} vs. média de ${fmt(HISTORICAL.food)}. O delivery provavelmente é o vilão — verifique os lançamentos.`,
    })
  }

  if (summary.surplus > 600 && summary.pct < 80) {
    insights.push({
      type: 'ok',
      icon: '✅',
      title: 'Mês positivo!',
      text: `Sobra projetada de ${fmt(summary.surplus)}. Direcione parte para a reserva de emergência ou abata o reforço do Nápoles.`,
    })
  }

  if (summary.credits > 0) {
    insights.push({
      type: 'info',
      icon: '💰',
      title: 'Receita extra registrada',
      text: `Você tem ${fmt(summary.credits)} de entradas além do salário CLT este mês.`,
    })
  }

  return insights
}

const alertClass = {
  warn: 'alert-warn', danger: 'alert-danger',
  ok: 'alert-ok', info: 'alert-info',
}

export default function Analise() {
  const { state, dispatch, getSummary, getByCategory, getTx } = useApp()
  const { activeMonth } = state

  const summary    = getSummary(activeMonth)
  const byCategory = getByCategory(activeMonth)
  const txs        = getTx(activeMonth)
  const insights   = buildInsights(activeMonth, summary, byCategory, txs.length)

  // 6-month history
  const history = Array.from({ length: 6 }, (_, i) => {
    let mk = activeMonth
    for (let j = 0; j < 5 - i; j++) mk = prevMonth(mk)
    const s = getSummary(mk)
    return {
      name: monthShort(mk),
      total:   Math.round(s.totalSpent),
      surplus: Math.round(Math.max(0, s.surplus)),
      pct:     s.pct,
    }
  })

  // Category bar chart data
  const catData = byCategory.slice(0, 7).map(c => ({
    name: c.icon + ' ' + c.name.slice(0, 8),
    valor: Math.round(c.total),
    fill: c.color,
    over: c.total > c.budget,
  }))

  return (
    <div className="screen">
      <div className="screen-title">Análise</div>

      <MonthSelector
        month={activeMonth}
        onChange={m => dispatch({ type: 'SET_MONTH', month: m })}
      />

      {/* Smart insights */}
      {insights.length > 0 && (
        <div className="mb-4">
          <div className="section-label">🤖 Análise automática</div>
          {insights.map((ins, i) => (
            <div key={i} className={`alert ${alertClass[ins.type]}`}>
              <span className="alert-icon">{ins.icon}</span>
              <div>
                <div className="fw-700 fs-13 mb-4">{ins.title}</div>
                <div className="fs-12 c-secondary lh-14">{ins.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category chart */}
      {catData.length > 0 && (
        <div className="card">
          <div className="section-label">Por categoria</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={catData} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#8899B8', fontSize: 9.5, fontFamily: 'DM Sans' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: '#3D4F6B', fontSize: 10, fontFamily: 'DM Mono' }}
                axisLine={false} tickLine={false}
                tickFormatter={fmtShort}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {catData.map((c, i) => (
                  <Cell key={i} fill={c.over ? '#F87171' : c.fill} fillOpacity={c.over ? 1 : 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 6-month trend */}
      <div className="card">
        <div className="section-label">Evolução 6 meses</div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={history} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#8899B8', fontSize: 11, fontFamily: 'DM Sans' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: '#3D4F6B', fontSize: 10, fontFamily: 'DM Mono' }}
              axisLine={false} tickLine={false}
              tickFormatter={fmtShort}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone" dataKey="total"
              stroke="var(--danger)" strokeWidth={2.5}
              dot={{ fill: 'var(--danger)', r: 3, strokeWidth: 0 }}
              name="Gastos"
            />
            <Line
              type="monotone" dataKey="surplus"
              stroke="var(--accent)" strokeWidth={2.5}
              dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
              strokeDasharray="5 4"
              name="Sobra"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="row gap-16 mt-8" style={{ paddingLeft: 8 }}>
          <div className="row gap-6">
            <div style={{ width: 10, height: 3, background: 'var(--danger)', borderRadius: 2 }} />
            <span className="fs-11 c-muted">Gastos totais</span>
          </div>
          <div className="row gap-6">
            <div style={{ width: 10, height: 3, background: 'var(--accent)', borderRadius: 2, border: '1px dashed var(--accent)' }} />
            <span className="fs-11 c-muted">Sobra</span>
          </div>
        </div>
      </div>

      {/* Monthly summary table */}
      <div className="card">
        <div className="section-label">Resumo do mês</div>
        {[
          { label: 'Renda líquida CLT',    value: fmt(USER.netIncome),      color: 'c-accent' },
          { label: 'Gastos fixos',          value: `-${fmt(summary.fixedTotal)}`, color: 'c-secondary' },
          { label: 'Gastos variáveis',      value: `-${fmt(summary.expenses)}`,   color: 'c-danger' },
          summary.credits > 0
            ? { label: 'Entradas extras', value: `+${fmt(summary.credits)}`, color: 'c-success' }
            : null,
          { label: 'Saldo final projetado', value: fmt(summary.surplus), color: summary.surplus >= 0 ? 'c-success' : 'c-danger', bold: true },
        ]
          .filter(Boolean)
          .map((row, i, arr) => (
            <div
              key={i}
              className="row-between"
              style={{
                padding: '9px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span className={`fs-14 ${row.bold ? 'fw-700' : 'fw-500 c-secondary'}`}>{row.label}</span>
              <span className={`amt-xs ${row.color} ${row.bold ? 'fw-700' : ''}`}>{row.value}</span>
            </div>
          ))}
        <div className="divider" />
        <div className="row-between">
          <span className="fs-14 fw-700">Comprometimento</span>
          <span
            className={`amt-md fw-700 ${
              summary.pct >= 90 ? 'c-danger' :
              summary.pct >= 70 ? 'c-warning' : 'c-accent'
            }`}
          >
            {summary.pct}%
          </span>
        </div>
      </div>

      {/* Historical comparison */}
      <div className="card">
        <div className="section-label">vs. suas médias (jan–abr/2026)</div>
        {[
          { label: 'Transporte (Uber/99)', catId: 'transporte', hist: HISTORICAL.transport,     icon: '🚗' },
          { label: 'Alimentação/Delivery', catId: 'alimentacao', hist: HISTORICAL.food,         icon: '🍔' },
          { label: 'Assinaturas',          catId: 'assinaturas', hist: HISTORICAL.subscriptions, icon: '📱' },
        ].map(row => {
          const current = byCategory.find(c => c.id === row.catId)?.total ?? 0
          const diff    = current - row.hist
          const pct     = row.hist > 0 ? Math.round((current / row.hist) * 100) - 100 : 0
          const isOver  = diff > 0 && current > 0
          return (
            <div
              key={row.catId}
              className="row-between"
              style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}
            >
              <div className="row gap-10">
                <span style={{ fontSize: 18 }}>{row.icon}</span>
                <div>
                  <div className="fs-13 fw-500">{row.label}</div>
                  <div className="fs-11 c-muted">média: {fmt(row.hist)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`amt-xs ${current > 0 ? (isOver ? 'c-danger' : 'c-success') : 'c-muted'}`}>
                  {current > 0 ? fmt(current) : '—'}
                </div>
                {current > 0 && (
                  <div className={`fs-11 ${isOver ? 'c-danger' : 'c-success'}`}>
                    {pct > 0 ? '+' : ''}{pct}%
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
