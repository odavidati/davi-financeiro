import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import MonthSelector from '../MonthSelector'
import { DEFAULT_FIXED, PRESET_BILLS, CATEGORIES } from '../../constants'
import { fmt, uid, monthLabel } from '../../utils/format'

/* ─── Add custom bill sheet ─── */
function AddBillSheet({ onClose, onAdd }) {
  const [form, setForm] = useState({ name:'', amount:'', category:'moradia', icon:'📄', dueDay:'10', note:'' })
  const set = (k,v) => setForm(p => ({...p,[k]:v}))
  const ICONS = ['🏠','⚡','🌐','🏥','🎵','📺','🤖','🚗','📱','☁️','💾','🏗️','📄','💳','🛒','🏪','📊','⚠️','🎓','💊']

  function submit() {
    const amt = parseFloat(form.amount.replace(',','.'))
    if (!form.name.trim() || isNaN(amt) || amt <= 0) return
    onAdd({ id:uid(), name:form.name.trim(), amount:amt, category:form.category, icon:form.icon, dueDay:parseInt(form.dueDay)||10, note:form.note })
    onClose()
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title">Adicionar conta</div>
        <div className="form-group">
          <label className="form-label">Nome</label>
          <input className="input" placeholder="ex: Aluguel, Cartão Renner…" value={form.name} onChange={e => set('name',e.target.value)} autoFocus/>
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
          <input className="input" placeholder="ex: vence todo dia 10, boleto Bradesco…" value={form.note} onChange={e => set('note',e.target.value)}/>
        </div>
        <div className="form-group">
          <label className="form-label">Ícone</label>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            {ICONS.map(ic => (
              <button key={ic} onClick={() => set('icon',ic)} style={{width:38,height:38,borderRadius:9,border:`2px solid ${form.icon===ic?'var(--accent)':'var(--border-md)'}`,background:form.icon===ic?'var(--accent-light)':'var(--bg-elevated)',fontSize:17,cursor:'pointer'}}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-full mt-12" onClick={submit}>Adicionar conta</button>
      </div>
    </div>
  )
}

/* ─── Edit fixed amount sheet ─── */
function EditFixedSheet({ bill, month, onClose, dispatch, customFixed }) {
  const overrides = customFixed?.amounts || {}
  const [amount, setAmount] = useState(String(overrides[bill.id] ?? bill.amount))

  function save() {
    const amt = parseFloat(amount.replace(',','.'))
    if (!isNaN(amt) && amt > 0) dispatch({ type:'SET_FIXED_AMOUNT', month, fixedId:bill.id, amount:amt })
    onClose()
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title">{bill.icon} {bill.name}</div>
        <div className="alert alert-info mb-16">
          <span className="alert-icon">ℹ️</span>
          <span className="fs-13">Ajuste só para <strong>{monthLabel(month)}</strong>.</span>
        </div>
        <div className="form-group">
          <label className="form-label">Valor deste mês (R$)</label>
          <input className="input input-mono" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" autoFocus/>
        </div>
        <div className="divider"/>
        <div className="row-between mb-16">
          <div>
            <div className="fs-14 fw-600">Ocultar este mês</div>
            <div className="fs-12 c-muted">Remove de {monthLabel(month)}</div>
          </div>
          <button className="btn btn-sm btn-danger" onClick={() => { dispatch({ type:'TOGGLE_FIXED_HIDDEN', month, fixedId:bill.id }); onClose() }}>
            Ocultar
          </button>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Reminder sheet ─── */
function ReminderSheet({ month, onClose, dispatch }) {
  const [form, setForm] = useState({ title:'', amount:'', dueDate:`${month}-10`, icon:'🔔', note:'' })
  const set = (k,v) => setForm(p => ({...p,[k]:v}))

  function submit() {
    if (!form.title.trim()) return
    const amt = parseFloat(form.amount.replace(',','.'))
    dispatch({ type:'ADD_REMINDER', reminder:{ id:uid(), title:form.title.trim(), amount:isNaN(amt)?0:amt, dueDate:form.dueDate, icon:form.icon, note:form.note, done:false } })
    onClose()
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title">🔔 Novo lembrete</div>
        <div className="form-group">
          <label className="form-label">O que lembrar</label>
          <input className="input" placeholder="ex: Pagar boleto Shopee, Renovar CNH…" value={form.title} onChange={e => set('title',e.target.value)} autoFocus/>
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
        <button className="btn btn-primary btn-full mt-12" onClick={submit}>Criar lembrete</button>
      </div>
    </div>
  )
}

/* ─── Bill row ─── */
function BillRow({ bill, onToggle, onEdit, onDelete }) {
  const today = new Date().getDate()
  const curMonth = new Date().getMonth() + 1
  const [,, bm] = (bill.month||'').split('-').map(Number)
  const overdue = bill.dueDay && !bill.isPaid && curMonth === bm && today > bill.dueDay

  return (
    <div style={{display:'flex',alignItems:'center',gap:11,padding:'13px 0',borderBottom:'1px solid var(--border)',cursor:'pointer'}} onClick={() => onToggle(bill.billId)}>
      {/* Check */}
      <div style={{width:24,height:24,borderRadius:'50%',border:`2.5px solid ${bill.isPaid?'var(--success)':overdue?'var(--danger)':'var(--border-strong)'}`,background:bill.isPaid?'var(--success)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}>
        {bill.isPaid && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5l3.5 3L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      {/* Icon */}
      <div style={{width:38,height:38,borderRadius:11,background:bill.isPaid?'var(--success-dim)':overdue?'var(--danger-dim)':'var(--bg-elevated)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
        {bill.icon}
      </div>
      {/* Info */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:600,textDecoration:bill.isPaid?'line-through':'none',color:bill.isPaid?'var(--text-muted)':'var(--text)',display:'flex',alignItems:'center',gap:6}}>
          {bill.name}
          {overdue && !bill.isPaid && <span style={{fontSize:10,fontWeight:700,color:'var(--danger)',background:'var(--danger-dim)',padding:'2px 6px',borderRadius:100}}>VENCIDA</span>}
        </div>
        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
          {bill.isPaid && bill.paidDate ? `✅ Pago em ${bill.paidDate}` : bill.dueDay ? `Vence dia ${bill.dueDay}` : bill.isFixed ? 'Conta fixa' : bill.isPreset ? 'Conta especial' : 'Extra'}
          {bill.note ? ` · ${bill.note}` : ''}
        </div>
      </div>
      {/* Amount + edit */}
      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        <div style={{fontFamily:'DM Mono',fontSize:14,fontWeight:600,color:bill.isPaid?'var(--success)':overdue?'var(--danger)':'var(--text)'}}>
          -{fmt(bill.amount)}
        </div>
        {(bill.isFixed || (!bill.isPreset && !bill.isFixed)) && (
          <button
            style={{width:26,height:26,borderRadius:8,border:'1px solid var(--border-md)',background:'var(--bg-elevated)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,cursor:'pointer',color:'var(--text-muted)',flexShrink:0}}
            onClick={e => { e.stopPropagation(); onEdit && onEdit(bill) }}
          >
            {bill.isFixed ? '✏️' : '×'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── MAIN ─── */
export default function Contas() {
  const { state, dispatch, getBillsSummary, getFixed, getCustomFixed, getReminders } = useApp()
  const { activeMonth } = state
  const [showAdd, setShowAdd]           = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [editBill, setEditBill]         = useState(null)

  const { allBills, paid, unpaid, totalPaid, totalUnpaid, pct, allPaid } = getBillsSummary(activeMonth)
  const reminders   = getReminders(activeMonth)
  const customFixed = getCustomFixed(activeMonth)
  const billStatus  = state.bills?.[activeMonth] || {}
  const customBills = billStatus._custom || []

  const [y, m] = activeMonth.split('-').map(Number)
  const monthName = new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})

  // Sort unpaid by dueDay ascending
  const unpaidSorted = [...unpaid].sort((a,b) => (a.dueDay||99)-(b.dueDay||99))

  function handleEdit(bill) {
    if (bill.isFixed) setEditBill(bill)
    else if (!bill.isPreset) dispatch({ type:'DELETE_CUSTOM_BILL', month:activeMonth, billId:bill.id })
  }

  return (
    <div className="screen">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
        <div className="screen-title" style={{marginBottom:0}}>Contas</div>
        <div className="row gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowReminder(true)} style={{fontSize:16,padding:'7px 10px'}}>🔔</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Extra</button>
        </div>
      </div>
      <div style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16,textTransform:'capitalize'}}>{monthName}</div>

      <MonthSelector month={activeMonth} onChange={m => dispatch({type:'SET_MONTH',month:m})}/>

      {/* Explainer */}
      <div style={{background:'var(--accent-light)',border:'1px solid var(--accent-border)',borderRadius:14,padding:'12px 14px',marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--accent)',marginBottom:4}}>📌 Como funciona</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.6}}>
          Estas são suas <strong>contas a pagar</strong> — boletos, transferências, cartões. Toque para marcar como pago quando efetuar o pagamento. Os lançamentos do Nubank (CSV) ficam na aba <strong>Gastos</strong>.
        </div>
      </div>

      {/* Progress card */}
      {allBills.length > 0 && (
        <div className={allPaid ? 'card-success' : 'card-accent'} style={{marginBottom:12}}>
          {allPaid ? (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:8}}>🎉</div>
              <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Todas pagas!</div>
              <div style={{fontSize:13,opacity:0.9}}>Que organização! Davi mandou bem 💚</div>
            </div>
          ) : (
            <>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,opacity:0.8,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Progresso</div>
                  <div style={{fontSize:28,fontWeight:800,lineHeight:1}}>{pct}%</div>
                  <div style={{fontSize:12,opacity:0.8,marginTop:3}}>{paid.length}/{allBills.length} contas pagas</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,opacity:0.8,marginBottom:3}}>Falta pagar</div>
                  <div style={{fontFamily:'DM Mono',fontSize:22,fontWeight:600}}>{fmt(totalUnpaid)}</div>
                </div>
              </div>
              <div style={{height:8,background:'rgba(255,255,255,0.2)',borderRadius:100,overflow:'hidden'}}>
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
        <div className="card" style={{border:'1.5px solid rgba(251,191,36,0.3)'}}>
          <div className="section-label" style={{color:'var(--warning)'}}>🔔 Lembretes</div>
          {reminders.map(r => (
            <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:20}}>{r.icon}</span>
              <div style={{flex:1}}>
                <div className="fs-14 fw-600">{r.title}</div>
                <div className="fs-12 c-muted">{r.dueDate}{r.note ? ` · ${r.note}` : ''}</div>
              </div>
              {r.amount > 0 && <span className="amt-xs">{fmt(r.amount)}</span>}
              <button className="btn btn-xs btn-ghost" onClick={() => dispatch({type:'DELETE_REMINDER',id:r.id})}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Unpaid bills */}
      {unpaidSorted.length > 0 && (
        <div className="card">
          <div className="section-label" style={{color:'var(--warning)'}}>⏳ A pagar</div>
          {unpaidSorted.map(bill => (
            <BillRow key={bill.billId} bill={{...bill, month:activeMonth}}
              onToggle={id => dispatch({type:'TOGGLE_BILL',month:activeMonth,billId:id})}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Paid bills */}
      {paid.length > 0 && (
        <div className="card">
          <div className="section-label" style={{color:'var(--success)'}}>✅ Pagas</div>
          {paid.map(bill => (
            <BillRow key={bill.billId} bill={{...bill, month:activeMonth}}
              onToggle={id => dispatch({type:'TOGGLE_BILL',month:activeMonth,billId:id})}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {allBills.length === 0 && (
        <div className="card" style={{textAlign:'center',padding:'32px 20px'}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <div style={{fontSize:15,fontWeight:700,marginBottom:8}}>Sem contas para este mês</div>
          <div style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.6}}>
            Use <strong>+ Extra</strong> para adicionar boletos, cartões e outras contas a pagar.
          </div>
        </div>
      )}

      {showAdd && <AddBillSheet onClose={() => setShowAdd(false)} onAdd={bill => dispatch({type:'ADD_CUSTOM_BILL',month:activeMonth,bill})}/>}
      {showReminder && <ReminderSheet month={activeMonth} onClose={() => setShowReminder(false)} dispatch={dispatch}/>}
      {editBill && <EditFixedSheet bill={editBill} month={activeMonth} onClose={() => setEditBill(null)} dispatch={dispatch} customFixed={customFixed}/>}
    </div>
  )
}
