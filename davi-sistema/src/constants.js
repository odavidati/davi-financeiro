export const USER = {
  name: 'Davi da Silva Ramos',
  city: 'Canoas/RS',
  netIncome: 3390,
  grossIncome: 3900,
}

// ─── NÁPOLES 407A ───
export const NAPOLES = {
  name: 'Nápoles 407A',
  address: 'Av. Santos Ferreira, 4200 – Estância Velha, Canoas/RS',
  totalValue: 275100.04,
  entradaTotal: 50543.04,
  entradaParcelasTotal: 44543.04,
  monthlyBase: 927.98,
  totalInstallments: 48,
  startDate: '2026-06-01',
  inccMonthly: 0.006,
  reinforcements: [
    { month: '2026-12', amount: 2000 },
    { month: '2027-12', amount: 2000 },
    { month: '2028-12', amount: 2000 },
  ],
  caixaFinancing: 224557,
  subsidyRS: 20000,
  subsidyFederal: 557,
  caixaInstallmentApprox: 1160,
  deliveryMonth: '2029-01',
  postObraStart: '2028-06-01',
  condominiumEstimate: 300,
  garagem: 110,
  unitArea: 70.921,
  privateArea: 43.660,
}

// ─── GASTOS FIXOS BASE (editáveis via Config) ───
// NOTA: IA Tools removida do fixo mensal — paga em 2x (mai/jun 489 cada)
// Psicólogo: R$70/semana (~4 sessões/mês) — lançar manualmente
// Dr. Central adicionado: R$49,90/mês (plano saúde no cartão Nubank)
export const DEFAULT_FIXED = {
  pre: [
    { id: 'cond',      name: 'Condomínio (Vicente)',    amount: 410,   category: 'moradia',     icon: '🏠' },
    { id: 'luz',       name: 'Luz RGE',                 amount: 230,   category: 'energia',     icon: '⚡' },
    { id: 'net',       name: 'Internet',                amount: 127,   category: 'moradia',     icon: '🌐' },
    { id: 'drcentral', name: 'Dr. Central (plano)',      amount: 49.90, category: 'saude',       icon: '🏥' },
    { id: 'spotify',   name: 'Spotify',                 amount: 32,    category: 'assinaturas', icon: '🎵' },
    { id: 'icloud',    name: 'iCloud',                  amount: 5.90,  category: 'assinaturas', icon: '☁️' },
    { id: 'gone',      name: 'Google One',              amount: 5,     category: 'assinaturas', icon: '💾' },
    { id: 'netflix',   name: 'Netflix',                 amount: 59.90, category: 'assinaturas', icon: '📺' },
  ],
  post: [
    { id: 'luz',       name: 'Luz RGE',                 amount: 230,   category: 'energia',     icon: '⚡' },
    { id: 'net',       name: 'Internet',                amount: 127,   category: 'moradia',     icon: '🌐' },
    { id: 'drcentral', name: 'Dr. Central (plano)',      amount: 49.90, category: 'saude',       icon: '🏥' },
    { id: 'spotify',   name: 'Spotify',                 amount: 32,    category: 'assinaturas', icon: '🎵' },
    { id: 'icloud',    name: 'iCloud',                  amount: 5.90,  category: 'assinaturas', icon: '☁️' },
    { id: 'gone',      name: 'Google One',              amount: 5,     category: 'assinaturas', icon: '💾' },
    { id: 'netflix',   name: 'Netflix',                 amount: 59.90, category: 'assinaturas', icon: '📺' },
    { id: 'napoles',   name: 'Nápoles 407A (entrada)',  amount: 927.98,category: 'imovel',      icon: '🏗️' },
  ],
  obra: [
    { id: 'luz',       name: 'Luz RGE',                 amount: 230,   category: 'energia',     icon: '⚡' },
    { id: 'net',       name: 'Internet',                amount: 127,   category: 'moradia',     icon: '🌐' },
    { id: 'drcentral', name: 'Dr. Central (plano)',      amount: 49.90, category: 'saude',       icon: '🏥' },
    { id: 'spotify',   name: 'Spotify',                 amount: 32,    category: 'assinaturas', icon: '🎵' },
    { id: 'icloud',    name: 'iCloud',                  amount: 5.90,  category: 'assinaturas', icon: '☁️' },
    { id: 'gone',      name: 'Google One',              amount: 5,     category: 'assinaturas', icon: '💾' },
    { id: 'netflix',   name: 'Netflix',                 amount: 59.90, category: 'assinaturas', icon: '📺' },
    { id: 'napoles',   name: 'Nápoles 407A (entrada)',  amount: 927.98,category: 'imovel',      icon: '🏗️' },
    { id: 'caixa',     name: 'Juros de Obra (Caixa)',   amount: 1160,  category: 'imovel',      icon: '🏦' },
    { id: 'condnap',   name: 'Condomínio Nápoles',      amount: 300,   category: 'moradia',     icon: '🏠' },
  ],
}

// ─── CONTAS ÚNICAS/PARCELADAS PRÉ-CADASTRADAS ───
// Aparecem automaticamente nos meses certos
export const PRESET_BILLS = [
  // IA Tools — 2 parcelas (mai e jun/2026)
  { id: 'iatools-mai', name: 'IA Tools (1/2)', amount: 489, category: 'assinaturas', icon: '🤖', month: '2026-05', dueDay: 15, note: 'Parcela anual 1 de 2' },
  { id: 'iatools-jun', name: 'IA Tools (2/2)', amount: 489, category: 'assinaturas', icon: '🤖', month: '2026-06', dueDay: 15, note: 'Última parcela anual' },
  // Contadora Poliana — IR 2026
  { id: 'contadora-mai', name: 'Contadora Poliana (IR)', amount: 180, category: 'outros', icon: '📊', month: '2026-05', dueDay: 31, note: 'Imposto de Renda 2026' },
  // Renner/Vicente
  { id: 'renner-mai', name: 'Renner (Vicente)', amount: 400, category: 'compras', icon: '🛍️', month: '2026-05', dueDay: 31, note: 'Dívida Renner paga pelo Vicente' },
  // Shopee crédito — junho
  { id: 'shopee-jun', name: 'Crédito Shopee', amount: 262.70, category: 'compras', icon: '🛒', month: '2026-06', dueDay: 10, note: 'Vence 10/06' },
  // Senff (mercado) — junho
  { id: 'senff-jun', name: 'Cartão Senff (mercado)', amount: 527.21, category: 'alimentacao', icon: '🏪', month: '2026-06', dueDay: 7, note: 'Fatura mercado, vence 07/06' },
  // Alesta — julho (dívida 2024 encontrada no Registrato)
  { id: 'alesta-jul', name: 'Alesta (pix crédito)', amount: 421.72, category: 'outros', icon: '⚠️', month: '2026-07', dueDay: 1, note: 'Dívida 2024 via Registrato — fatura julho Nubank' },
]

export const CATEGORIES = [
  { id: 'moradia',     name: 'Moradia',       icon: '🏠', color: '#6366F1', budget: 600  },
  { id: 'alimentacao', name: 'Alimentação',   icon: '🍔', color: '#F59E0B', budget: 450  },
  { id: 'transporte',  name: 'Transporte',    icon: '🚗', color: '#3B82F6', budget: 400  },
  { id: 'saude',       name: 'Saúde',         icon: '🏥', color: '#EC4899', budget: 400  },
  { id: 'assinaturas', name: 'Assinaturas',   icon: '📱', color: '#8B5CF6', budget: 250  },
  { id: 'energia',     name: 'Energia',       icon: '⚡', color: '#FBBF24', budget: 250  },
  { id: 'imovel',      name: 'Imóvel',        icon: '🏗️', color: '#10B981', budget: 2500 },
  { id: 'lazer',       name: 'Lazer',         icon: '🎮', color: '#06B6D4', budget: 200  },
  { id: 'compras',     name: 'Compras',       icon: '🛍️', color: '#EF4444', budget: 300  },
  { id: 'investimento',name: 'Investimento',  icon: '📈', color: '#22D3EE', budget: 500  },
  { id: 'outros',      name: 'Outros',        icon: '📦', color: '#94A3B8', budget: 200  },
]


// ─── INCOME SOURCES ───
export const INCOME_SOURCES = [
  { id: 'salario',    name: 'Salário CLT',       icon: '💼', color: '#00B894', fixed: true,  amount: 3390 },
  { id: 'aulas',      name: 'Aulas (UNOPAR)',     icon: '🎓', color: '#6C3AE0', fixed: false, amount: 0 },
  { id: 'freela',     name: 'Freela / Projetos',  icon: '💻', color: '#3B82F6', fixed: false, amount: 0 },
  { id: 'convites',   name: 'Convites Digitais',  icon: '🎨', color: '#F97316', fixed: false, amount: 0 },
  { id: 'outros_rec', name: 'Outras Receitas',    icon: '💰', color: '#F59E0B', fixed: false, amount: 0 },
]

export const IMPULSE_MESSAGES = [
  { icon:'🏠', title:'Pensa no 407A, Davi', body:'Cada real poupado agora vira tijolo no seu apê em Canoas.', tip:'Parcela base R$927,98 + INCC. Reforço de R$2.000 todo dezembro.' },
  { icon:'⏸️', title:'TDAH mode: pause', body:'A vontade de comprar passa em 10 minutos. O apartamento fica pra sempre.', tip:'Regra dos 10 minutos: fecha a loja, bebe água, volta. Se ainda quiser — decide.' },
  { icon:'🔑', title:'Jul/2028: chaves na mão', body:'Entrega contratual é 31/Jul/2028. Cada real extra vai pra reserva.', tip:'48 parcelas + 3 reforços + juros de obra. Foca.' },
  { icon:'📊', title:'Seus números reais jan–abr/2026', body:'Transporte: R$459. Delivery: R$421. Adicionar mais compromete o mês.', tip:'Esses são seus números reais — não estimativas.' },
  { icon:'🙏', title:'Seu eu de 2029 agradece', body:'R$275.100 de patrimônio te espera. Cada real vira tranquilidade.', tip:'Fecha a loja. Abre o app. Vê quanto você já guardou.' },
]

export const CHECKLIST_ITEMS = [
  { id: 'review',    label: 'Revisei todos os gastos do mês',            icon: '👁️' },
  { id: 'fixed',     label: 'Todos os fixos estão lançados',             icon: '📌' },
  { id: 'napoles',   label: 'Parcela do Nápoles em dia',                 icon: '🏗️' },
  { id: 'emergency', label: 'Guardei algo para a reserva de emergência', icon: '🛡️' },
  { id: 'analysis',  label: 'Li o resumo automático do mês',             icon: '🤖' },
  { id: 'impulse',   label: 'Evitei pelo menos uma compra impulsiva',    icon: '🛑' },
]

export const HISTORICAL = { transport: 459, food: 421, subscriptions: 373 }
export const MONTH_RANGE = { start: '2026-01', end: '2031-12' }
