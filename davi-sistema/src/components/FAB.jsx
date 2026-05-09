import { useState } from 'react'

export default function FAB({ onClick }) {
  const [open, setOpen] = useState(false)

  function handle(type) {
    setOpen(false)
    onClick(type)
  }

  return (
    <>
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position:'fixed', inset:0, zIndex:38, background:'rgba(0,0,0,0.15)' }}
          />
          {/* Options */}
          <div style={{ position:'fixed', bottom:'calc(var(--nav-h) + 76px)', right:16, zIndex:39, display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
            <button
              onClick={() => handle('income')}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'11px 18px 11px 14px',
                background:'var(--success)', color:'white',
                border:'none', borderRadius:100, cursor:'pointer',
                fontSize:14, fontWeight:700,
                boxShadow:'0 4px 16px rgba(0,184,148,0.35)',
              }}
            >
              <span style={{fontSize:18}}>💰</span> Receita
            </button>
            <button
              onClick={() => handle('expense')}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'11px 18px 11px 14px',
                background:'var(--accent)', color:'white',
                border:'none', borderRadius:100, cursor:'pointer',
                fontSize:14, fontWeight:700,
                boxShadow:'0 4px 16px rgba(108,58,224,0.35)',
              }}
            >
              <span style={{fontSize:18}}>💳</span> Gasto
            </button>
          </div>
        </>
      )}

      {/* Main FAB */}
      <button
        className="fab"
        onClick={() => setOpen(v => !v)}
        aria-label="Lançar"
        style={{
          transform: open ? 'rotate(45deg) scale(1.05)' : 'scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        +
      </button>
    </>
  )
}
