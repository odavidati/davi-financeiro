export const fmt = (n) =>
  (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtShort = (n) => {
  const abs = Math.abs(n || 0)
  if (abs >= 1000) return `R$${(abs / 1000).toFixed(1).replace('.', ',')}k`
  return `R$${abs.toFixed(0)}`
}

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function monthLabel(m) {
  const [y, mo] = m.split('-').map(Number)
  return `${MONTHS_PT[mo - 1]} ${y}`
}

export function monthShort(m) {
  const [, mo] = m.split('-').map(Number)
  return MONTHS_PT[mo - 1]
}

export function prevMonth(m) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function nextMonth(m) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function todayMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export const currentMonthKey = todayMonth
