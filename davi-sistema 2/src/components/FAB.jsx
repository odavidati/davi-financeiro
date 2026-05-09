import { useState } from 'react'

export default function FAB({ onClick }) {
  const [pressed, setPressed] = useState(false)
  return (
    <>
      <div className="fab-label">Lançar gasto</div>
      <button
        className="fab"
        onClick={onClick}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        aria-label="Lançar gasto"
        style={{ transform: pressed ? 'scale(0.92)' : 'scale(1)' }}
      >
        +
      </button>
    </>
  )
}
