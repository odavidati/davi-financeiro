/**
 * Sync layer — salva no Supabase e usa localStorage como cache offline.
 * Se o Supabase não estiver configurado, opera só no localStorage.
 */
import { supabase, isSupabaseConfigured } from './supabase'

// ─── TRANSACTIONS ───────────────────────────────────────────────
export async function syncTransactionsUp(userId, month, txList) {
  if (!isSupabaseConfigured() || !userId) return

  const rows = txList.map(tx => ({
    user_id: userId,
    month,
    tx_id: tx.id,
    date: tx.date,
    amount: tx.amount,
    description: tx.description || '',
    category: tx.category || 'outros',
    type: tx.type || 'manual',
  }))

  if (rows.length === 0) {
    // delete all transactions for this month
    await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .eq('month', month)
    return
  }

  // upsert — insere ou atualiza
  const { error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'user_id,tx_id', ignoreDuplicates: false })

  if (error) console.warn('syncTransactionsUp error:', error.message)
}

export async function fetchTransactions(userId) {
  if (!isSupabaseConfigured() || !userId) return null

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) { console.warn('fetchTransactions error:', error.message); return null }

  // Agrupa por mês
  const byMonth = {}
  for (const row of data) {
    if (!byMonth[row.month]) byMonth[row.month] = []
    byMonth[row.month].push({
      id: row.tx_id,
      date: row.date,
      amount: parseFloat(row.amount),
      description: row.description,
      category: row.category,
      type: row.type,
    })
  }
  return byMonth
}

export async function deleteTransactionRemote(userId, txId) {
  if (!isSupabaseConfigured() || !userId) return
  await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .eq('tx_id', txId)
}

// ─── SETTINGS ────────────────────────────────────────────────────
export async function syncSettingsUp(userId, settings) {
  if (!isSupabaseConfigured() || !userId) return
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, settings, updated_at: new Date().toISOString() },
             { onConflict: 'user_id' })
  if (error) console.warn('syncSettingsUp error:', error.message)
}

export async function fetchSettings(userId) {
  if (!isSupabaseConfigured() || !userId) return null
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .single()
  if (error) return null
  return data?.settings || null
}

// ─── CHECKLIST ───────────────────────────────────────────────────
export async function syncChecklistUp(userId, month, items) {
  if (!isSupabaseConfigured() || !userId) return
  const { error } = await supabase
    .from('checklist')
    .upsert({ user_id: userId, month, items },
             { onConflict: 'user_id,month' })
  if (error) console.warn('syncChecklistUp error:', error.message)
}

export async function fetchChecklist(userId) {
  if (!isSupabaseConfigured() || !userId) return null
  const { data, error } = await supabase
    .from('checklist')
    .select('month, items')
    .eq('user_id', userId)
  if (error) return null
  const result = {}
  for (const row of data) result[row.month] = row.items
  return result
}
