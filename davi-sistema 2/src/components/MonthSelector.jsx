import { useRef, useEffect } from 'react'
import { MONTH_RANGE } from '../constants'

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function allMonths() {
  const months = []
  const [sy, sm] = MONTH_RANGE.start.split('-').map(Number)
  const [ey, em] = MONTH_RANGE.end.split('-').map(Number)
  let y = sy, m = sm
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2,'0')}`)
    m++; if (m > 12) { m = 1; y++ }
  }
  return months
}

function todayMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

function label(m) {
  const [y, mo] = m.split('-').map(Number)
  return `${MONTHS_PT[mo-1]} ${String(y).slice(2)}`
}

export default function MonthSelector({ month, onChange }) {
  const scrollRef = useRef(null)
  const today = todayMonth()
  const months = allMonths()

  useEffect(() => {
    const idx = months.indexOf(month)
    const el = scrollRef.current
    if (!el || idx < 0) return
    const pill = el.children[0]?.children[idx]
    if (pill) {
      const left = pill.offsetLeft - el.clientWidth / 2 + pill.offsetWidth / 2
      el.scrollTo({ left, behavior: 'smooth' })
    }
  }, [month])

  return (
    <div className="month-scroll" ref={scrollRef}>
      <div className="month-pills">
        {months.map(m => {
          const [y] = m.split('-').map(Number)
          const isFuture = m > today
          return (
            <button
              key={m}
              className={`month-pill${m === month ? ' active' : ''}${m === today ? ' current' : ''}${isFuture ? ' future' : ''}`}
              onClick={() => onChange(m)}
            >
              {label(m)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
