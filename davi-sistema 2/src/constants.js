export const USER = {
  name: 'Davi da Silva Ramos',
  city: 'Canoas/RS',
  netIncome: 3390,
  grossIncome: 3900,
}

// ─── NÁPOLES 407A ─── dados confirmados pelo contrato Engefortes 07/05/2026
export const NAPOLES = {
  name: 'Nápoles 407A',
  address: 'Av. Santos Ferreira, 4200 – Estância Velha, Canoas/RS',
  totalValue: 275100.04,

  // Entrada: R$44.543,04 em 48x + R$6.000 em 3 reforços anuais = R$50.543,04
  entradaTotal: 50543.04,
  entradaParcelasTotal: 44543.04,
  monthlyBase: 927.98,
  totalInstallments: 48,
  startDate: '2026-06-01',         // primeira parcela 10/06/2026
  inccMonthly: 0.006,

  // Reforços anuais de R$2.000 (31/dez de cada ano, com INCC)
  reinforcements: [
    { month: '2026-12', amount: 2000 },
    { month: '2027-12', amount: 2000 },
    { month: '2028-12', amount: 2000 },
  ],

  // Financiamento bancário conforme contrato
  caixaFinancing: 224557,          // R$224.557 (inclui subsídios)
  subsidyRS: 20000,                // Porta de Entrada RS
  subsidyFederal: 557,             // subsídio federal
  caixaInstallmentApprox: 1160,    // parcela Caixa estimada pós-chaves

  // Entrega: 31/07/2028 + tolerância 180 dias = ~Jan/2029
  deliveryContractual: '2028-07-31',
  deliveryWithTolerance: '2029-01-28',
  deliveryMonth: '2029-01',

  // A partir de jun/2028: ainda pagando entrada + começa a pagar juros de obra + condomínio
  // (estimativa: chaves em torno de jul/2028–jan/2029)
  postObraStart: '2028-06-01',     // quando provavelmente começam juros de obra + cond
  condominiumEstimate: 300,        // R$300/mês estimado pós-chaves

  garagem: 110,
  unitArea: 70.921,
  privateArea: 43.660,
}

// ─── GASTOS FIXOS POR FASE ───
export const FIXED_EXPENSES = {
  // Fase 1: até mai/2026 — sem parcela Nápoles, com condomínio atual
  pre: [
    { id: 'cond',    name: 'Condomínio (Vicente)',  amount: 410,   category: 'moradia',     icon: '🏠' },
    { id: 'luz',     name: 'Luz RGE',               amount: 230,   category: 'energia',     icon: '⚡' },
    { id: 'net',     name: 'Internet',              amount: 127,   category: 'moradia',     icon: '🌐' },
    { id: 'psico',   name: 'Psicólogo',             amount: 280,   category: 'saude',       icon: '🧠' },
    { id: 'spotify', name: 'Spotify',               amount: 32,    category: 'assinaturas', icon: '🎵' },
    { id: 'icloud',  name: 'iCloud',                amount: 5.90,  category: 'assinaturas', icon: '☁️' },
    { id: 'gone',    name: 'Google One',            amount: 5,     category: 'assinaturas', icon: '💾' },
    { id: 'netflix', name: 'Netflix',               amount: 59.90, category: 'assinaturas', icon: '📺' },
    { id: 'ai',      name: 'IA Tools',              amount: 77,    category: 'assinaturas', icon: '🤖' },
  ],
  // Fase 2: jun/2026–mai/2028 — Vicente assume condomínio, entra parcela Nápoles
  post: [
    { id: 'luz',     name: 'Luz RGE',               amount: 230,   category: 'energia',     icon: '⚡' },
    { id: 'net',     name: 'Internet',              amount: 127,   category: 'moradia',     icon: '🌐' },
    { id: 'psico',   name: 'Psicólogo',             amount: 280,   category: 'saude',       icon: '🧠' },
    { id: 'spotify', name: 'Spotify',               amount: 32,    category: 'assinaturas', icon: '🎵' },
    { id: 'icloud',  name: 'iCloud',                amount: 5.90,  category: 'assinaturas', icon: '☁️' },
    { id: 'gone',    name: 'Google One',            amount: 5,     category: 'assinaturas', icon: '💾' },
    { id: 'netflix', name: 'Netflix',               amount: 59.90, category: 'assinaturas', icon: '📺' },
    { id: 'ai',      name: 'IA Tools',              amount: 77,    category: 'assinaturas', icon: '🤖' },
    { id: 'napoles', name: 'Nápoles 407A (entrada)',amount: 927.98,category: 'imovel',      icon: '🏗️' },
  ],
  // Fase 3: jun/2028 em diante — entrada + juros de obra Caixa + condomínio estimado
  obra: [
    { id: 'luz',     name: 'Luz RGE',               amount: 230,   category: 'energia',     icon: '⚡' },
    { id: 'net',     name: 'Internet',              amount: 127,   category: 'moradia',     icon: '🌐' },
    { id: 'psico',   name: 'Psicólogo',             amount: 280,   category: 'saude',       icon: '🧠' },
    { id: 'spotify', name: 'Spotify',               amount: 32,    category: 'assinaturas', icon: '🎵' },
    { id: 'icloud',  name: 'iCloud',                amount: 5.90,  category: 'assinaturas', icon: '☁️' },
    { id: 'gone',    name: 'Google One',            amount: 5,     category: 'assinaturas', icon: '💾' },
    { id: 'netflix', name: 'Netflix',               amount: 59.90, category: 'assinaturas', icon: '📺' },
    { id: 'ai',      name: 'IA Tools',              amount: 77,    category: 'assinaturas', icon: '🤖' },
    { id: 'napoles', name: 'Nápoles 407A (entrada)',amount: 927.98,category: 'imovel',      icon: '🏗️' },
    { id: 'caixa',   name: 'Juros de Obra (Caixa)', amount: 1160,  category: 'imovel',      icon: '🏦' },
    { id: 'condnap', name: 'Condomínio Nápoles',    amount: 300,   category: 'moradia',     icon: '🏠' },
  ],
}

export const CATEGORIES = [
  { id: 'moradia',     name: 'Moradia',       icon: '🏠', color: '#6366F1', budget: 600  },
  { id: 'alimentacao', name: 'Alimentação',   icon: '🍔', color: '#F59E0B', budget: 450  },
  { id: 'transporte',  name: 'Transporte',    icon: '🚗', color: '#3B82F6', budget: 400  },
  { id: 'saude',       name: 'Saúde',         icon: '🏥', color: '#EC4899', budget: 300  },
  { id: 'assinaturas', name: 'Assinaturas',   icon: '📱', color: '#8B5CF6', budget: 200  },
  { id: 'energia',     name: 'Energia',       icon: '⚡', color: '#FBBF24', budget: 250  },
  { id: 'imovel',      name: 'Imóvel',        icon: '🏗️', color: '#10B981', budget: 2500 },
  { id: 'lazer',       name: 'Lazer',         icon: '🎮', color: '#06B6D4', budget: 200  },
  { id: 'compras',     name: 'Compras',       icon: '🛍️', color: '#EF4444', budget: 300  },
  { id: 'investimento',name: 'Investimento',  icon: '📈', color: '#22D3EE', budget: 500  },
  { id: 'outros',      name: 'Outros',        icon: '📦', color: '#94A3B8', budget: 200  },
]

export const IMPULSE_MESSAGES = [
  {
    icon: '🏠',
    title: 'Pensa no 407A, Davi',
    body: 'Cada real poupado agora vira tijolo no seu apê em Canoas. Esse gasto é realmente necessário?',
    tip: 'Parcela base R$927,98 + INCC. Reforço de R$2.000 todo dezembro. Cuida do que importa.',
  },
  {
    icon: '⏸️',
    title: 'TDAH mode: pause',
    body: 'A vontade de comprar passa em 10 minutos. O apartamento fica pra sempre. Espera antes de decidir.',
    tip: 'Regra dos 10 minutos: fecha essa aba, bebe água, volta. Se ainda quiser — aí decide.',
  },
  {
    icon: '🔑',
    title: 'Jul/2028: chaves na mão',
    body: 'Previsão de entrega é 31/07/2028 (tolerância até jan/2029). Falta pouco. Segura as pontas.',
    tip: '48 parcelas + 3 reforços + juros de obra. Cada real extra vai pra reserva de emergência.',
  },
  {
    icon: '📊',
    title: 'Transporte: R$459. Delivery: R$421',
    body: 'Esses são seus números reais de jan–abr/2026. Não são estimativas — são você.',
    tip: 'Seus gastos variáveis médios já pesam. Adicionar mais agora compromete o mês.',
  },
  {
    icon: '🙏',
    title: 'Seu eu de 2029 agradece',
    body: 'R$275.100 de patrimônio te espera. Cada real economizado vira tranquilidade.',
    tip: 'Fecha a loja. Abre o app de finanças. Vê quanto você já guardou esse mês.',
  },
]

export const CHECKLIST_ITEMS = [
  { id: 'review',    label: 'Revisei todos os gastos do mês',            icon: '👁️' },
  { id: 'fixed',     label: 'Todos os fixos estão lançados',             icon: '📌' },
  { id: 'napoles',   label: 'Parcela do Nápoles em dia',                 icon: '🏗️' },
  { id: 'emergency', label: 'Guardei algo para a reserva de emergência', icon: '🛡️' },
  { id: 'analysis',  label: 'Li o resumo automático do mês',             icon: '🤖' },
  { id: 'impulse',   label: 'Evitei pelo menos uma compra impulsiva',    icon: '🛑' },
]

export const HISTORICAL = {
  transport:     459,
  food:          421,
  subscriptions: 373,
}

export const MONTH_RANGE = { start: '2026-01', end: '2031-12' }
