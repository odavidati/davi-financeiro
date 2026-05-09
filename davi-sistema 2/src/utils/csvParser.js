import { categorize } from './categorizer'

function parseLine(line) {
  const result = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQ = !inQ }
    else if (c === ',' && !inQ) { result.push(cur.trim()); cur = '' }
    else { cur += c }
  }
  result.push(cur.trim())
  return result
}

export function parseNubankCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { transactions: [], errors: ['Arquivo vazio ou inválido.'] }

  const headerRaw = lines[0].toLowerCase()
  const hasData  = headerRaw.includes('data')
  const hasValor = headerRaw.includes('valor')
  if (!hasData || !hasValor) {
    return {
      transactions: [],
      errors: ['Formato inválido. Use o CSV exportado do Nubank: Meu Nubank → Extrato → ⋯ → Exportar planilha.'],
    }
  }

  const transactions = []
  const errors = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = parseLine(line)
    if (parts.length < 4) {
      errors.push(`Linha ${i + 1}: formato inválido (${parts.length} colunas)`)
      continue
    }

    const [rawDate, rawValor, rawId, rawDesc] = parts
    const amtStr = rawValor.replace(/\s/g, '').replace(',', '.')
    const amount = parseFloat(amtStr)

    if (isNaN(amount)) {
      errors.push(`Linha ${i + 1}: valor inválido "${rawValor}"`)
      continue
    }

    const description = rawDesc.replace(/^"|"$/g, '').trim()
    const id = rawId.trim() || `nubank-${rawDate}-${i}`

    // Nubank: negative = expense, positive = credit
    transactions.push({
      id,
      date: rawDate.trim(),
      amount,
      description,
      category: categorize(description),
      type: 'csv',
    })
  }

  return { transactions, errors }
}
