/**
 * Storage — Supabase only, no localStorage.
 * This file exists only for compatibility during migration.
 * All persistence is handled directly in AppContext via Supabase.
 */
export const loadState  = () => null
export const saveState  = () => {}
export const clearState = () => {}
