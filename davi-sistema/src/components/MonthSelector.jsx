import { MONTH_RANGE } from '../constants'
import { monthLabel, prevMonth, nextMonth } from '../utils/format'

export default function MonthSelector({ month, onChange }) {
  const canPrev = month > MONTH_RANGE.start
  const canNext = month < MONTH_RANGE.end

  return (
    <div className="month-sel">
      <button
        className="month-btn"
        disabled={!canPrev}
        onClick={() => canPrev && onChange(prevMonth(month))}
        aria-label="Mês anterior"
      >
        ‹
      </button>
      <span className="month-sel-label">{monthLabel(month)}</span>
      <button
        className="month-btn"
        disabled={!canNext}
        onClick={() => canNext && onChange(nextMonth(month))}
        aria-label="Próximo mês"
      >
        ›
      </button>
    </div>
  )
}
