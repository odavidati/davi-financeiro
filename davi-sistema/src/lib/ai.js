/**
 * AI proxy — calls Supabase Edge Function which forwards to Anthropic.
 * This solves the CORS issue: browser → Supabase Function → Anthropic API.
 * 
 * If Supabase is not configured, falls back to direct call (dev only).
 */
import { supabase, isSupabaseConfigured } from './supabase'

export async function callAI(messages, system, maxTokens = 600) {
  const payload = {
    model: 'claude-haiku-4-5-20251001', // fast + cheap for parsing
    max_tokens: maxTokens,
    system,
    messages,
  }

  if (isSupabaseConfigured()) {
    // Production: call via Supabase Edge Function (no CORS, API key safe)
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: payload,
    })
    if (error) throw new Error(error.message)
    return data
  }

  // Dev fallback (requires VITE_ANTHROPIC_API_KEY in .env.local — never commit this)
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('No AI proxy configured. Set up Supabase Edge Function.')

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  })
  return resp.json()
}

export function extractText(data) {
  return data?.content?.[0]?.text || ''
}
