/**
 * Sync — Supabase is the single source of truth.
 * All reads and writes go through here.
 */
import { supabase, isSupabaseConfigured } from './supabase'

// ─── TRANSACTIONS ────────────────────────────────────────────────
export async function fetchAllTransactions(userId) {
  if (!userId) return {}
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) { console.error('fetchAllTransactions:', error.message); return {} }
  const byMonth = {}
  for (const row of data) {
    if (!byMonth[row.month]) byMonth[row.month] = []
    byMonth[row.month].push({
      id:          row.tx_id,
      date:        row.date,
      amount:      parseFloat(row.amount),
      description: row.description,
      category:    row.category,
      exclude:     row.exclude || false,
      type:        row.type || 'manual',
    })
  }
  return byMonth
}

export async function upsertTransaction(userId, month, tx) {
  if (!userId) return
  const { error } = await supabase
    .from('transactions')
    .upsert({
      user_id:     userId,
      month,
      tx_id:       tx.id,
      date:        tx.date,
      amount:      tx.amount,
      description: tx.description || '',
      category:    tx.category || 'outros',
      exclude:     tx.exclude || false,
      type:        tx.type || 'manual',
    }, { onConflict: 'user_id,tx_id' })
  if (error) console.error('upsertTransaction:', error.message)
}

export async function upsertTransactionsBulk(userId, month, txList) {
  if (!userId || !txList?.length) return
  const rows = txList.map(tx => ({
    user_id:     userId,
    month,
    tx_id:       tx.id,
    date:        tx.date,
    amount:      tx.amount,
    description: (tx.description || '').slice(0, 200),
    category:    tx.category || 'outros',
    exclude:     tx.exclude || false,
    type:        tx.type || 'csv',
  }))
  // Batch in chunks of 100
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { error } = await supabase
      .from('transactions')
      .upsert(chunk, { onConflict: 'user_id,tx_id' })
    if (error) console.error('upsertBulk:', error.message)
  }
}

export async function deleteTransactionDb(userId, txId) {
  if (!userId) return
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .eq('tx_id', txId)
  if (error) console.error('deleteTransaction:', error.message)
}

export async function deleteAllTransactions(userId) {
  if (!userId) return
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
  if (error) console.error('deleteAllTransactions:', error.message)
}

// ─── SETTINGS ────────────────────────────────────────────────────
export async function fetchSettings(userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .single()
  if (error) return null
  return data?.settings || null
}

export async function saveSettings(userId, settings) {
  if (!userId) return
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, settings, updated_at: new Date().toISOString() },
             { onConflict: 'user_id' })
  if (error) console.error('saveSettings:', error.message)
}

// ─── CHECKLIST ───────────────────────────────────────────────────
export async function fetchChecklist(userId) {
  if (!userId) return {}
  const { data, error } = await supabase
    .from('checklist')
    .select('month, items')
    .eq('user_id', userId)
  if (error) return {}
  const result = {}
  for (const row of data) result[row.month] = row.items
  return result
}

export async function saveChecklistMonth(userId, month, items) {
  if (!userId) return
  const { error } = await supabase
    .from('checklist')
    .upsert({ user_id: userId, month, items }, { onConflict: 'user_id,month' })
  if (error) console.error('saveChecklistMonth:', error.message)
}

// ─── BILLS ───────────────────────────────────────────────────────
export async function fetchBills(userId) {
  if (!userId) return {}
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .single()
  if (error) return {}
  return data?.settings?.bills || {}
}
