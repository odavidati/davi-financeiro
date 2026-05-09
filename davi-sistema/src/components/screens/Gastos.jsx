import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import MonthSelector from '../MonthSelector'
import { CATEGORIES } from '../../constants'
import { parseNubankCSV } from '../../utils/csvParser'
import { categorize } from '../../utils/categorizer'
import { fmt, uid } from '../../utils/format'

/* ─── Add transaction sheet ─── */
function AddSheet({ month, onClose, onAdd }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'outros',
    date: `${month}-15`,
    type: 'expense',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function handleDescChange(e) {
    const desc = e.target.value
    set('description', desc)
    if (desc.length > 2) set('category', categorize(desc))
  }

  function submit() {
    const amt = parseFloat(form.amount.replace(',', '.'))
    if (!form.description.trim() || isNaN(amt) || amt <= 0) return
    onAdd({
      id: uid(),
      date: form.date,
      description: form.description.trim(),
      amount: form.type === 'expense' ? -amt : amt,
      category: form.category,
      type: 'manual',
    })
    onClose()
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">Novo lançamento</div>

        {/* Type toggle */}
        <div className="row gap-8 mb-16">
          {[
            { t: 'expense', label: '↓ Despesa', color: 'var(--danger)', bg: 'var(--danger-dim)' },
            { t: 'income',  label: '↑ Receita', color: 'var(--success)', bg: 'var(--success-dim)' },
          ].map(({ t, label, color, bg }) => (
            <button
              key={t}
              className="btn btn-sm flex-1"
              style={{
                background: form.type === t ? bg : 'var(--bg-elevated)',
                color: form.type === t ? color : 'var(--text-muted)',
                border: `1.5px solid ${form.type === t ? color : 'var(--border-md)'}`,
              }}
              onClick={() => set('type', t)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input
            className="input"
            placeholder="ex: Uber, iFood, Farmácia…"
            value={form.description}
            onChange={handleDescChange}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Valor (R$)</label>
          <input
            className="input input-mono"
            placeholder="0,00"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            inputMode="decimal"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Data</label>
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Categoria
            {form.description.length > 2 && (
              <span className="badge badge-accent" style={{ marginLeft: 8, fontSize: 10 }}>
                auto
              </span>
            )}
          </label>
          <select
            className="input"
            value={form.category}
            onChange={e => set('category', e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary btn-full" onClick={submit}>
          Lançar
        </button>
      </div>
    </div>
  )
}

/* ─── CSV import sheet ─── */
function ImportSheet({ month, onClose, onImport }) {
  const [stage, setStage] = useState('idle') // idle | preview | error
  const [txs, setTxs] = useState([])
  const [errors, setErrors] = useState([])
  const [csvErrors, setCsvErrors] = useState([])
  const fileRef = useRef()

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { transactions, errors: errs } = parseNubankCSV(ev.target.result)
      setCsvErrors(errs)
      if (transactions.length === 0 && errs.length > 0) {
        setErrors(errs)
        setStage('error')
      } else {
        setTxs(transactions)
        setStage('preview')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  function confirm() {
    onImport(txs)
    onClose()
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">Importar CSV Nubank</div>

        <div className="alert alert-info mb-16">
          <span className="alert-icon">💡</span>
          <div className="fs-13">
            <strong>Como exportar:</strong> App Nubank → Extrato → ⋯ (3 pontos) → Exportar planilha.
            Formato: <span style={{ fontFamily: 'DM Mono', fontSize: 12 }}>Data, Valor, ID, Descrição</span>
          </div>
        </div>

        {stage === 'idle' && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <button
              className="btn btn-primary btn-full"
              onClick={() => fileRef.current?.click()}
            >
              📂 Selecionar arquivo CSV
            </button>
          </>
        )}

        {stage === 'error' && (
          <>
            <div className="alert alert-danger mb-16">
              <span className="alert-icon">❌</span>
              <div>
                <div className="fw-700 mb-4">Erro ao processar</div>
                {errors.slice(0, 3).map((e, i) => (
                  <div key={i} className="fs-12 c-secondary">{e}</div>
                ))}
              </div>
            </div>
            <button className="btn btn-ghost btn-full" onClick={() => setStage('idle')}>
              Tentar novamente
            </button>
          </>
        )}

        {stage === 'preview' && (
          <>
            <div className="alert alert-ok mb-12">
              <span className="alert-icon">✅</span>
              <span className="fs-13">
                <strong>{txs.length} transações</strong> encontradas
                {csvErrors.length > 0 && ` (${csvErrors.length} linhas ignoradas)`}
              </span>
            </div>

            {/* Preview list */}
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
              {txs.slice(0, 25).map((tx, i) => {
                const cat = CATEGORIES.find(c => c.id === tx.category)
                return (
                  <div key={i} className="tx-item" style={{ padding: '9px 12px' }}>
                    <div
                      className="tx-icon"
                      style={{ background: `${cat?.color || '#94A3B8'}18`, width: 34, height: 34, fontSize: 15, borderRadius: 9 }}
                    >
                      {cat?.icon || '📦'}
                    </div>
                    <div className="tx-body">
                      <div className="tx-desc fs-13">{tx.description}</div>
                      <div className="tx-meta">{tx.date} · {cat?.name}</div>
                    </div>
                    <div className={`amt-xs ${tx.amount < 0 ? 'c-danger' : 'c-success'}`}>
                      {tx.amount < 0 ? '-' : '+'}{fmt(Math.abs(tx.amount))}
                    </div>
                  </div>
                )
              })}
              {txs.length > 25 && (
                <div className="fs-12 c-muted text-center" style={{ padding: '8px 0' }}>
                  + {txs.length - 25} transações…
                </div>
              )}
            </div>

            <div className="row gap-8">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStage('idle')}>
                Cancelar
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={confirm}>
                ✅ Importar {txs.length} transações
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Edit transaction sheet ─── */
function EditSheet({ tx, month, onClose, onDelete, onUpdate }) {
  const [cat, setCat] = useState(tx.category)

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title" style={{ fontSize: 16 }}>{tx.description}</div>

        <div className="row gap-8 mb-16">
          <div
            className={`amt-lg ${tx.amount < 0 ? 'c-danger' : 'c-success'}`}
          >
            {tx.amount < 0 ? '-' : '+'}{fmt(Math.abs(tx.amount))}
          </div>
          <div className="fs-12 c-muted">{tx.date}</div>
          {tx.type === 'csv' && <span className="badge badge-muted">CSV</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select
            className="input"
            value={cat}
            onChange={e => {
              setCat(e.target.value)
              onUpdate({ ...tx, category: e.target.value })
            }}
          >
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-danger btn-full mt-12"
          onClick={() => { onDelete(tx.id); onClose() }}
        >
          🗑️ Excluir lançamento
        </button>
      </div>
    </div>
  )
}

/* ─── MAIN SCREEN ─── */
export default function Gastos() {
  const { state, dispatch, getTx, getFixed } = useApp()
  const { activeMonth } = state
  const [showAdd, setShowAdd]       = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editTx, setEditTx]         = useState(null)
  const [filterCat, setFilterCat]   = useState('all')
  const [search, setSearch]         = useState('')

  const txs   = getTx(activeMonth)
  const fixed = getFixed(activeMonth)

  const usedCats = [...new Set(txs.map(t => t.category))]

  const filtered = txs
    .filter(t => filterCat === 'all' || t.category === filterCat)
    .filter(t => !search || t.description.toLowerCase().includes(search.toLowerCase()))

  const totalExpenses = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalFixed    = fixed.reduce((s, f) => s + f.amount, 0)

  return (
    <div className="screen">
      <div className="screen-title">Gastos</div>

      <MonthSelector
        month={activeMonth}
        onChange={m => dispatch({ type: 'SET_MONTH', month: m })}
      />

      {/* Quick actions */}
      <div className="row gap-8 mb-12">
        <button className="btn btn-primary flex-1" onClick={() => setShowAdd(true)}>
          + Lançar
        </button>
        <button className="btn btn-ghost flex-1" onClick={() => setShowImport(true)}>
          📥 CSV Nubank
        </button>
      </div>

      {/* Summary row */}
      <div className="grid-2 mb-12">
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 13px' }}>
          <div className="fs-11 c-muted mb-4">Fixos</div>
          <div className="amt-sm c-secondary">-{fmt(totalFixed)}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 13px' }}>
          <div className="fs-11 c-muted mb-4">Variáveis</div>
          <div className="amt-sm c-danger">-{fmt(totalExpenses)}</div>
        </div>
      </div>

      {/* Fixed expenses */}
      <div className="card">
        <div className="section-label">Gastos fixos do mês</div>
        {fixed.map(f => (
          <div key={f.id} className="tx-item">
            <div className="tx-icon" style={{ background: 'rgba(255,255,255,0.04)' }}>{f.icon}</div>
            <div className="tx-body">
              <div className="tx-desc">{f.name}</div>
              <div className="tx-meta">{CATEGORIES.find(c => c.id === f.category)?.name}</div>
            </div>
            <div className="amt-xs c-danger">-{fmt(f.amount)}</div>
          </div>
        ))}
        <div className="divider" />
        <div className="row-between">
          <span className="fs-13 fw-600">Total fixos</span>
          <span className="amt-xs c-danger fw-600">-{fmt(totalFixed)}</span>
        </div>
      </div>

      {/* Variable transactions */}
      <div className="card">
        <div className="row-between mb-12">
          <div className="section-label" style={{ marginBottom: 0 }}>Lançamentos variáveis</div>
          <span className="badge badge-accent">{txs.length}</span>
        </div>

        {/* Search */}
        {txs.length > 4 && (
          <div className="mb-10">
            <input
              className="input"
              placeholder="🔍 Buscar lançamento…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '10px 14px', fontSize: 13 }}
            />
          </div>
        )}

        {/* Category filter */}
        {usedCats.length > 1 && (
          <div className="scroll-x mb-12">
            <div style={{ display: 'flex', gap: 7, paddingBottom: 2, width: 'max-content' }}>
              <button
                className={`pill${filterCat === 'all' ? ' active' : ''}`}
                style={filterCat === 'all' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
                onClick={() => setFilterCat('all')}
              >
                Todos
              </button>
              {usedCats.map(cid => {
                const cat = CATEGORIES.find(c => c.id === cid)
                if (!cat) return null
                return (
                  <button
                    key={cid}
                    className={`pill${filterCat === cid ? ' active' : ''}`}
                    style={filterCat === cid ? { color: cat.color, borderColor: cat.color } : {}}
                    onClick={() => setFilterCat(cid)}
                  >
                    {cat.icon} {cat.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            {txs.length === 0
              ? '📭 Nenhum lançamento ainda.\nImporte o CSV do Nubank ou lance manualmente.'
              : '🔍 Nenhum resultado encontrado.'}
          </div>
        ) : (
          filtered.map(tx => {
            const cat = CATEGORIES.find(c => c.id === tx.category)
            return (
              <div
                key={tx.id}
                className="tx-item"
                style={{ cursor: 'pointer' }}
                onClick={() => setEditTx(tx)}
              >
                <div
                  className="tx-icon"
                  style={{ background: `${cat?.color || '#94A3B8'}15` }}
                >
                  {cat?.icon || '📦'}
                </div>
                <div className="tx-body">
                  <div className="tx-desc">{tx.description}</div>
                  <div className="tx-meta">
                    {tx.date} · {cat?.name}
                    {tx.type === 'csv' && ' · CSV'}
                  </div>
                </div>
                <div className={`amt-xs ${tx.amount < 0 ? 'c-danger' : 'c-success'}`}>
                  {tx.amount < 0 ? '-' : '+'}{fmt(Math.abs(tx.amount))}
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
          onClose={() => setShowAdd(false)}
          onAdd={tx => dispatch({ type: 'ADD_TRANSACTION', month: activeMonth, tx })}
        />
      )}
      {showImport && (
        <ImportSheet
          month={activeMonth}
          onClose={() => setShowImport(false)}
          onImport={list => dispatch({ type: 'UPSERT_TRANSACTIONS', month: activeMonth, list })}
        />
      )}
      {editTx && (
        <EditSheet
          tx={editTx}
          month={activeMonth}
          onClose={() => setEditTx(null)}
          onDelete={id => dispatch({ type: 'DELETE_TRANSACTION', month: activeMonth, id })}
          onUpdate={tx => dispatch({ type: 'UPDATE_TRANSACTION', month: activeMonth, tx })}
        />
      )}
    </div>
  )
}
