import { categorize } from './categorizer'

/**
 * Parse a Nubank CSV export.
 * Returns { transactions, errors }
 */
export function parseNubankCSV(text) {
  const lines   = text.trim().split('\n')
  const errors  = []
  if (lines.length < 2) return { transactions: [], errors: ['Arquivo vazio ou inválido'] }

  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,'').toLowerCase())
  const dateIdx = header.findIndex(h => h.includes('data'))
  const valIdx  = header.findIndex(h => h.includes('valor'))
  const descIdx = header.findIndex(h => h.includes('descri'))
  const idIdx   = header.findIndex(h => h.includes('identif'))

  if (dateIdx < 0 || valIdx < 0 || descIdx < 0) {
    return { transactions: [], errors: ['Formato de CSV não reconhecido. Use o extrato do Nubank.'] }
  }

  const transactions = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle quoted CSV fields
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g,''))

    try {
      const rawDate = cols[dateIdx] || ''
      const rawVal  = cols[valIdx]  || '0'
      const desc    = cols[descIdx] || ''
      const txId    = idIdx >= 0 ? cols[idIdx] : `csv-${i}-${Date.now()}`

      // Parse date: dd/mm/yyyy → yyyy-mm-dd
      const dateParts = rawDate.split('/')
      if (dateParts.length !== 3) continue
      const dateIso = `${dateParts[2]}-${dateParts[1].padStart(2,'0')}-${dateParts[0].padStart(2,'0')}`

      const amount = parseFloat(rawVal.replace(',','.'))
      if (isNaN(amount)) continue

      const cat = categorize(desc, amount)
      // Mark RDB and company as exclude
      const exclude = cat === 'rdb_aplicacao' || cat === 'empresa_encerrada'

      transactions.push({
        id: txId,
        date: dateIso,
        amount,
        description: desc.slice(0,90),
        category: cat,
        exclude,
        type: 'csv',
      })
    } catch(e) {
      errors.push(`Linha ${i}: ${e.message}`)
    }
  }

  return { transactions, errors }
}
