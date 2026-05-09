/**
 * Parser local de linguagem natural para finanças — sem IA, sem chave de API.
 * Reconhece padrões do português brasileiro para lançamento de transações.
 */
import { categorize } from './categorizer'
import { uid } from './format'
import { INCOME_SOURCES } from '../constants'

// ─── Extrair valor monetário de um texto ───
function extractAmount(text) {
  // Patterns: "45", "45.90", "45,90", "R$45", "R$ 45,90", "45 reais"
  const patterns = [
    /R\$\s?(\d+(?:[.,]\d{1,2})?)/i,
    /(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|conto|contos)/i,
    /(\d+(?:[.,]\d{1,2})?)/,
  ]
  for (const pat of patterns) {
    const m = text.match(pat)
    if (m) {
      const raw = m[1].replace(',', '.')
      const val = parseFloat(raw)
      if (!isNaN(val) && val > 0) return val
    }
  }
  return null
}

// ─── Limpar texto para obter descrição ───
function cleanDescription(text) {
  return text
    .replace(/R\$\s?\d+(?:[.,]\d{1,2})?/gi, '')
    .replace(/\d+(?:[.,]\d{1,2})?\s*(?:reais|real|contos?)/gi, '')
    .replace(/\d+(?:\.\d{1,2})?/g, '')
    .replace(/\b(no|na|no|em|pro|pra|de|da|do|num|numa|com|para)\b/gi, '')
    .replace(/[,;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Identificar se é receita ou despesa ───
const EXPENSE_VERBS = [
  'paguei','gastei','comprei','fui no','fui na','fui pro','fui pra',
  'consumi','saiu','saíu','débito','debitou','cobrou','cobrado',
  'parcela','parcelei','divida','dívida','boleto',
]
const INCOME_VERBS = [
  'recebi','recebendo','entrou','caiu','ganhei','ganho','salário',
  'salario','pagamento','recebimento','transferência recebida',
  'aula','aulas','freela','convite','convites','projeto',
]

function detectType(text) {
  const low = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  for (const v of INCOME_VERBS) {
    if (low.includes(v.normalize('NFD').replace(/[\u0300-\u036f]/g,''))) return 'income'
  }
  for (const v of EXPENSE_VERBS) {
    if (low.includes(v.normalize('NFD').replace(/[\u0300-\u036f]/g,''))) return 'expense'
  }
  return 'expense' // default
}

// ─── Detectar categoria de receita pelo contexto ───
function detectIncomeSource(text) {
  const low = text.toLowerCase()
  if (/aula|unopar|escola|ensino|aluno/.test(low)) return 'aulas'
  if (/convite|arte|design|layout|logo|banner/.test(low)) return 'convites'
  if (/freela|projeto|cliente|consultoria|serviço/.test(low)) return 'freela'
  if (/salário|salario|clt|empresa|holerite/.test(low)) return 'salario'
  return 'outros_rec'
}

// ─── Detectar data ───
const MONTHS_PT = {
  janeiro:1,fevereiro:2,março:3,marco:3,abril:4,maio:5,junho:6,
  julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12,
}

function extractDate(text, defaultDate) {
  const low = text.toLowerCase()
  // "ontem"
  if (low.includes('ontem')) {
    const d = new Date(); d.setDate(d.getDate()-1)
    return d.toISOString().slice(0,10)
  }
  // "anteontem"
  if (low.includes('anteontem')) {
    const d = new Date(); d.setDate(d.getDate()-2)
    return d.toISOString().slice(0,10)
  }
  // dd/mm/yyyy or dd/mm
  const dmatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  if (dmatch) {
    const d = dmatch[1].padStart(2,'0')
    const m = dmatch[2].padStart(2,'0')
    const y = dmatch[3] ? (dmatch[3].length===2?'20'+dmatch[3]:dmatch[3]) : new Date().getFullYear()
    return `${y}-${m}-${d}`
  }
  return defaultDate || new Date().toISOString().slice(0,10)
}

// ─── Separar múltiplos itens ───
function splitMultiple(text) {
  // Split on "e", ",", ";" — but only if each part has an amount
  const parts = text
    .split(/\s+e\s+|\s*,\s*|\s*;\s*/)
    .map(p => p.trim())
    .filter(p => p.length > 2)

  // Keep only parts that have a detectable amount
  const withAmounts = parts.filter(p => extractAmount(p) !== null)
  return withAmounts.length >= 2 ? withAmounts : null
}

// ─── Parse de uma transação ───
function parseSingle(text) {
  const amount = extractAmount(text)
  if (!amount) return null

  const type = detectType(text)
  const desc = cleanDescription(text)
  const date = extractDate(text, new Date().toISOString().slice(0,10))

  // Get the best description: try to find what comes after verb
  let description = desc || text

  // Clean up verbs from description
  ;[...EXPENSE_VERBS, ...INCOME_VERBS].forEach(v => {
    description = description.replace(new RegExp(`\\b${v}\\b`, 'gi'), '').trim()
  })
  description = description.replace(/\s+/g,' ').trim() || text.slice(0, 40)

  // Capitalize first letter
  description = description.charAt(0).toUpperCase() + description.slice(1)

  const category = type === 'income'
    ? detectIncomeSource(text)
    : categorize(text)

  return {
    id: uid(),
    date,
    description,
    amount: type === 'income' ? amount : -amount,
    category,
    type: 'manual',
  }
}

// ─── Detectar se é uma pergunta (não transação) ───
const QUESTION_WORDS = [
  'quanto','quanto','onde','qual','quando','como','por que','porque',
  'me fala','me diz','me mostra','resumo','resumir','análise','analisar',
  'devo','posso','consigo','tenho','estou','estou','total','saldo',
  'sobrou','gastei no mês','gastei essa','gastei hoje','gastei ontem',
]

function isQuestion(text) {
  const low = text.toLowerCase()
  if (text.endsWith('?')) return true
  return QUESTION_WORDS.some(q => low.startsWith(q) || low.includes(' ' + q + ' '))
}

// ─── MAIN PARSER ───
export function parseInput(text) {
  if (!text || !text.trim()) return { type: 'empty' }

  const clean = text.trim()

  // Check if it's a question
  if (isQuestion(clean)) return { type: 'question', text: clean }

  // Try to split multiple items
  const parts = splitMultiple(clean)
  if (parts) {
    const txs = parts
      .map(p => parseSingle(p))
      .filter(Boolean)

    if (txs.length >= 2) {
      return { type: 'txs', txs, original: clean }
    }
  }

  // Single transaction
  const tx = parseSingle(clean)
  if (tx && tx.amount !== 0) return { type: 'tx', tx }

  // Fallback: can't parse
  return { type: 'unknown', text: clean }
}

// ─── Generate human-readable confirmation ───
export function txConfirmation(tx) {
  const isIncome = tx.amount > 0
  const amt = Math.abs(tx.amount)
  const sign = isIncome ? '+' : '-'
  return `${sign}R$${amt.toFixed(2).replace('.',',')} · ${tx.description}`
}
