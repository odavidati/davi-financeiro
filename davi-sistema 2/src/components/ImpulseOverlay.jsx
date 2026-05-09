import { useState } from 'react'
import { IMPULSE_MESSAGES } from '../constants'
import { fmt } from '../utils/format'

export default function ImpulseOverlay({ onClose }) {
  const [idx] = useState(() => Math.floor(Math.random() * IMPULSE_MESSAGES.length))
  const msg = IMPULSE_MESSAGES[idx]
  const [timer, setTimer] = useState(null)
  const [countdown, setCountdown] = useState(null)

  function startTimer() {
    let secs = 600 // 10 minutes
    setCountdown(secs)
    const id = setInterval(() => {
      secs -= 1
      setCountdown(secs)
      if (secs <= 0) {
        clearInterval(id)
        setCountdown(null)
      }
    }, 1000)
    setTimer(id)
  }

  function formatCountdown(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div
      className="overlay-backdrop"
      style={{ zIndex: 120, alignItems: 'center', padding: '20px' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#08090F',
          border: '1.5px solid rgba(248,113,113,0.3)',
          borderRadius: 24,
          padding: '28px 20px 24px',
          width: '100%',
          maxWidth: 400,
          animation: 'sheetUp 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 52, marginBottom: 12, display: 'block', lineHeight: 1 }}>
            {msg.icon}
          </div>
          <h2 style={{
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--danger)',
            marginBottom: 10,
            lineHeight: 1.25,
            letterSpacing: '-0.3px',
          }}>
            {msg.title}
          </h2>
          <p style={{
            fontSize: 14.5,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            {msg.body}
          </p>
        </div>

        {/* Nápoles reminder */}
        <div style={{
          background: 'rgba(0,200,150,0.06)',
          border: '1px solid var(--accent-border)',
          borderRadius: 14,
          padding: '13px 14px',
          marginBottom: 16,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🏗️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)', marginBottom: 3 }}>
              Nápoles 407A — Jan/2029
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {msg.tip}
            </div>
          </div>
        </div>

        {/* Countdown timer */}
        {countdown !== null ? (
          <div style={{
            textAlign: 'center',
            padding: '14px',
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: 12,
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              Aguarda…
            </div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 32, fontWeight: 500, color: 'var(--warning)', letterSpacing: -1 }}>
              {formatCountdown(countdown)}
            </div>
          </div>
        ) : (
          <button
            className="btn btn-full"
            style={{
              background: 'rgba(251,191,36,0.08)',
              color: 'var(--warning)',
              border: '1px solid rgba(251,191,36,0.2)',
              marginBottom: 10,
              fontSize: 13,
            }}
            onClick={startTimer}
          >
            ⏱️ Iniciar timer de 10 minutos
          </button>
        )}

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-full"
            style={{
              background: 'var(--accent)',
              color: '#020e0a',
              fontSize: 15,
            }}
            onClick={onClose}
          >
            ✅ Não vou comprar agora
          </button>
          <button
            className="btn btn-full"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-md)',
              fontSize: 13,
            }}
            onClick={onClose}
          >
            Vou comprar mesmo assim
          </button>
        </div>
      </div>
    </div>
  )
}
