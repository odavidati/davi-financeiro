import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { INCOME_SOURCES, CATEGORIES, USER, NAPOLES } from '../../constants'
import { callAI, extractText } from '../../lib/ai'
import { parseInput } from '../../utils/nlpParser'
import { isSupabaseConfigured } from '../../lib/supabase'
import { fmt, uid, todayMonth, monthLabel } from '../../utils/format'
import { categorize } from '../../utils/categorizer'

/* ─── Quick chips ─── */
const QUICK_CHIPS = [
  { label: 'Uber/99',     text: 'paguei X no uber' },
  { label: 'iFood',       text: 'gastei X no ifood' },
  { label: 'Mercado',     text: 'comprei X no mercado' },
  { label: 'Psicólogo',   text: 'paguei 70 pra psicóloga' },
  { label: 'Aula UNOPAR', text: 'recebi X das aulas UNOPAR' },
  { label: 'Convite',     text: 'recebi X de convite digital' },
  { label: 'Saldo?',      text: 'quanto sobrou esse mês?' },
  { label: 'Gastos?',     text: 'onde estou gastando mais?' },
]

/* ─── Transaction card in chat ─── */
function TxCard({ tx }) {
  const isIncome = tx.amount > 0
  const cat = isIncome
    ? INCOME_SOURCES.find(s => s.id === tx.category) || { icon:'💰', name:'Receita', color:'#00B894' }
    : CATEGORIES.find(c => c.id === tx.category) || { icon:'📦', name:'Outros', color:'#94A3B8' }

  return (
    <div style={{
      background: isIncome ? 'rgba(0,184,148,0.08)' : 'rgba(108,58,224,0.07)',
      border: `1px solid ${isIncome ? 'rgba(0,184,148,0.2)' : 'rgba(108,58,224,0.18)'}`,
      borderRadius: 14, padding: '11px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      marginTop: 6,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: `${cat.color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>{cat.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {tx.description}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {cat.name} · {tx.date}
        </div>
      </div>
      <div style={{ fontFamily: 'DM Mono', fontSize: 15, fontWeight: 600, color: isIncome ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }}>
        {isIncome ? '+' : '-'}{fmt(Math.abs(tx.amount))}
      </div>
    </div>
  )
}

/* ─── Build full context for AI ─── */
function buildContext(state, getSummary, getByCategory) {
  const month = state.activeMonth
  const summary = getSummary(month)
  const cats = getByCategory(month)
  const catLines = cats.map(c =>
    `- ${c.name}: ${fmt(c.total)}${c.total > c.budget ? ' ⚠️ ACIMA DO ORÇAMENTO' : ''}`
  ).join('\n')

  return `Você é o assistente financeiro pessoal do DAVI DA SILVA RAMOS, morando em Canoas/RS.

PERFIL:
- Renda CLT: R$3.390 líquido
- TDAH — tende a compras impulsivas  
- Comprando apê na planta: Nápoles 407A (48 parcelas R$927,98 + INCC, começa jun/2026)
- Está criando novas fontes de renda: aulas UNOPAR Gravataí, convites digitais, freelas

MÊS ATUAL: ${monthLabel(month)}
- Renda total: ${fmt(summary.totalIncome)} (CLT ${fmt(summary.cltSalary)} + variável ${fmt(summary.variableIncome)})
- Gastos fixos: ${fmt(summary.fixedTotal)}
- Gastos variáveis: ${fmt(summary.expenses)}
- Saldo projetado: ${fmt(summary.surplus)} (${summary.pct}% comprometido)

GASTOS POR CATEGORIA:
${catLines || '(sem lançamentos)'}

CATEGORIAS DE GASTO DISPONÍVEIS: moradia, alimentacao, transporte, saude, assinaturas, energia, imovel, lazer, compras, investimento, outros
FONTES DE RECEITA DISPONÍVEIS: salario, aulas, freela, convites, outros_rec

INSTRUÇÕES — você tem DOIS modos:

MODO 1 — LANÇAMENTO (quando o usuário descreve uma transação):
Retorne SOMENTE JSON válido, sem texto antes ou depois:
- 1 transação: {"mode":"tx","description":"nome","amount":-45,"category":"transporte","date":"${new Date().toISOString().slice(0,10)}"}
- Várias transações: {"mode":"txs","items":[{"description":"...","amount":-45,"category":"...","date":"..."},...],"summary":"confirmação amigável"}
- amount NEGATIVO para gastos, POSITIVO para receitas
- category deve ser um dos IDs listados acima

MODO 2 — RESPOSTA (quando é uma pergunta ou comando):
Retorne SOMENTE JSON: {"mode":"reply","text":"sua resposta direta e humana aqui"}

REGRAS:
- "paguei", "gastei", "comprei", "fui no" → gasto (amount negativo)
- "recebi", "caiu", "entrou", "ganhei" → receita (amount positivo)
- Se mencionar uber/99/taxi → transporte
- Se mencionar ifood/rappi/delivery/restaurante → alimentacao
- Se mencionar psicólogo/psico/terapia → saude
- Se mencionar aula/unopar/escola → aulas (receita)
- Se mencionar convite/arte/design → convites (receita)
- Use a data de hoje se não especificar
- Para múltiplos itens na mesma mensagem, use mode "txs"
- Seja MUITO conciso nas respostas. Max 2 linhas. Sem enrolação.`
}

/* ─── Message types ─── */
// { role: 'user'|'assistant'|'tx'|'txs', content, txData }

export default function Assistente() {
  const { state, dispatch, getSummary, getByCategory, getTx } = useApp()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Oi, Davi! 👋 Digite como você fala — eu entendo e lanço automaticamente.

Exemplos:
• _"paguei 45 no uber"_
• _"recebi 800 das aulas"_  
• _"gastei 32 ifood e 15 farmácia"_
• _"quanto sobrou esse mês?"_`,
    }
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [lastTxs, setLastTxs] = useState([])
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const historyRef = useRef([]) // keeps only user/assistant for API

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, msg])
  }, [])

  async function send(text) {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')

    addMessage({ role:'user', content: msg })
    setLoading(true)

    // Build history for API (only text messages)
    const apiHistory = [
      ...historyRef.current,
      { role:'user', content: msg }
    ]
    historyRef.current = apiHistory

    const system = buildContext(state, getSummary, getByCategory)

    try {
      // First try local parser (no API needed)
      const localParsed = parseInput(msg)
      if (localParsed.type === 'tx' || localParsed.type === 'txs') {
        const txList = localParsed.type === 'tx' ? [localParsed.tx] : localParsed.txs
        txList.forEach(tx => dispatch({ type:'ADD_TRANSACTION', month: state.activeMonth, tx }))
        setLastTxs(txList)
        const sign = txList[0]?.amount < 0 ? '-' : '+'
        const reply = txList.length === 1
          ? JSON.stringify({ mode:'tx', ...txList[0] })
          : JSON.stringify({ mode:'txs', items:txList, summary:`✅ ${txList.length} lançamentos!` })
        addMessage({ role:'txs', content:'✅ Registrado!', txData:txList })
        setLoading(false)
        return
      }

      // For questions, need AI — check if configured
      if (!isSupabaseConfigured()) {
        addMessage({ role:'assistant', content:'💡 Para responder perguntas, configure o Supabase Edge Function com a chave Anthropic. Para lançar gastos, continue digitando normalmente!' })
        setLoading(false)
        return
      }

      const data = await callAI(apiHistory, system, 600)
      const raw  = extractText(data) || '{}'

      // Strip any markdown fences
      const clean = raw.replace(/```json|```/g,'').trim()
      let parsed
      try { parsed = JSON.parse(clean) }
      catch { parsed = { mode:'reply', text: raw } }

      historyRef.current = [...apiHistory, { role:'assistant', content: raw }]

      if (parsed.mode === 'tx') {
        // Single transaction
        const tx = {
          id: uid(),
          date: parsed.date || new Date().toISOString().slice(0,10),
          description: parsed.description,
          amount: parsed.amount,
          category: parsed.category || (parsed.amount < 0 ? categorize(parsed.description) : 'outros_rec'),
          type: 'manual',
        }
        dispatch({ type:'ADD_TRANSACTION', month: state.activeMonth, tx })
        setLastTxs([tx])
        addMessage({
          role: 'tx',
          content: `✅ Registrado!`,
          txData: [tx],
        })
      } else if (parsed.mode === 'txs') {
        // Multiple transactions
        const txList = (parsed.items || []).map(item => ({
          id: uid(),
          date: item.date || new Date().toISOString().slice(0,10),
          description: item.description,
          amount: item.amount,
          category: item.category || (item.amount < 0 ? categorize(item.description) : 'outros_rec'),
          type: 'manual',
        }))
        txList.forEach(tx => dispatch({ type:'ADD_TRANSACTION', month: state.activeMonth, tx }))
        setLastTxs(txList)
        addMessage({
          role: 'txs',
          content: parsed.summary || `✅ ${txList.length} lançamentos registrados!`,
          txData: txList,
        })
      } else {
        // Regular reply
        addMessage({ role:'assistant', content: parsed.text || raw })
      }
    } catch (e) {
      addMessage({ role:'assistant', content:'⚠️ Erro de conexão. Tente de novo.' })
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function undoLast() {
    if (!lastTxs.length) return
    lastTxs.forEach(tx => dispatch({ type:'DELETE_TRANSACTION', month: state.activeMonth, id: tx.id }))
    setLastTxs([])
    addMessage({ role:'assistant', content:'↩️ Desfeito.' })
  }

  // Render markdown-lite (bold, italic, bullets)
  function renderText(text) {
    return text
      .split('\n')
      .map((line, i) => {
        let t = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/_(.*?)_/g, '<em>$1</em>')
          .replace(/^•\s?/, '&nbsp;&nbsp;• ')
        return <div key={i} dangerouslySetInnerHTML={{ __html: t || '&nbsp;' }} style={{ marginBottom: line ? 2 : 6 }}/>
      })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ padding:'14px 16px 12px', background:'var(--bg-card)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div className="row gap-10">
          <div style={{ width:40, height:40, borderRadius:13, background:'var(--accent-light)', border:'1.5px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🤖</div>
          <div>
            <div style={{ fontSize:15, fontWeight:800 }}>Assistente Financeiro</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>
              {monthLabel(state.activeMonth)} · {fmt(getSummary(state.activeMonth).surplus)} de saldo
            </div>
          </div>
          {lastTxs.length > 0 && (
            <button
              onClick={undoLast}
              style={{ marginLeft:'auto', padding:'5px 12px', borderRadius:100, border:'1px solid var(--border-md)', background:'var(--bg-elevated)', fontSize:11, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer' }}
            >
              ↩ Desfazer
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', scrollbarWidth:'none', display:'flex', flexDirection:'column', gap:8 }}>
        {messages.map((msg, i) => {
          if (msg.role === 'tx' || msg.role === 'txs') {
            return (
              <div key={i} style={{ alignSelf:'flex-start', maxWidth:'88%' }}>
                <div style={{ display:'flex', alignItems:'flex-end', gap:7 }}>
                  <div style={{ width:26, height:26, borderRadius:9, background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>🤖</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--success)', marginBottom:4 }}>{msg.content}</div>
                    {(msg.txData||[]).map((tx,j) => <TxCard key={j} tx={tx}/>)}
                  </div>
                </div>
              </div>
            )
          }

          const isUser = msg.role === 'user'
          return (
            <div key={i} style={{ display:'flex', justifyContent:isUser?'flex-end':'flex-start', alignItems:'flex-end', gap:7 }}>
              {!isUser && (
                <div style={{ width:26, height:26, borderRadius:9, background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, marginBottom:2 }}>🤖</div>
              )}
              <div style={{
                maxWidth:'84%', padding:'10px 14px',
                borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isUser ? 'var(--accent)' : 'var(--bg-card)',
                color: isUser ? 'white' : 'var(--text)',
                fontSize: 14, lineHeight: 1.5,
                border: !isUser ? '1px solid var(--border)' : 'none',
                boxShadow: 'var(--shadow-sm)',
              }}>
                {isUser ? msg.content : renderText(msg.content)}
              </div>
            </div>
          )
        })}

        {loading && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:7 }}>
            <div style={{ width:26, height:26, borderRadius:9, background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🤖</div>
            <div style={{ padding:'10px 16px', borderRadius:'18px 18px 18px 4px', background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', gap:4, alignItems:'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', animation:`bounce 1s ease ${i*0.14}s infinite` }}/>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Quick chips */}
      <div style={{ padding:'0 16px 8px', flexShrink:0 }}>
        <div style={{ overflowX:'auto', scrollbarWidth:'none', WebkitOverflowScrolling:'touch' }}>
          <div style={{ display:'flex', gap:7, width:'max-content' }}>
            {QUICK_CHIPS.map((chip,i) => (
              <button key={i} onClick={() => { setInput(chip.text); inputRef.current?.focus() }}
                style={{
                  padding:'7px 14px', borderRadius:100, whiteSpace:'nowrap',
                  background:'var(--bg-card)', border:'1px solid var(--border-md)',
                  fontSize:12, fontWeight:600, color:'var(--text-secondary)',
                  cursor:'pointer', boxShadow:'var(--shadow-sm)',
                }}>
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div style={{ padding:'8px 16px 24px', background:'var(--bg-card)', borderTop:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
          <div style={{ flex:1, position:'relative' }}>
            <textarea
              ref={inputRef}
              placeholder='Digite como você fala: "paguei 45 uber", "recebi 300 convite"…'
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              style={{
                width:'100%', resize:'none', maxHeight:100, overflowY:'auto',
                background:'var(--bg-input)', border:'1.5px solid var(--border-md)',
                borderRadius:14, padding:'11px 14px', fontSize:14,
                color:'var(--text)', fontFamily:'DM Sans',
                outline:'none', lineHeight:1.5,
                transition:'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor='var(--accent)'}
              onBlur={e => e.target.style.borderColor='var(--border-md)'}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width:44, height:44, borderRadius:14,
              background: (!input.trim()||loading) ? 'var(--bg-elevated)' : 'var(--accent)',
              color: (!input.trim()||loading) ? 'var(--text-muted)' : 'white',
              border:'none', cursor: (!input.trim()||loading)?'default':'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20, fontWeight:400, flexShrink:0,
              transition:'all 0.2s', boxShadow: (!input.trim()||loading) ? 'none' : '0 4px 12px var(--accent-glow)',
            }}
          >↑</button>
        </div>
        <div style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center', marginTop:6 }}>
          Enter para enviar · Shift+Enter para nova linha
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%,80%,100%{transform:translateY(0)}
          40%{transform:translateY(-5px)}
        }
        textarea::-webkit-scrollbar{display:none}
      `}</style>
    </div>
  )
}
