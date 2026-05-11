import { supabase } from './supabase'

// ─── TRANSACTIONS ────────────────────────────────────────────────
export async function fetchAllTransactions(userId) {
  if (!userId) return {}
  const { data, error } = await supabase
    .from('transactions').select('*').eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) { console.error('fetchAllTransactions:', error.message); return {} }
  const byMonth = {}
  for (const row of data) {
    if (!byMonth[row.month]) byMonth[row.month] = []
    byMonth[row.month].push({
      id: row.tx_id, date: row.date, amount: parseFloat(row.amount),
      description: row.description, category: row.category,
      exclude: row.exclude || false, type: row.type || 'manual',
    })
  }
  return byMonth
}

export async function fetchTransactionsByUserId(userId) {
  return fetchAllTransactions(userId)
}

export async function upsertTransaction(userId, month, tx) {
  if (!userId) return
  const { error } = await supabase.from('transactions').upsert({
    user_id: userId, month, tx_id: tx.id, date: tx.date,
    amount: tx.amount, description: (tx.description||'').slice(0,200),
    category: tx.category||'outros', exclude: tx.exclude||false, type: tx.type||'manual',
  }, { onConflict: 'user_id,tx_id' })
  if (error) console.error('upsertTransaction:', error.message)
}

export async function upsertTransactionsBulk(userId, month, txList) {
  if (!userId || !txList?.length) return
  const rows = txList.map(tx => ({
    user_id: userId, month, tx_id: tx.id, date: tx.date,
    amount: tx.amount, description: (tx.description||'').slice(0,200),
    category: tx.category||'outros', exclude: tx.exclude||false, type: tx.type||'csv',
  }))
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from('transactions')
      .upsert(rows.slice(i, i+100), { onConflict: 'user_id,tx_id' })
    if (error) console.error('upsertBulk:', error.message)
  }
}

export async function deleteTransactionDb(userId, txId) {
  if (!userId) return
  await supabase.from('transactions').delete()
    .eq('user_id', userId).eq('tx_id', txId)
}

export async function deleteAllTransactions(userId) {
  if (!userId) return
  await supabase.from('transactions').delete().eq('user_id', userId)
}

// ─── SETTINGS ────────────────────────────────────────────────────
export async function fetchSettings(userId) {
  if (!userId) return null
  const { data, error } = await supabase.from('user_settings')
    .select('settings').eq('user_id', userId).single()
  if (error) return null
  return data?.settings || null
}

export async function saveSettings(userId, settings) {
  if (!userId) return
  const { error } = await supabase.from('user_settings').upsert(
    { user_id: userId, settings, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) console.error('saveSettings:', error.message)
}

// ─── CHECKLIST ───────────────────────────────────────────────────
export async function fetchChecklist(userId) {
  if (!userId) return {}
  const { data, error } = await supabase.from('checklist')
    .select('month, items').eq('user_id', userId)
  if (error) return {}
  const result = {}
  for (const row of data) result[row.month] = row.items
  return result
}

export async function saveChecklistMonth(userId, month, items) {
  if (!userId) return
  await supabase.from('checklist').upsert(
    { user_id: userId, month, items }, { onConflict: 'user_id,month' }
  )
}

// ─── HOUSEHOLD (Modo Casal) ───────────────────────────────────────
export async function getMyHousehold(userId) {
  if (!userId) return null
  const { data } = await supabase.from('household_members')
    .select('household_id, households(id, name, invite_code, created_by), display_name, color, avatar')
    .eq('user_id', userId).single()
  if (!data) return null
  return { ...data.households, myName: data.display_name, myColor: data.color, myAvatar: data.avatar }
}

export async function getHouseholdMembers(householdId) {
  if (!householdId) return []
  const { data, error } = await supabase.from('household_members')
    .select('user_id, display_name, color, avatar')
    .eq('household_id', householdId)
  if (error) return []
  return data
}

export async function createHousehold(userId, displayName, color, avatar) {
  if (!userId) return null
  // Generate code via JS (6 uppercase chars)
  const code = Math.random().toString(36).slice(2,8).toUpperCase()
  const { data, error } = await supabase.from('households')
    .insert({ created_by: userId, invite_code: code, name: 'Casal' })
    .select().single()
  if (error) { console.error('createHousehold:', error); return null }
  await supabase.from('household_members').insert({
    household_id: data.id, user_id: userId,
    display_name: displayName, color, avatar,
  })
  return data
}

export async function joinHousehold(userId, inviteCode, displayName, color, avatar) {
  if (!userId) return { error: 'Não autenticado' }
  const { data: hh, error } = await supabase.from('households')
    .select('id').eq('invite_code', inviteCode.toUpperCase().trim()).single()
  if (error || !hh) return { error: 'Código inválido' }
  const { error: e2 } = await supabase.from('household_members').upsert({
    household_id: hh.id, user_id: userId,
    display_name: displayName, color, avatar,
  }, { onConflict: 'household_id,user_id' })
  if (e2) return { error: e2.message }
  return { success: true, householdId: hh.id }
}

export async function getPartnerTransactions(householdId, myUserId) {
  if (!householdId || !myUserId) return {}
  const { data: members } = await supabase.from('household_members')
    .select('user_id').eq('household_id', householdId)
  if (!members) return {}
  const partnerIds = members.map(m => m.user_id).filter(id => id !== myUserId)
  if (!partnerIds.length) return {}
  const allPartnerTxs = {}
  for (const pid of partnerIds) {
    const txs = await fetchAllTransactions(pid)
    for (const [month, list] of Object.entries(txs)) {
      if (!allPartnerTxs[month]) allPartnerTxs[month] = []
      allPartnerTxs[month].push(...list.map(t => ({ ...t, _ownerId: pid })))
    }
  }
  return allPartnerTxs
}

// ─── GOALS ───────────────────────────────────────────────────────
export async function fetchGoals(userId, householdId) {
  if (!userId) return []
  let q = supabase.from('goals').select('*').eq('active', true)
  if (householdId) {
    q = q.or(`user_id.eq.${userId},household_id.eq.${householdId}`)
  } else {
    q = q.eq('user_id', userId)
  }
  const { data, error } = await q.order('created_at', { ascending: true })
  if (error) return []
  return data
}

export async function upsertGoal(goal) {
  const { error } = await supabase.from('goals').upsert(goal, { onConflict: 'id' })
  if (error) console.error('upsertGoal:', error.message)
}

export async function deleteGoal(id) {
  await supabase.from('goals').update({ active: false }).eq('id', id)
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────
export async function fetchNotifications(userId) {
  if (!userId) return []
  const { data } = await supabase.from('notifications')
    .select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(50)
  return data || []
}

export async function markNotificationRead(id) {
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

export async function createNotification(userId, title, body, type = 'info', dueDate = null) {
  await supabase.from('notifications').insert({ user_id: userId, title, body, type, due_date: dueDate })
}
