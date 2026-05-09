import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function LoginScreen() {
  const { sendMagicLink } = useAuth()
  const [email, setEmail]   = useState('daviramosrs@gmail.com')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit() {
    if (!email.trim()) return
    setStatus('sending')
    const error = await sendMagicLink(email.trim())
    if (error) {
      setErrMsg(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  const configured = isSupabaseConfigured()

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      background: 'var(--bg)',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {/* Logo / título */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>💰</div>
        <h1 style={{
          fontSize: 26, fontWeight: 800, color: 'var(--text)',
          letterSpacing: '-0.5px', marginBottom: 8,
        }}>
          Davi Finance
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Controle financeiro pessoal
        </p>
      </div>

      {!configured ? (
        /* Supabase não configurado — mostra aviso */
        <div style={{
          background: 'var(--warning-dim)', border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: 14, padding: '18px 16px', width: '100%', textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontSize: 14, color: 'var(--warning)', fontWeight: 700, marginBottom: 6 }}>
            Supabase não configurado
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Adicione <code style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--accent)' }}>VITE_SUPABASE_URL</code> e{' '}
            <code style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--accent)' }}>VITE_SUPABASE_ANON_KEY</code> nas variáveis de ambiente do Vercel.
          </div>
        </div>
      ) : status === 'sent' ? (
        /* Link enviado */
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{
            background: 'var(--success-dim)', border: '1px solid rgba(74,222,128,0.2)',
            borderRadius: 18, padding: '28px 20px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📨</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>
              Link enviado!
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Abre o email <strong style={{ color: 'var(--text)' }}>{email}</strong> e clica no link mágico para entrar.
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            O link é válido por 1 hora. Após clicar, você entra automaticamente em todos os dispositivos.
          </p>
          <button
            className="btn btn-ghost btn-full"
            style={{ marginTop: 16 }}
            onClick={() => setStatus('idle')}
          >
            Reenviar
          </button>
        </div>
      ) : (
        /* Formulário de login */
        <div style={{ width: '100%' }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-md)',
            borderRadius: 20, padding: '24px 20px', marginBottom: 20,
          }}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Seu email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seuemail@gmail.com"
                autoComplete="email"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ fontSize: 16 }}
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleSubmit}
              disabled={status === 'sending'}
              style={{ fontSize: 15, padding: '14px' }}
            >
              {status === 'sending' ? '⏳ Enviando...' : '✉️ Entrar com link mágico'}
            </button>
          </div>

          {status === 'error' && (
            <div className="alert alert-danger">
              <span className="alert-icon">❌</span>
              <span className="fs-13">{errMsg}</span>
            </div>
          )}

          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <div className="fs-12 c-muted lh-14" style={{ lineHeight: 1.6 }}>
              <div className="fw-600 c-secondary mb-6">Como funciona:</div>
              <div>1. Digite seu email e clica no botão</div>
              <div>2. Você recebe um link no email</div>
              <div>3. Clica no link — já entra, sem senha</div>
              <div>4. No celular e no Mac usa o mesmo email → dados sincronizados ✅</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
