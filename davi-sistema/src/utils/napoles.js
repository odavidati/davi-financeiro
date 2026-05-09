import { NAPOLES } from '../constants'

// ─── Gera o cronograma completo das 48 parcelas de entrada ───
export function generateSchedule() {
  const schedule = []
  const [sy, sm] = NAPOLES.startDate.split('-').map(Number)

  for (let i = 0; i < NAPOLES.totalInstallments; i++) {
    const d = new Date(sy, sm - 1 + i, 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const correction = Math.pow(1 + NAPOLES.inccMonthly, i)
    const installment = Math.round(NAPOLES.monthlyBase * correction * 100) / 100
    const reinforcement = NAPOLES.reinforcements.find(r => r.month === month)
    const isDelivery = month === NAPOLES.deliveryMonth

    // Fase obra: jun/2028 em diante (últimas parcelas de entrada + juros de obra Caixa + cond)
    const [y, m] = month.split('-').map(Number)
    const isObraPhase = y > 2028 || (y === 2028 && m >= 6)

    schedule.push({
      month,
      number: i + 1,
      installment,
      reinforcement: reinforcement?.amount ?? 0,
      total: installment + (reinforcement?.amount ?? 0),
      isDelivery,
      isObraPhase,
      correction: ((correction - 1) * 100).toFixed(2),
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      // Custo total nesse mês (entrada + eventual juros obra + cond)
      totalMonthCost: installment
        + (reinforcement?.amount ?? 0)
        + (isObraPhase ? NAPOLES.caixaInstallmentApprox + NAPOLES.condominiumEstimate : 0),
    })
  }

  return schedule
}

export function getProgress(schedule) {
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const paid      = schedule.filter(s => s.month < currentMonth)
  const remaining = schedule.filter(s => s.month >= currentMonth)
  const totalPaid      = paid.reduce((a, s) => a + s.total, 0)
  const totalRemaining = remaining.reduce((a, s) => a + s.total, 0)
  const nextReinforcement = schedule.find(s => s.month >= currentMonth && s.reinforcement > 0)
  return { paid: paid.length, remaining: remaining.length, totalPaid, totalRemaining, nextReinforcement, currentMonth }
}

export function getCurrentScheduleItem(schedule) {
  const today = new Date()
  const current = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  return schedule.find(s => s.month === current) || null
}

// ─── Projeção financeira completa mês a mês ───
// Retorna array com custo total do Nápoles por mês (entrada + reforço + eventual Caixa + cond)
export function getNapolesProjection() {
  const schedule = generateSchedule()
  return schedule.map(s => ({
    month: s.month,
    label: s.label,
    number: s.number,
    entrada: s.installment,
    reforco: s.reinforcement,
    caixa: s.isObraPhase ? NAPOLES.caixaInstallmentApprox : 0,
    cond: s.isObraPhase ? NAPOLES.condominiumEstimate : 0,
    total: s.totalMonthCost,
    isObraPhase: s.isObraPhase,
    isDelivery: s.isDelivery,
  }))
}
