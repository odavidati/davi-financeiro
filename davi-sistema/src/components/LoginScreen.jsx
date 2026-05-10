import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function LoginScreen() {
  const { signInWithPassword, signUp, sendMagicLink, resetPassword } = useAuth()

  const [mode, setMode]     = useState('login')   // login | signup | magic | reset
  const [email, setEmail]   = useState('daviramosrs@gmail.com')
  const [password, setPass] = useState('')
  const [status, setStatus] = useState('idle')    // idle | loading | sent | error | success
  const [msg, setMsg]       = useState('')

  const configured = isSupabaseConfigured()

  async function handleLogin(e) {
    e?.preventDefault()
    if (!email || !password) return
    setStatus('loading')
    const error = await signInWithPassword(email.trim(), password)
    if (error) {
      if (error.message?.toLowerCase().includes('invalid')) {
        setMsg('Email ou senha incorretos.')
      } else {
        setMsg(error.message)
      }
      setStatus('error')
    }
    // On success, AuthContext updates user → App redirects automatically
  }

  async function handleSignUp(e) {
    e?.preventDefault()
    if (!email || !password) return
    setStatus('loading')
    const error = await signUp(email.trim(), password)
    if (error) { setMsg(error.message); setStatus('error') }
    else { setStatus('success'); setMsg('Conta criada! Verifique seu email e confirme, depois entre com sua senha.') }
  }

  async function handleMagicLink() {
    if (!email) return
    setStatus('loading')
    const error = await sendMagicLink(email.trim())
    if (error) { setMsg(error.message); setStatus('error') }
    else { setStatus('sent') }
  }

  async function handleReset() {
    if (!email) return
    setStatus('loading')
    const error = await resetPassword(email.trim())
    if (error) { setMsg(error.message); setStatus('error') }
    else { setStatus('sent'); setMsg('Link de redefinição enviado para ' + email) }
  }

  if (!configured) {
    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', background:'var(--bg)' }}>
        <div style={{ fontSize:52, marginBottom:20 }}>💰</div>
        <h1 style={{ fontSize:24, fontWeight:800, marginBottom:8, letterSpacing:'-0.5px' }}>Davi Finance</h1>
        <p style={{ fontSize:13, color:'var(--text-secondary)', textAlign:'center', lineHeight:1.6, marginBottom:24 }}>
          Supabase não configurado. Adicione as variáveis no Vercel.
        </p>
        <div style={{ background:'var(--warning-dim)', border:'1px solid rgba(243,156,18,0.2)', borderRadius:14, padding:'14px 16px', width:'100%' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--warning)', marginBottom:6 }}>Variáveis necessárias:</div>
          <div style={{ fontFamily:'DM Mono', fontSize:11, color:'var(--text-secondary)', lineHeight:2 }}>
            VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', background:'var(--bg)' }}>
      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ fontSize:50, marginBottom:14 }}>💰</div>
        <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.5px', marginBottom:6 }}>Davi Finance</h1>
        <p style={{ fontSize:13, color:'var(--text-secondary)' }}>Controle financeiro pessoal</p>
      </div>

      <div style={{ width:'100%', maxWidth:380 }}>
        {/* Mode tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:20, background:'var(--bg-elevated)', borderRadius:14, padding:4 }}>
          {[{id:'login',l:'Entrar'},{id:'signup',l:'Criar conta'}].map(t => (
            <button key={t.id} onClick={() => { setMode(t.id); setStatus('idle'); setMsg('') }}
              style={{ flex:1, padding:'9px', borderRadius:10, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, transition:'all 0.15s',
                background: mode===t.id ? 'var(--bg-card)' : 'transparent',
                color: mode===t.id ? 'var(--accent)' : 'var(--text-muted)',
                boxShadow: mode===t.id ? 'var(--shadow-sm)' : 'none',
              }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={mode==='login' ? handleLogin : handleSignUp}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" autoComplete="email" style={{fontSize:15}}/>
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="input" type="password" value={password} onChange={e => setPass(e.target.value)}
                placeholder={mode==='signup' ? 'Mínimo 6 caracteres' : '••••••••'}
                autoComplete={mode==='login' ? 'current-password' : 'new-password'}
                style={{fontSize:15}}/>
            </div>
          )}

          {/* Error / success */}
          {status === 'error' && (
            <div style={{ padding:'10px 13px', background:'var(--danger-dim)', border:'1px solid rgba(231,76,60,0.2)', borderRadius:12, fontSize:13, color:'var(--danger)', marginBottom:14 }}>
              ❌ {msg}
            </div>
          )}
          {(status === 'success' || status === 'sent') && (
            <div style={{ padding:'10px 13px', background:'var(--success-dim)', border:'1px solid rgba(0,184,148,0.2)', borderRadius:12, fontSize:13, color:'var(--success)', marginBottom:14 }}>
              ✅ {msg || 'Link enviado para ' + email}
            </div>
          )}

          {/* Primary button */}
          {(mode === 'login' || mode === 'signup') && (
            <button type="submit" className="btn btn-primary btn-full"
              disabled={!email || !password || status==='loading'}
              style={{ fontSize:15, padding:'14px', opacity:(!email||!password||status==='loading')?0.6:1 }}>
              {status==='loading' ? '⏳ Aguarde…' : mode==='login' ? 'Entrar' : 'Criar conta'}
            </button>
          )}
        </form>

        {/* Secondary actions */}
        <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
          {mode === 'login' && (
            <button onClick={handleReset} disabled={!email}
              style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:13, cursor:'pointer', padding:'4px 0', textDecoration:'underline' }}>
              Esqueci minha senha
            </button>
          )}
          {mode === 'login' && (
            <button onClick={() => { setMode('magic'); setStatus('idle'); setMsg('') }}
              style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:12, cursor:'pointer', padding:'4px 0' }}>
              Entrar com link mágico (email)
            </button>
          )}
          {mode === 'magic' && (
            <>
              <div className="form-group" style={{marginBottom:10}}>
                <label className="form-label">Email para o link</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"/>
              </div>
              {status === 'sent'
                ? <div style={{padding:'10px 13px',background:'var(--success-dim)',border:'1px solid rgba(0,184,148,0.2)',borderRadius:12,fontSize:13,color:'var(--success)'}}>📨 Link enviado! Abra o email e clique no link.</div>
                : <button className="btn btn-primary btn-full" onClick={handleMagicLink} disabled={!email||status==='loading'}>{status==='loading'?'⏳':'✉️ Enviar link mágico'}</button>
              }
              <button onClick={() => setMode('login')} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:12,cursor:'pointer',padding:'4px 0'}}>← Voltar para senha</button>
            </>
          )}
        </div>

        {/* iOS tip */}
        <div style={{ marginTop:20, padding:'12px 14px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12 }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.6 }}>
            <strong style={{color:'var(--text-secondary)'}}>📱 No iPhone/iPad:</strong> use email + senha para melhor compatibilidade. O link mágico pode não funcionar corretamente no Safari do iOS.
          </div>
        </div>
      </div>
    </div>
  )
}
