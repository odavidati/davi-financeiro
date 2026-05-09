import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import MonthSelector from '../MonthSelector'
import { CATEGORIES, INCOME_SOURCES, USER } from '../../constants'
import { parseNubankCSV } from '../../utils/csvParser'
import { categorize } from '../../utils/categorizer'
import { fmt, uid, monthLabel } from '../../utils/format'

/* ─── Add transaction sheet ─── */
function AddSheet({ month, mode, onClose, onAdd }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: mode === 'income' ? 'salario' : 'outros',
    date: `${month}-${String(new Date().getDate()).padStart(2,'0')}`,
    type: mode || 'expense',
    source: 'salario',
  })
  const set = (k,v) => setForm(p => ({...p,[k]:v}))

  function handleDescChange(e) {
    const desc = e.target.value
    set('description', desc)
    if (form.type === 'expense' && desc.length > 2) set('category', categorize(desc))
  }

  function submit() {
    const amt = parseFloat(form.amount.replace(',','.'))
    if (!form.description.trim() || isNaN(amt) || amt <= 0) return
    onAdd({
      id: uid(),
      date: form.date,
      description: form.description.trim(),
      amount: form.type === 'expense' ? -amt : amt,
      category: form.type === 'expense' ? form.category : form.source,
      type: 'manual',
    })
    onClose()
  }

  const isIncome = form.type === 'income'

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title">{isIncome ? '💰 Nova receita' : '💳 Novo gasto'}</div>

        {/* Type toggle */}
        <div className="row gap-8 mb-16">
          {[
            { t:'expense', l:'↓ Despesa', c:'var(--danger)' },
            { t:'income',  l:'↑ Receita', c:'var(--success)' },
          ].map(({t,l,c}) => (
            <button key={t} className="btn btn-sm flex-1"
              style={{ background:form.type===t?`${c}15`:'var(--bg-elevated)', color:form.type===t?c:'var(--text-secondary)', border:`1.5px solid ${form.type===t?c:'var(--border-md)'}` }}
              onClick={() => set('type', t)}>
              {l}
            </button>
          ))}
        </div>

        {/* Income source picker */}
        {isIncome && (
          <div className="form-group">
            <label className="form-label">Fonte de receita</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:4 }}>
              {INCOME_SOURCES.map(src => (
                <button key={src.id}
                  onClick={() => { set('source', src.id); set('description', src.name) }}
                  style={{
                    display:'flex', alignItems:'center', gap:6,
                    padding:'7px 12px', borderRadius:100, fontSize:12, fontWeight:600,
                    border:`1.5px solid ${form.source===src.id ? src.color : 'var(--border-md)'}`,
                    background: form.source===src.id ? `${src.color}15` : 'var(--bg-elevated)',
                    color: form.source===src.id ? src.color : 'var(--text-secondary)',
                    cursor:'pointer', transition:'all 0.15s',
                  }}>
                  <span>{src.icon}</span>
                  <span>{src.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input
            className="input"
            placeholder={isIncome ? 'ex: Aula UNOPAR mai, Convite Luisa…' : 'ex: Uber, iFood, Farmácia…'}
            value={form.description}
            onChange={handleDescChange}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Valor (R$)</label>
          <input className="input input-mono" placeholder="0,00" value={form.amount}
            onChange={e => set('amount', e.target.value)} inputMode="decimal"/>
        </div>

        <div className="form-group">
          <label className="form-label">Data</label>
          <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)}/>
        </div>

        {!isIncome && (
          <div className="form-group">
            <label className="form-label">
              Categoria
              {form.description.length > 2 && <span className="badge badge-accent" style={{marginLeft:8,fontSize:10}}>auto</span>}
            </label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        )}

        <button className="btn btn-primary btn-full" style={{ background: isIncome ? 'var(--success)' : undefined }} onClick={submit}>
          {isIncome ? '+ Registrar receita' : 'Lançar gasto'}
        </button>
      </div>
    </div>
  )
}

/* ─── CSV import ─── */
function ImportSheet({ month, onClose, onImport }) {
  const [stage, setStage] = useState('idle')
  const [txs, setTxs]     = useState([])
  const [errors, setErrors] = useState([])
  const fileRef = useRef()

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { transactions, errors: errs } = parseNubankCSV(ev.target.result)
      if (transactions.length === 0 && errs.length > 0) { setErrors(errs); setStage('error') }
      else { setTxs(transactions); setStage('preview') }
    }
    reader.readAsText(file, 'UTF-8')
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title">Importar CSV Nubank</div>
        <div className="alert alert-info mb-16">
          <span className="alert-icon">💡</span>
          <div className="fs-13"><strong>Como exportar:</strong> App Nubank → Extrato → ⋯ → Exportar planilha</div>
        </div>

        {stage === 'idle' && (
          <>
            <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={handleFile}/>
            <button className="btn btn-primary btn-full" onClick={() => fileRef.current?.click()}>📂 Selecionar CSV</button>
          </>
        )}
        {stage === 'error' && (
          <>
            <div className="alert alert-danger mb-16">
              <span className="alert-icon">❌</span>
              <div>{errors.slice(0,3).map((e,i) => <div key={i} className="fs-12">{e}</div>)}</div>
            </div>
            <button className="btn btn-ghost btn-full" onClick={() => setStage('idle')}>Tentar novamente</button>
          </>
        )}
        {stage === 'preview' && (
          <>
            <div className="alert alert-ok mb-12">
              <span className="alert-icon">✅</span>
              <span className="fs-13"><strong>{txs.length} transações</strong> encontradas</span>
            </div>
            <div style={{maxHeight:260,overflowY:'auto',marginBottom:16,borderRadius:12,border:'1px solid var(--border)'}}>
              {txs.slice(0,20).map((tx,i) => {
                const cat = CATEGORIES.find(c => c.id === tx.category)
                return (
                  <div key={i} className="tx-item" style={{padding:'8px 12px'}}>
                    <div className="tx-icon" style={{background:`${cat?.color||'#94A3B8'}15`,width:34,height:34,fontSize:14,borderRadius:9}}>{cat?.icon||'📦'}</div>
                    <div className="tx-body">
                      <div className="tx-desc fs-13">{tx.description}</div>
                      <div className="tx-meta">{tx.date} · {cat?.name}</div>
                    </div>
                    <div className={`amt-xs ${tx.amount<0?'c-danger':'c-success'}`}>{tx.amount<0?'-':'+'}{fmt(Math.abs(tx.amount))}</div>
                  </div>
                )
              })}
              {txs.length > 20 && <div className="fs-12 c-muted text-center" style={{padding:'8px 0'}}>+ {txs.length-20} transações…</div>}
            </div>
            <div className="row gap-8">
              <button className="btn btn-ghost" style={{flex:1}} onClick={() => setStage('idle')}>Cancelar</button>
              <button className="btn btn-primary" style={{flex:2}} onClick={() => { onImport(txs); onClose() }}>
                ✅ Importar {txs.length} transações
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Edit/Delete sheet ─── */
function EditSheet({ tx, month, onClose, onDelete, onUpdate }) {
  const [cat, setCat] = useState(tx.category)
  const isIncome = tx.amount > 0
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title fs-15">{tx.description}</div>
        <div className="row gap-8 mb-16">
          <div className={`amt-lg ${isIncome?'c-success':'c-danger'}`}>
            {isIncome?'+':'-'}{fmt(Math.abs(tx.amount))}
          </div>
          <div className="fs-12 c-muted">{tx.date}</div>
          {tx.type==='csv' && <span className="badge badge-muted">CSV</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="input" value={cat} onChange={e => { setCat(e.target.value); onUpdate({...tx,category:e.target.value}) }}>
            {isIncome
              ? INCOME_SOURCES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)
              : CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)
            }
          </select>
        </div>
        <button className="btn btn-danger btn-full mt-12" onClick={() => { onDelete(tx.id); onClose() }}>🗑️ Excluir</button>
      </div>
    </div>
  )
}

/* ─── MAIN SCREEN ─── */
export default function Gastos() {
  const { state, dispatch, getTx, getFixed, getSummary } = useApp()
  const { activeMonth } = state
  const [showAdd, setShowAdd]       = useState(false)
  const [addMode, setAddMode]       = useState('expense')
  const [showImport, setShowImport] = useState(false)
  const [editTx, setEditTx]         = useState(null)
  const [filterCat, setFilterCat]   = useState('all')
  const [viewMode, setViewMode]     = useState('expenses') // expenses | income | all
  const [search, setSearch]         = useState('')

  const txs    = getTx(activeMonth)
  const fixed  = getFixed(activeMonth)
  const summary = getSummary(activeMonth)

  const expenses = txs.filter(t => t.amount < 0)
  const incomes  = txs.filter(t => t.amount > 0)

  const usedCats = [...new Set(expenses.map(t => t.category))]

  const displayTxs = viewMode === 'income' ? incomes
    : viewMode === 'expenses' ? expenses
    : txs

  const filtered = displayTxs
    .filter(t => filterCat === 'all' || t.category === filterCat)
    .filter(t => !search || t.description.toLowerCase().includes(search.toLowerCase()))

  function openAdd(mode) { setAddMode(mode); setShowAdd(true) }

  return (
    <div className="screen">
      <div className="screen-title">Gastos & Receitas</div>

      <MonthSelector month={activeMonth} onChange={m => dispatch({type:'SET_MONTH',month:m})}/>

      {/* Action buttons */}
      <div className="row gap-8 mb-12">
        <button className="btn btn-primary" style={{flex:2}} onClick={() => openAdd('expense')}>- Gasto</button>
        <button className="btn btn-success" style={{flex:2}} onClick={() => openAdd('income')}>+ Receita</button>
        <button className="btn btn-ghost" style={{flex:1,fontSize:12}} onClick={() => setShowImport(true)}>📥 CSV</button>
      </div>

      {/* Income summary card */}
      <div className="card" style={{background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'1.5px solid rgba(0,184,148,0.2)'}}>
        <div className="section-label" style={{color:'var(--success)'}}>💰 Receitas de {monthLabel(activeMonth)}</div>
        <div className="row-between mb-10">
          <div>
            <div className="fs-11 c-muted mb-3">Salário CLT</div>
            <div className="amt-md c-success">{fmt(USER.netIncome)}</div>
          </div>
          {summary.variableIncome > 0 && (
            <div style={{textAlign:'right'}}>
              <div className="fs-11 c-muted mb-3">Renda variável</div>
              <div className="amt-md" style={{color:'var(--orange)', fontFamily:'DM Mono'}}>{fmt(summary.variableIncome)}</div>
            </div>
          )}
          <div style={{textAlign:'right'}}>
            <div className="fs-11 c-muted mb-3">Total do mês</div>
            <div className="amt-lg c-success">{fmt(summary.totalIncome)}</div>
          </div>
        </div>

        {summary.variableIncome > 0 ? (
          <>
            <div style={{height:6,background:'rgba(0,184,148,0.15)',borderRadius:100,overflow:'hidden',marginBottom:6}}>
              <div style={{height:'100%',width:`${Math.round((USER.netIncome/summary.totalIncome)*100)}%`,background:'var(--success)',borderRadius:100}}/>
            </div>
            <div className="row-between">
              <span className="fs-11" style={{color:'var(--success)'}}>CLT {Math.round((USER.netIncome/summary.totalIncome)*100)}%</span>
              <span className="fs-11" style={{color:'var(--orange)'}}>Variável {Math.round((summary.variableIncome/summary.totalIncome)*100)}%</span>
            </div>
          </>
        ) : (
          <div style={{padding:'6px 10px',background:'rgba(0,184,148,0.08)',borderRadius:10}}>
            <div className="fs-12" style={{color:'var(--success)'}}>
              💡 Adicione suas aulas na UNOPAR, convites e freelas para ver a renda real do mês.
            </div>
          </div>
        )}

        {incomes.length > 0 && (
          <>
            <div className="divider" style={{margin:'10px 0'}}/>
            {incomes.map(inc => {
              const src = INCOME_SOURCES.find(s => s.id === inc.category) || { icon:'💰', name:'Receita', color:'var(--success)' }
              return (
                <div key={inc.id} className="tx-item" style={{cursor:'pointer'}} onClick={() => setEditTx(inc)}>
                  <div className="tx-icon" style={{background:`${src.color}15`}}>{src.icon}</div>
                  <div className="tx-body">
                    <div className="tx-desc">{inc.description}</div>
                    <div className="tx-meta">{inc.date} · {src.name}</div>
                  </div>
                  <div className="amt-xs c-success">+{fmt(inc.amount)}</div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid-2 mb-12">
        <div className="card" style={{marginBottom:0,textAlign:'center'}}>
          <div className="fs-11 c-muted mb-4">Fixos</div>
          <div className="amt-sm c-secondary">-{fmt(summary.fixedTotal)}</div>
        </div>
        <div className="card" style={{marginBottom:0,textAlign:'center'}}>
          <div className="fs-11 c-muted mb-4">Variáveis</div>
          <div className="amt-sm c-danger">-{fmt(summary.expenses)}</div>
        </div>
      </div>

      {/* Fixed expenses */}
      <div className="card">
        <div className="section-label">📌 Gastos fixos</div>
        {fixed.map(f => (
          <div key={f.id} className="tx-item">
            <div className="tx-icon" style={{background:'var(--bg-elevated)'}}>{f.icon}</div>
            <div className="tx-body">
              <div className="tx-desc">{f.name}</div>
              <div className="tx-meta">{CATEGORIES.find(c=>c.id===f.category)?.name}</div>
            </div>
            <div className="amt-xs c-danger">-{fmt(f.amount)}</div>
          </div>
        ))}
        <div className="divider"/>
        <div className="row-between">
          <span className="fs-13 fw-600">Total fixos</span>
          <span className="amt-xs c-danger fw-600">-{fmt(summary.fixedTotal)}</span>
        </div>
      </div>

      {/* Variable transactions */}
      <div className="card">
        <div className="row-between mb-12">
          <div className="section-label" style={{marginBottom:0}}>Lançamentos variáveis</div>
          <span className="badge badge-accent">{expenses.length} gastos</span>
        </div>

        {expenses.length > 4 && (
          <div className="mb-10">
            <input className="input" placeholder="🔍 Buscar…" value={search} onChange={e => setSearch(e.target.value)} style={{padding:'10px 14px',fontSize:13}}/>
          </div>
        )}

        {/* Category filter */}
        {usedCats.length > 1 && (
          <div className="scroll-x mb-12">
            <div style={{display:'flex',gap:7,paddingBottom:2,width:'max-content'}}>
              <button className={`pill${filterCat==='all'?' active':''}`} onClick={() => setFilterCat('all')}>Todos</button>
              {usedCats.map(cid => {
                const cat = CATEGORIES.find(c => c.id===cid)
                if (!cat) return null
                return (
                  <button key={cid} className={`pill${filterCat===cid?' active':''}`}
                    style={filterCat===cid?{color:cat.color,borderColor:cat.color}:{}}
                    onClick={() => setFilterCat(cid)}>
                    {cat.icon} {cat.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'28px 0',color:'var(--text-muted)',fontSize:14}}>
            {expenses.length === 0 ? '📭 Nenhum gasto variável.\nImporte o CSV ou lance manualmente.' : '🔍 Nenhum resultado.'}
          </div>
        ) : (
          filtered.map(tx => {
            const isInc = tx.amount > 0
            const cat = isInc
              ? INCOME_SOURCES.find(s => s.id===tx.category) || {icon:'💰',color:'#00B894'}
              : CATEGORIES.find(c => c.id===tx.category) || {icon:'📦',color:'#94A3B8'}
            return (
              <div key={tx.id} className="tx-item" style={{cursor:'pointer'}} onClick={() => setEditTx(tx)}>
                <div className="tx-icon" style={{background:`${cat.color}15`}}>{cat.icon}</div>
                <div className="tx-body">
                  <div className="tx-desc">{tx.description}</div>
                  <div className="tx-meta">{tx.date} · {cat.name}{tx.type==='csv'?' · CSV':''}</div>
                </div>
                <div className={`amt-xs ${isInc?'c-success':'c-danger'}`}>
                  {isInc?'+':'-'}{fmt(Math.abs(tx.amount))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Sheets */}
      {showAdd && (
        <AddSheet
          month={activeMonth}
          mode={addMode}
          onClose={() => setShowAdd(false)}
          onAdd={tx => dispatch({type:'ADD_TRANSACTION',month:activeMonth,tx})}
        />
      )}
      {showImport && (
        <ImportSheet
          month={activeMonth}
          onClose={() => setShowImport(false)}
          onImport={list => dispatch({type:'UPSERT_TRANSACTIONS',month:activeMonth,list})}
        />
      )}
      {editTx && (
        <EditSheet
          tx={editTx}
          month={activeMonth}
          onClose={() => setEditTx(null)}
          onDelete={id => dispatch({type:'DELETE_TRANSACTION',month:activeMonth,id})}
          onUpdate={tx => dispatch({type:'UPDATE_TRANSACTION',month:activeMonth,tx})}
        />
      )}
    </div>
  )
}
