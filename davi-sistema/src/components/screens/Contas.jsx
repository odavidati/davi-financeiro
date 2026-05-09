import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import MonthSelector from '../MonthSelector'
import { DEFAULT_FIXED, PRESET_BILLS, CATEGORIES } from '../../constants'
import { fmt, uid, monthLabel } from '../../utils/format'

/* ─── Add custom bill sheet ─── */
function AddBillSheet({ onClose, onAdd }) {
  const [form, setForm] = useState({ name:'', amount:'', category:'moradia', icon:'📄', dueDay:'10', note:'' })
  const set = (k,v) => setForm(p => ({...p,[k]:v}))
  const QUICK_ICONS = ['🏠','⚡','🌐','🏥','🎵','📺','🤖','🚗','📱','☁️','💾','🏗️','📄','💊','🛍️','🛒','🏪','📊','⚠️','💳']

  function submit() {
    const amt = parseFloat(form.amount.replace(',','.'))
    if (!form.name || isNaN(amt) || amt <= 0) return
    onAdd({ id: uid(), name: form.name, amount: amt, category: form.category, icon: form.icon, dueDay: parseInt(form.dueDay)||10, note: form.note })
    onClose()
  }
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title">Adicionar conta</div>
        <div className="form-group">
          <label className="form-label">Nome</label>
          <input className="input" placeholder="ex: Shopee crédito, Cartão Senff…" value={form.name} onChange={e => set('name',e.target.value)} autoFocus/>
        </div>
        <div className="grid-2" style={{gap:12,marginBottom:14}}>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Valor (R$)</label>
            <input className="input input-mono" placeholder="0,00" value={form.amount} onChange={e => set('amount',e.target.value)} inputMode="decimal"/>
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Dia venc.</label>
            <input className="input input-mono" placeholder="10" value={form.dueDay} onChange={e => set('dueDay',e.target.value)} inputMode="numeric"/>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="input" value={form.category} onChange={e => set('category',e.target.value)}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Observação (opcional)</label>
          <input className="input" placeholder="ex: parcela 1/3, boleto Bradesco…" value={form.note} onChange={e => set('note',e.target.value)}/>
        </div>
        <div className="form-group">
          <label className="form-label">Ícone</label>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {QUICK_ICONS.map(ic => (
              <button key={ic} onClick={() => set('icon',ic)} style={{width:40,height:40,borderRadius:10,border:`2px solid ${form.icon===ic?'var(--accent)':'var(--border-md)'}`,background:form.icon===ic?'var(--accent-light)':'var(--bg-elevated)',fontSize:18,cursor:'pointer',transition:'all 0.1s'}}>{ic}</button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-full mt-12" onClick={submit}>Adicionar conta</button>
      </div>
    </div>
  )
}

/* ─── Edit fixed expense sheet ─── */
function EditFixedSheet({ bill, month, onClose, dispatch, customFixed }) {
  const overrides = customFixed?.amounts || {}
  const isHidden  = customFixed?.hidden?.[bill.id] || false
  const [amount, setAmount] = useState(String(overrides[bill.id] ?? bill.amount))

  function saveAmount() {
    const amt = parseFloat(amount.replace(',','.'))
    if (!isNaN(amt) && amt > 0) {
      dispatch({ type:'SET_FIXED_AMOUNT', month, fixedId: bill.id, amount: amt })
    }
    onClose()
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title">{bill.icon} {bill.name}</div>
        <div className="alert alert-info mb-16">
          <span className="alert-icon">ℹ️</span>
          <span className="fs-13">Ajuste só para <strong>{monthLabel(month)}</strong>. Não afeta outros meses.</span>
        </div>
        <div className="form-group">
          <label className="form-label">Valor deste mês (R$)</label>
          <input className="input input-mono" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" autoFocus/>
        </div>
        <div className="divider"/>
        <div className="row-between mb-16">
          <div>
            <div className="fs-14 fw-600">Ocultar este mês</div>
            <div className="fs-12 c-muted">Remove esta conta de {monthLabel(month)}</div>
          </div>
          <button
            className={`btn btn-sm ${isHidden ? 'btn-danger' : 'btn-ghost'}`}
            onClick={() => { dispatch({ type:'TOGGLE_FIXED_HIDDEN', month, fixedId: bill.id }); onClose() }}
          >
            {isHidden ? '✓ Oculta' : 'Ocultar'}
          </button>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={saveAmount}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Reminder sheet ─── */
function ReminderSheet({ month, onClose, dispatch }) {
  const [form, setForm] = useState({ title:'', amount:'', dueDate:`${month}-10`, icon:'🔔', note:'' })
  const set = (k,v) => setForm(p => ({...p,[k]:v}))
  const QUICK_ICONS = ['🔔','💳','🏦','📱','🛒','⚡','💊','🎓','🏠','🚗','📊','⚠️']

  function submit() {
    const amt = parseFloat(form.amount.replace(',','.'))
    if (!form.title.trim()) return
    dispatch({ type:'ADD_REMINDER', reminder: { id: uid(), title: form.title.trim(), amount: isNaN(amt)?0:amt, dueDate: form.dueDate, icon: form.icon, note: form.note, done: false } })
    onClose()
  }
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title">🔔 Novo lembrete</div>
        <div className="form-group">
          <label className="form-label">O que lembrar</label>
          <input className="input" placeholder="ex: Pagar boleto Shopee, Renovar seguro…" value={form.title} onChange={e => set('title',e.target.value)} autoFocus/>
        </div>
        <div className="grid-2" style={{gap:12,marginBottom:14}}>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Valor (opcional)</label>
            <input className="input input-mono" placeholder="0,00" value={form.amount} onChange={e => set('amount',e.target.value)} inputMode="decimal"/>
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Data</label>
            <input className="input" type="date" value={form.dueDate} onChange={e => set('dueDate',e.target.value)}/>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Observação</label>
          <input className="input" placeholder="detalhes opcionais…" value={form.note} onChange={e => set('note',e.target.value)}/>
        </div>
        <div className="form-group">
          <label className="form-label">Ícone</label>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {QUICK_ICONS.map(ic => (
              <button key={ic} onClick={() => set('icon',ic)} style={{width:40,height:40,borderRadius:10,border:`2px solid ${form.icon===ic?'var(--accent)':'var(--border-md)'}`,background:form.icon===ic?'var(--accent-light)':'var(--bg-elevated)',fontSize:18,cursor:'pointer'}}>{ic}</button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-full mt-12" onClick={submit}>Criar lembrete</button>
      </div>
    </div>
  )
}

/* ─── Bill row ─── */
function BillRow({ bill, onToggle, onEdit, onDelete, highlight }) {
  const overdue = bill.dueDay && !bill.isPaid && (() => {
    const today = new Date().getDate()
    const [,, activeM] = (bill.month || '').split('-')
    return parseInt(activeM) === new Date().getMonth()+1 && today > (bill.dueDay||0)
  })()

  return (
    <div
      className="bill-item"
      style={{ opacity: bill.isPaid ? 0.55 : 1, background: highlight ? 'rgba(108,58,224,0.04)' : 'transparent', borderRadius: highlight ? 10 : 0, padding: highlight ? '14px 8px' : '14px 0', margin: highlight ? '0 -8px' : 0 }}
      onClick={() => onToggle(bill.billId)}
    >
      <div className={`bill-check${bill.isPaid ? ' paid' : ''}`}>
        {bill.isPaid && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div className="bill-icon" style={{ background: bill.isPaid ? 'var(--success-dim)' : overdue ? 'var(--danger-dim)' : 'var(--bg-elevated)' }}>
        {bill.icon}
      </div>
      <div className="bill-body">
        <div className="bill-name" style={{ textDecoration: bill.isPaid ? 'line-through' : 'none' }}>
          {bill.name}
          {overdue && !bill.isPaid && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--danger)', fontWeight: 700 }}>VENCIDA</span>}
        </div>
        <div className="bill-meta">
          {bill.dueDay && !bill.isPaid && `Vence dia ${bill.dueDay}  ·  `}
          {bill.note && `${bill.note}  ·  `}
          {bill.isPaid && bill.paidDate ? `Pago em ${bill.paidDate}` : bill.isFixed ? 'Fixo' : bill.isPreset ? 'Especial' : 'Extra'}
        </div>
      </div>
      <div className="col" style={{ alignItems:'flex-end', gap: 4, flexShrink: 0 }}>
        <div className="bill-amount" style={{ color: bill.isPaid ? 'var(--success)' : overdue ? 'var(--danger)' : 'var(--text)' }}>
          -{fmt(bill.amount)}
        </div>
        {(bill.isFixed || !bill.isPreset) && (
          <button
            className="btn btn-xs"
            style={{ background:'var(--bg-elevated)', color:'var(--text-muted)', border:'1px solid var(--border-md)', padding:'3px 7px', fontSize:10 }}
            onClick={e => { e.stopPropagation(); onEdit && onEdit(bill) }}
          >
            {bill.isFixed ? '✏️' : '×'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── MAIN SCREEN ─── */
export default function Contas() {
  const { state, dispatch, getBillsSummary, getFixed, getCustomFixed, getReminders } = useApp()
  const { activeMonth } = state
  const [showAdd, setShowAdd]         = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [editBill, setEditBill]       = useState(null)

  const { allBills, paid, unpaid, totalPaid, totalUnpaid, pct, allPaid } = getBillsSummary(activeMonth)
  const reminders   = getReminders(activeMonth)
  const customFixed = getCustomFixed(activeMonth)

  const [y, m] = activeMonth.split('-').map(Number)
  const monthName = new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})

  function handleEdit(bill) {
    if (bill.isFixed) setEditBill(bill)
    else if (!bill.isPreset) dispatch({ type:'DELETE_CUSTOM_BILL', month: activeMonth, billId: bill.id })
  }

  // Sort unpaid by dueDay
  const unpaidSorted = [...unpaid].sort((a,b) => (a.dueDay||99) - (b.dueDay||99))

  return (
    <div className="screen">
      <div className="row-between mb-4">
        <div className="screen-title" style={{marginBottom:0}}>Contas</div>
        <div className="row gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowReminder(true)}>🔔</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Extra</button>
        </div>
      </div>
      <div className="fs-13 c-secondary mb-16" style={{textTransform:'capitalize'}}>{monthName}</div>

      <MonthSelector month={activeMonth} onChange={m => dispatch({type:'SET_MONTH',month:m})}/>

      {/* Progress */}
      {allBills.length > 0 && (
        <div className={allPaid ? 'card-success' : 'card-accent'} style={{marginBottom:12}}>
          {allPaid ? (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:8}}>🎉</div>
              <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Todas pagas!</div>
              <div style={{fontSize:13,opacity:0.9}}>Que festa! Você mandou bem, Davi! 💚</div>
            </div>
          ) : (
            <>
              <div className="row-between mb-12">
                <div>
                  <div style={{fontSize:11,fontWeight:600,opacity:0.8,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Progresso</div>
                  <div style={{fontSize:26,fontWeight:800,lineHeight:1}}>{pct}%</div>
                  <div style={{fontSize:12,opacity:0.8,marginTop:3}}>{paid.length}/{allBills.length} contas pagas</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,opacity:0.8,marginBottom:3}}>Ainda falta</div>
                  <div style={{fontFamily:'DM Mono',fontSize:22,fontWeight:600}}>{fmt(totalUnpaid)}</div>
                </div>
              </div>
              <div style={{height:8,background:'rgba(255,255,255,0.25)',borderRadius:100,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pct}%`,background:'white',borderRadius:100,transition:'width 0.4s ease'}}/>
              </div>
            </>
          )}
        </div>
      )}

      {/* Stats */}
      {allBills.length > 0 && (
        <div className="grid-2 mb-12">
          <div className="card" style={{marginBottom:0,textAlign:'center'}}>
            <div className="fs-11 c-muted mb-4">✅ Pago</div>
            <div className="amt-sm c-success">{fmt(totalPaid)}</div>
            <div className="fs-11 c-muted mt-3">{paid.length} contas</div>
          </div>
          <div className="card" style={{marginBottom:0,textAlign:'center'}}>
            <div className="fs-11 c-muted mb-4">⏳ Pendente</div>
            <div className="amt-sm c-warning">{fmt(totalUnpaid)}</div>
            <div className="fs-11 c-muted mt-3">{unpaid.length} contas</div>
          </div>
        </div>
      )}

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="card" style={{border:'1.5px solid rgba(251,191,36,0.3)',marginBottom:12}}>
          <div className="section-label" style={{color:'var(--warning)'}}>🔔 Lembretes do mês</div>
          {reminders.map(r => (
            <div key={r.id} className="row-between" style={{padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
              <div className="row gap-10">
                <span style={{fontSize:20}}>{r.icon}</span>
                <div>
                  <div className="fs-14 fw-600" style={{textDecoration:r.done?'line-through':'none'}}>{r.title}</div>
                  <div className="fs-12 c-muted">{r.dueDate}{r.note && ` · ${r.note}`}</div>
                </div>
              </div>
              <div className="row gap-8">
                {r.amount > 0 && <span className="amt-xs">{fmt(r.amount)}</span>}
                <button className="btn btn-xs btn-ghost" onClick={() => dispatch({type:'DELETE_REMINDER',id:r.id})}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unpaid */}
      {unpaidSorted.length > 0 && (
        <div className="card">
          <div className="section-label" style={{color:'var(--warning)'}}>⏳ A pagar</div>
          {unpaidSorted.map(bill => (
            <BillRow
              key={bill.billId}
              bill={{...bill, month: activeMonth}}
              onToggle={billId => dispatch({type:'TOGGLE_BILL',month:activeMonth,billId})}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Paid */}
      {paid.length > 0 && (
        <div className="card">
          <div className="section-label" style={{color:'var(--success)'}}>✅ Pagas</div>
          {paid.map(bill => (
            <BillRow
              key={bill.billId}
              bill={{...bill, month: activeMonth}}
              onToggle={billId => dispatch({type:'TOGGLE_BILL',month:activeMonth,billId})}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {allBills.length === 0 && (
        <div className="card" style={{textAlign:'center',padding:'32px 20px'}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <div className="fs-15 fw-700 mb-8">Sem contas para este mês</div>
          <div className="fs-13 c-secondary lh-16 mb-16">
            As contas fixas aparecem aqui automaticamente.<br/>
            Use "+ Extra" para adicionar Shopee, Senff e outras contas específicas.
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="card" style={{background:'var(--accent-light)',border:'1.5px solid var(--accent-border)'}}>
        <div className="fs-12 fw-700 c-accent mb-6">💡 Dica</div>
        <div className="fs-13 c-secondary lh-16">
          Toque em qualquer conta para marcar como paga. Use ✏️ nos fixos para ajustar valores do mês. Adicione lembretes com 🔔 para datas importantes.
        </div>
      </div>

      {showAdd && (
        <AddBillSheet
          onClose={() => setShowAdd(false)}
          onAdd={bill => dispatch({type:'ADD_CUSTOM_BILL',month:activeMonth,bill})}
        />
      )}
      {showReminder && (
        <ReminderSheet
          month={activeMonth}
          onClose={() => setShowReminder(false)}
          dispatch={dispatch}
        />
      )}
      {editBill && (
        <EditFixedSheet
          bill={editBill}
          month={activeMonth}
          onClose={() => setEditBill(null)}
          dispatch={dispatch}
          customFixed={customFixed}
        />
      )}
    </div>
  )
}
