import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import MonthSelector from '../MonthSelector'
import { fmt, uid } from '../../utils/format'
import { CATEGORIES } from '../../constants'

function AddBillSheet({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', amount: '', category: 'moradia', icon: '📄', dueDay: '10' })
  const set = (k,v) => setForm(p => ({...p,[k]:v}))

  const QUICK_ICONS = ['🏠','⚡','🌐','🧠','🏥','🎵','📺','🤖','🚗','📱','☁️','💾','🏗️','📄']

  function submit() {
    const amt = parseFloat(form.amount.replace(',','.'))
    if (!form.name || isNaN(amt) || amt <= 0) return
    onAdd({ id: uid(), name: form.name, amount: amt, category: form.category, icon: form.icon, dueDay: parseInt(form.dueDay) || 10 })
    onClose()
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">Adicionar conta</div>

        <div className="form-group">
          <label className="form-label">Nome da conta</label>
          <input className="input" placeholder="ex: Aluguel, Plano de saúde..." value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
        </div>

        <div className="form-group">
          <label className="form-label">Valor (R$)</label>
          <input className="input input-mono" placeholder="0,00" value={form.amount} onChange={e => set('amount', e.target.value)} inputMode="decimal" />
        </div>

        <div className="grid-2" style={{ gap: 12, marginBottom: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Dia vencimento</label>
            <input className="input input-mono" placeholder="10" value={form.dueDay} onChange={e => set('dueDay', e.target.value)} inputMode="numeric" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Categoria</label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Ícone</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {QUICK_ICONS.map(ic => (
              <button key={ic} onClick={() => set('icon', ic)} style={{
                width: 40, height: 40, borderRadius: 10, border: `2px solid ${form.icon === ic ? 'var(--accent)' : 'var(--border-md)'}`,
                background: form.icon === ic ? 'var(--accent-light)' : 'var(--bg-elevated)',
                fontSize: 18, cursor: 'pointer', transition: 'all 0.1s',
              }}>{ic}</button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-full mt-12" onClick={submit}>Adicionar conta</button>
      </div>
    </div>
  )
}

export default function Contas() {
  const { state, dispatch, getBillsSummary } = useApp()
  const { activeMonth } = state
  const [showAdd, setShowAdd] = useState(false)
  const [justPaid, setJustPaid] = useState(null)

  const { allBills, paid, unpaid, totalPaid, totalUnpaid, pct, allPaid } = getBillsSummary(activeMonth)
  const [y, m] = activeMonth.split('-').map(Number)
  const monthName = new Date(y, m-1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  function toggleBill(billId) {
    const wasPaid = allBills.find(b => b.billId === billId)?.isPaid
    dispatch({ type: 'TOGGLE_BILL', month: activeMonth, billId })
    if (!wasPaid) {
      setJustPaid(billId)
      setTimeout(() => setJustPaid(null), 1200)
    }
  }

  function addCustomBill(bill) {
    dispatch({ type: 'ADD_CUSTOM_BILL', month: activeMonth, bill })
  }

  function deleteCustomBill(billId) {
    dispatch({ type: 'DELETE_CUSTOM_BILL', month: activeMonth, billId })
  }

  const billStatusData = state.bills[activeMonth] || {}
  const customBills = billStatusData._custom || []

  return (
    <div className="screen">
      {/* Header */}
      <div className="row-between mb-4">
        <div className="screen-title" style={{ marginBottom: 0 }}>Contas do Mês</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Adicionar</button>
      </div>
      <div className="fs-13 c-secondary mb-16" style={{ textTransform: 'capitalize' }}>{monthName}</div>

      <MonthSelector month={activeMonth} onChange={m => dispatch({ type: 'SET_MONTH', month: m })} />

      {/* Progress card */}
      {allBills.length > 0 && (
        <div className={allPaid ? 'card-success' : 'card-accent'} style={{ marginBottom: 12 }}>
          {allPaid ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Todas as contas pagas!</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Que festa! Você mandou bem esse mês, Davi! 💚</div>
            </div>
          ) : (
            <>
              <div className="row-between mb-12">
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Progresso</div>
                  <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{pct}%</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>{paid.length}/{allBills.length} contas pagas</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 3 }}>Falta pagar</div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 22, fontWeight: 600 }}>{fmt(totalUnpaid)}</div>
                </div>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'white', borderRadius: 100, transition: 'width 0.4s ease' }} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Stats row */}
      {allBills.length > 0 && (
        <div className="grid-2 mb-12">
          <div className="card" style={{ marginBottom: 0, textAlign: 'center' }}>
            <div className="fs-11 c-muted mb-4">✅ Pago</div>
            <div className="amt-sm c-success">{fmt(totalPaid)}</div>
            <div className="fs-11 c-muted mt-3">{paid.length} contas</div>
          </div>
          <div className="card" style={{ marginBottom: 0, textAlign: 'center' }}>
            <div className="fs-11 c-muted mb-4">⏳ Pendente</div>
            <div className="amt-sm c-warning">{fmt(totalUnpaid)}</div>
            <div className="fs-11 c-muted mt-3">{unpaid.length} contas</div>
          </div>
        </div>
      )}

      {/* Unpaid bills */}
      {unpaid.length > 0 && (
        <div className="card">
          <div className="section-label" style={{ color: 'var(--warning)' }}>⏳ Pendentes</div>
          {unpaid.map(bill => (
            <div
              key={bill.billId} className="bill-item"
              onClick={() => toggleBill(bill.billId)}
            >
              <div className="bill-check" />
              <div className="bill-icon" style={{ background: 'var(--warning-dim)' }}>{bill.icon}</div>
              <div className="bill-body">
                <div className="bill-name">{bill.name}</div>
                <div className="bill-meta">Toca para marcar como pago</div>
              </div>
              <div className="bill-amount" style={{ color: 'var(--text)' }}>-{fmt(bill.amount)}</div>
              {!bill.isFixed && (
                <button className="btn btn-xs" style={{ background: 'var(--danger-dim)', color: 'var(--danger)', border: 'none', padding: '4px 8px', marginLeft: 4 }}
                  onClick={e => { e.stopPropagation(); deleteCustomBill(bill.id) }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Paid bills */}
      {paid.length > 0 && (
        <div className="card">
          <div className="section-label" style={{ color: 'var(--success)' }}>✅ Pagas</div>
          {paid.map(bill => (
            <div key={bill.billId} className="bill-item" style={{ opacity: 0.6 }} onClick={() => toggleBill(bill.billId)}>
              <div className={`bill-check paid${justPaid === bill.billId ? ' pop' : ''}`}>
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="bill-icon" style={{ background: 'var(--success-dim)' }}>{bill.icon}</div>
              <div className="bill-body">
                <div className="bill-name" style={{ textDecoration: 'line-through' }}>{bill.name}</div>
                {bill.paidDate && <div className="bill-meta">Pago em {bill.paidDate}</div>}
              </div>
              <div className="bill-amount c-success">-{fmt(bill.amount)}</div>
            </div>
          ))}
        </div>
      )}

      {allBills.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div className="fs-15 fw-700 mb-6">Sem contas cadastradas</div>
          <div className="fs-13 c-secondary mb-16 lh-16">
            Aqui você substitui o grupo do WhatsApp!{'\n'}
            As contas fixas já aparecem automaticamente.{'\n'}
            Adicione contas extras com o botão acima.
          </div>
        </div>
      )}

      {/* Tip Primo/Nati style */}
      <div className="card" style={{ border: '1.5px solid var(--accent-border)', background: 'var(--accent-light)' }}>
        <div className="fs-12 fw-700 c-accent mb-6">💡 Primo Pobre diz:</div>
        <div className="fs-13 c-secondary lh-16">
          Marque cada conta como paga no dia que pagar. No fim do mês, você vai saber exatamente o que saiu — sem surpresa, sem grupo no WhatsApp, sem memória.
        </div>
      </div>

      {showAdd && <AddBillSheet onClose={() => setShowAdd(false)} onAdd={addCustomBill} />}
    </div>
  )
}
