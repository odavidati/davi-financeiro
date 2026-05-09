import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import MonthSelector from '../MonthSelector'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie } from 'recharts'
import { CATEGORIES, HISTORICAL, USER } from '../../constants'
import { fmt, fmtShort, prevMonth, monthShort, monthLabel } from '../../utils/format'

/* ─── Category detail sheet ─── */
function CategorySheet({ cat, month, onClose }) {
  if (!cat) return null
  const items  = cat.items || []
  const over   = cat.total > cat.budget
  const pct    = Math.min(100, Math.round((cat.total / (cat.budget||1)) * 100))
  const fixed  = items.filter(t => t.isFixed)
  const variable = items.filter(t => !t.isFixed).sort((a,b) => (b.date||'').localeCompare(a.date||''))

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>

        {/* Header */}
        <div className="row gap-12 mb-16">
          <div style={{width:52,height:52,borderRadius:16,background:`${cat.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>
            {cat.icon}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:2}}>{cat.name}</div>
            <div className="fs-13 c-secondary">{monthLabel(month)}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'DM Mono',fontSize:20,fontWeight:600,color:over?'var(--danger)':cat.color}}>{fmt(cat.total)}</div>
            <div className="fs-11 c-muted">de {fmt(cat.budget)} orç.</div>
          </div>
        </div>

        {/* Progress */}
        <div className="prog-track prog-track-lg mb-6">
          <div className="prog-fill" style={{width:`${pct}%`,background:over?'var(--danger)':cat.color}}/>
        </div>
        <div className="row-between mb-16">
          <span className="fs-12 c-muted">
            {over
              ? `⚠️ ${fmt(cat.total - cat.budget)} acima do orçamento`
              : `✅ ${fmt(cat.budget - cat.total)} sobra no orçamento`}
          </span>
          <span className="fs-12 fw-700" style={{color:over?'var(--danger)':cat.color}}>{pct}%</span>
        </div>

        {/* Fixed */}
        {fixed.length > 0 && (
          <>
            <div className="section-label">📌 Fixos</div>
            {fixed.map((t,i) => (
              <div key={i} className="tx-item">
                <div className="tx-icon" style={{background:`${cat.color}12`}}>📌</div>
                <div className="tx-body">
                  <div className="tx-desc">{t.name}</div>
                  <div className="tx-meta">Fixo mensal</div>
                </div>
                <div className="amt-xs c-secondary">-{fmt(Math.abs(t.amount||0))}</div>
              </div>
            ))}
          </>
        )}

        {/* Variable */}
        {variable.length > 0 && (
          <>
            <div className="section-label" style={{marginTop:fixed.length>0?14:0}}>
              💳 Lançamentos ({variable.length})
            </div>
            {variable.map((t,i) => (
              <div key={i} className="tx-item">
                <div className="tx-icon" style={{background:`${cat.color}12`,fontSize:16}}>{cat.icon}</div>
                <div className="tx-body">
                  <div className="tx-desc">{t.description}</div>
                  <div className="tx-meta">{t.date}{t.type==='csv'?' · CSV':''}</div>
                </div>
                <div className="amt-xs c-danger">-{fmt(Math.abs(t.amount||0))}</div>
              </div>
            ))}
          </>
        )}

        {items.length === 0 && (
          <div style={{textAlign:'center',padding:'24px 0',color:'var(--text-muted)',fontSize:13}}>
            Nenhum lançamento nesta categoria.
          </div>
        )}

        <div style={{marginTop:16}}>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Category card ─── */
function CategoryCard({ cat, totalSpent, onClick }) {
  const pct   = Math.min(100, Math.round((cat.total / (cat.budget||1)) * 100))
  const over  = cat.total > cat.budget
  const share = totalSpent > 0 ? Math.round((cat.total / totalSpent) * 100) : 0

  return (
    <div
      onClick={() => onClick(cat)}
      style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)',cursor:'pointer'}}
    >
      <div style={{width:42,height:42,borderRadius:12,background:`${cat.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
        {cat.icon}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div className="row-between mb-5">
          <span className="fs-14 fw-600">{cat.name}</span>
          <div className="row gap-8">
            <span className="badge badge-muted" style={{fontSize:10,padding:'2px 7px'}}>{share}%</span>
            <span className="amt-xs" style={{color:over?'var(--danger)':'var(--text)'}}>{fmt(cat.total)}</span>
          </div>
        </div>
        <div className="prog-track prog-track-sm">
          <div className="prog-fill" style={{width:`${pct}%`,background:over?'var(--danger)':cat.color}}/>
        </div>
        <div className="row-between mt-3">
          <span className="fs-10 c-muted">{cat.items?.length||0} lançamentos · orç. {fmt(cat.budget)}</span>
          <span className={`fs-10 fw-600 ${over?'c-danger':'c-muted'}`}>{pct}%{over?' ⚠️':''}</span>
        </div>
      </div>
      <div className="fs-16 c-muted" style={{flexShrink:0}}>›</div>
    </div>
  )
}

/* ─── Insights ─── */
function buildInsights(month, summary, byCategory, txCount) {
  const insights = []
  if (txCount === 0) {
    insights.push({ type:'info', icon:'📥', title:'Importe o extrato do Nubank', text:`Sem lançamentos variáveis em ${monthLabel(month)}. Gastos → 📥 CSV Nubank.` })
  }
  if (summary.pct >= 95) {
    insights.push({ type:'danger', icon:'🚨', title:`${summary.pct}% comprometido!`, text:`Sobra apenas ${fmt(summary.surplus)}. Primo Pobre diz: corta agora ou você vai para o cheque especial.` })
  } else if (summary.pct >= 80) {
    insights.push({ type:'warn', icon:'⚠️', title:`${summary.pct}% comprometido`, text:`${summary.pct - 70}% acima da zona de atenção. Identifica o que cortar antes que seja tarde.` })
  } else if (summary.surplus > 500) {
    insights.push({ type:'ok', icon:'💰', title:`Sobra ${fmt(summary.surplus)} — investe!`, text:`Primo Pobre diz: primeiro reserva de emergência (meta R$8.000), depois investimento. Não torra.` })
  }
  const transport = byCategory.find(c => c.id==='transporte')
  if (transport?.total > HISTORICAL.transport * 1.2) {
    insights.push({ type:'warn', icon:'🚗', title:'Transporte acima do normal', text:`${fmt(transport.total)} vs. média ${fmt(HISTORICAL.transport)} — ${fmt(transport.total-HISTORICAL.transport)} a mais.` })
  }
  const food = byCategory.find(c => c.id==='alimentacao')
  if (food?.total > HISTORICAL.food * 1.2) {
    insights.push({ type:'warn', icon:'🍔', title:'Alimentação acima do normal', text:`${fmt(food.total)} vs. média ${fmt(HISTORICAL.food)}. O delivery é o vilão. Nati diz: comida no lixo é dinheiro no lixo.` })
  }
  if (summary.credits > 500) {
    insights.push({ type:'info', icon:'↑', title:`${fmt(summary.credits)} de entradas extras`, text:`Esse dinheiro extra vai para investimento ou reserva de emergência?` })
  }
  return insights
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{background:'var(--bg-elevated)',border:'1px solid var(--border-strong)',borderRadius:10,padding:'8px 13px',fontSize:13}}>
      <div className="fs-11 c-muted mb-4">{label}</div>
      {payload.map((p,i) => <div key={i} style={{color:p.color,fontFamily:'DM Mono',fontSize:14}}>{fmt(p.value)}</div>)}
    </div>
  )
}

const alertClass = { warn:'alert-warn', danger:'alert-danger', ok:'alert-ok', info:'alert-info' }

/* ─── MAIN SCREEN ─── */
export default function Analise() {
  const { state, dispatch, getSummary, getByCategory, getTx } = useApp()
  const { activeMonth } = state
  const [selectedCat, setSelectedCat] = useState(null)
  const [catView, setCatView]         = useState('list') // list | chart

  const summary    = getSummary(activeMonth)
  const byCategory = getByCategory(activeMonth)
  const txs        = getTx(activeMonth)
  const insights   = buildInsights(activeMonth, summary, byCategory, txs.length)

  const history = Array.from({ length: 6 }, (_,i) => {
    let mk = activeMonth
    for (let j=0; j<5-i; j++) mk = prevMonth(mk)
    const s = getSummary(mk)
    return { name: monthShort(mk), total: Math.round(s.totalSpent), surplus: Math.round(Math.max(0,s.surplus)), pct: s.pct }
  })

  const catData = byCategory.slice(0,7).map(c => ({
    name: c.icon+' '+c.name.slice(0,8), valor: Math.round(c.total), fill: c.color, over: c.total > c.budget,
  }))

  const reportMonths = Array.from({ length: 5 }, (_,i) => {
    let mk = activeMonth
    for (let j=0; j<4-i; j++) mk = prevMonth(mk)
    const s = getSummary(mk)
    return { month: mk, label: monthShort(mk), ...s }
  })

  return (
    <div className="screen">
      <div className="screen-title">Análise</div>
      <MonthSelector month={activeMonth} onChange={m => dispatch({type:'SET_MONTH',month:m})}/>

      {/* Smart insights */}
      {insights.length > 0 && (
        <div className="mb-4">
          <div className="section-label">🤖 Diagnóstico automático</div>
          {insights.map((ins,i) => (
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

      {/* ── CATEGORIES SECTION ── */}
      <div className="card">
        <div className="row-between mb-12">
          <div className="section-label" style={{marginBottom:0}}>📊 Por categoria</div>
          <div className="row gap-6">
            <button
              className={`btn btn-xs ${catView==='list'?'btn-primary':'btn-ghost'}`}
              onClick={() => setCatView('list')}
            >Lista</button>
            <button
              className={`btn btn-xs ${catView==='chart'?'btn-primary':'btn-ghost'}`}
              onClick={() => setCatView('chart')}
            >Gráfico</button>
          </div>
        </div>

        {/* Summary totals */}
        <div className="grid-2 mb-14" style={{gap:8}}>
          <div style={{background:'var(--bg-elevated)',borderRadius:12,padding:'10px 12px',textAlign:'center'}}>
            <div className="fs-11 c-muted mb-3">Total gasto</div>
            <div className="amt-sm c-danger">{fmt(summary.totalSpent)}</div>
          </div>
          <div style={{background:'var(--bg-elevated)',borderRadius:12,padding:'10px 12px',textAlign:'center'}}>
            <div className="fs-11 c-muted mb-3">Sobra</div>
            <div className={`amt-sm ${summary.surplus>=0?'c-success':'c-danger'}`}>{fmt(summary.surplus)}</div>
          </div>
        </div>

        {catView === 'chart' ? (
          byCategory.length > 0 ? (() => {
            const donutData = byCategory.slice(0,8).map(c => ({ name: c.name, value: Math.round(c.total), fill: c.color, over: c.total > c.budget, cat: c }))
            const total = donutData.reduce((s,d) => s+d.value, 0)
            return (
              <div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={68} outerRadius={96}
                      paddingAngle={2}
                      dataKey="value"
                      onClick={(d) => setSelectedCat(d.cat)}
                      style={{cursor:'pointer'}}
                    >
                      {donutData.map((d,i) => (
                        <Cell key={i} fill={d.over?'var(--danger)':d.fill} opacity={0.9}/>
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v,n) => [fmt(v), n]}
                      contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--border-strong)',borderRadius:10,fontSize:13}}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:4}}>
                  {donutData.map((d,i) => (
                    <button key={i} onClick={() => setSelectedCat(d.cat)} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 8px',borderRadius:8,background:'var(--bg-elevated)',border:'1px solid var(--border)',cursor:'pointer',transition:'all 0.1s'}}>
                      <div style={{width:9,height:9,borderRadius:'50%',background:d.over?'var(--danger)':d.fill,flexShrink:0}}/>
                      <span style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)'}}>{d.name}</span>
                      <span style={{fontSize:11,fontFamily:'DM Mono',color:d.over?'var(--danger)':'var(--text)'}}>{Math.round((d.value/total)*100)}%</span>
                    </button>
                  ))}
                </div>
                <div className="fs-11 c-muted text-center mt-8">Toque em uma fatia para ver os lançamentos</div>
              </div>
            )
          })() : (
            <div style={{textAlign:'center',padding:'24px 0',color:'var(--text-muted)',fontSize:13}}>Sem dados para este mês.</div>
          )
        ) : (
          <>
            {byCategory.length === 0 && (
              <div style={{textAlign:'center',padding:'24px 0',color:'var(--text-muted)',fontSize:13}}>
                Sem lançamentos. Importe o CSV ou lance manualmente.
              </div>
            )}
            {byCategory.map(cat => (
              <CategoryCard
                key={cat.id}
                cat={cat}
                totalSpent={summary.totalSpent}
                onClick={setSelectedCat}
              />
            ))}
            {byCategory.length > 0 && (
              <div className="fs-12 c-muted text-center mt-8">
                Toque em uma categoria para ver os lançamentos
              </div>
            )}
          </>
        )}
      </div>

      {/* 6-month trend */}
      <div className="card">
        <div className="section-label">Evolução 6 meses</div>
        <ResponsiveContainer width="100%" height={165}>
          <LineChart data={history} margin={{top:4,right:4,left:-22,bottom:0}}>
            <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:'var(--text-muted)',fontSize:10,fontFamily:'DM Mono'}} axisLine={false} tickLine={false} tickFormatter={fmtShort}/>
            <Tooltip content={<ChartTooltip/>}/>
            <Line type="monotone" dataKey="total" stroke="var(--danger)" strokeWidth={2.5} dot={{fill:'var(--danger)',r:3,strokeWidth:0}} name="Gastos"/>
            <Line type="monotone" dataKey="surplus" stroke="var(--success)" strokeWidth={2.5} dot={{fill:'var(--success)',r:3,strokeWidth:0}} strokeDasharray="5 4" name="Sobra"/>
          </LineChart>
        </ResponsiveContainer>
        <div className="row gap-16 mt-8" style={{paddingLeft:8}}>
          {[{c:'var(--danger)',l:'Gastos totais'},{c:'var(--success)',l:'Sobra'}].map((l,i) => (
            <div key={i} className="row gap-6">
              <div style={{width:10,height:3,background:l.c,borderRadius:2}}/>
              <span className="fs-11 c-muted">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Month summary */}
      <div className="card">
        <div className="section-label">Resumo de {monthLabel(activeMonth)}</div>
        {[
          { label:'Renda líquida CLT',   value:fmt(USER.netIncome),           color:'c-accent' },
          { label:'Gastos fixos',         value:`-${fmt(summary.fixedTotal)}`, color:'c-secondary' },
          { label:'Gastos variáveis',     value:`-${fmt(summary.expenses)}`,   color:'c-danger' },
          summary.credits>0 ? { label:'Entradas extras', value:`+${fmt(summary.credits)}`, color:'c-success' } : null,
          { label:'Saldo final projetado', value:fmt(summary.surplus), color:summary.surplus>=0?'c-success':'c-danger', bold:true },
        ].filter(Boolean).map((row,i,arr) => (
          <div key={i} className="row-between" style={{padding:'9px 0',borderBottom:i<arr.length-1?'1px solid var(--border)':'none'}}>
            <span className={`fs-14 ${row.bold?'fw-700':'fw-500 c-secondary'}`}>{row.label}</span>
            <span className={`amt-xs ${row.color} ${row.bold?'fw-700':''}`}>{row.value}</span>
          </div>
        ))}
        <div className="divider"/>
        <div className="row-between">
          <span className="fs-14 fw-700">Comprometimento</span>
          <span className={`amt-md fw-700 ${summary.pct>=90?'c-danger':summary.pct>=70?'c-warning':'c-accent'}`}>{summary.pct}%</span>
        </div>
      </div>

      {/* vs historical */}
      <div className="card">
        <div className="section-label">vs. suas médias históricas</div>
        {[
          { label:'Transporte (Uber/99)', catId:'transporte', hist:HISTORICAL.transport, icon:'🚗' },
          { label:'Alimentação/Delivery', catId:'alimentacao', hist:HISTORICAL.food, icon:'🍔' },
          { label:'Assinaturas',          catId:'assinaturas', hist:HISTORICAL.subscriptions, icon:'📱' },
        ].map(row => {
          const current = byCategory.find(c=>c.id===row.catId)?.total ?? 0
          const diff = current - row.hist
          const pct  = row.hist>0 ? Math.round((current/row.hist)*100)-100 : 0
          return (
            <div key={row.catId} className="row-between" style={{padding:'11px 0',borderBottom:'1px solid var(--border)'}}>
              <div className="row gap-10">
                <span style={{fontSize:18}}>{row.icon}</span>
                <div>
                  <div className="fs-13 fw-500">{row.label}</div>
                  <div className="fs-11 c-muted">média: {fmt(row.hist)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`amt-xs ${current>0?(diff>0?'c-danger':'c-success'):'c-muted'}`}>{current>0?fmt(current):'—'}</div>
                {current>0 && <div className={`fs-11 ${diff>0?'c-danger':'c-success'}`}>{pct>0?'+':''}{pct}%</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Report table */}
      <div className="card">
        <div className="section-label">📋 Relatório — últimos 5 meses</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{borderBottom:'2px solid var(--border-strong)'}}>
                {['Mês','Fixos','Variáv.','Sobra','%'].map((h,i) => (
                  <th key={h} style={{textAlign:i===0?'left':'right',padding:'6px 4px',color:'var(--text-muted)',fontWeight:700,fontSize:10,textTransform:'uppercase'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportMonths.map(r => (
                <tr key={r.month} style={{borderBottom:'1px solid var(--border)',background:r.month===activeMonth?'var(--accent-light)':'transparent'}}>
                  <td style={{padding:'8px 4px',fontWeight:r.month===activeMonth?700:500,color:r.month===activeMonth?'var(--accent)':'var(--text)'}}>{r.label}</td>
                  <td style={{textAlign:'right',padding:'8px 4px',fontFamily:'DM Mono',color:'var(--text-secondary)'}}>{fmtShort(r.fixedTotal)}</td>
                  <td style={{textAlign:'right',padding:'8px 4px',fontFamily:'DM Mono',color:'var(--danger)'}}>{fmtShort(r.expenses)}</td>
                  <td style={{textAlign:'right',padding:'8px 4px',fontFamily:'DM Mono',color:r.surplus>=0?'var(--success)':'var(--danger)',fontWeight:600}}>{fmtShort(r.surplus)}</td>
                  <td style={{textAlign:'right',padding:'8px 4px',fontFamily:'DM Mono',color:r.pct>=90?'var(--danger)':r.pct>=70?'var(--warning)':'var(--accent)',fontWeight:600}}>{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Health score */}
      {summary.pct > 0 && (
        <div className="card" style={{border:`1.5px solid ${summary.pct>=90?'var(--danger)':summary.pct>=70?'var(--warning)':'var(--success)'}`}}>
          <div className="section-label">🏆 Saúde financeira</div>
          <div className="row gap-12">
            <div style={{fontSize:40}}>{summary.pct<50?'😎':summary.pct<70?'🙂':summary.pct<90?'😰':'😱'}</div>
            <div>
              <div className="fs-15 fw-700 mb-4">
                {summary.pct<50?'Excelente!':summary.pct<70?'Boa situação':summary.pct<90?'Atenção necessária':'Situação crítica'}
              </div>
              <div className="fs-13 c-secondary lh-14">
                {summary.pct<50
                  ? `${summary.pct}% comprometido. Investe a sobra de ${fmt(summary.surplus)} — não deixa parado!`
                  : summary.pct<70
                  ? `${summary.pct}% comprometido. Tudo ok, monitora os variáveis.`
                  : summary.pct<90
                  ? `${summary.pct}% comprometido. Identifica o que cortar antes que aperte.`
                  : `${summary.pct}% comprometido. Corta gastos e recalcula agora.`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category detail sheet */}
      {selectedCat && (
        <CategorySheet
          cat={selectedCat}
          month={activeMonth}
          onClose={() => setSelectedCat(null)}
        />
      )}
    </div>
  )
}
