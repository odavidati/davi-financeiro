/**
 * Categorizer — versão específica para Davi da Silva Ramos
 * Mantém regras genéricas + regras específicas dos padrões identificados nos extratos
 */
export function categorize(description, amount = 0) {
  if (!description) return amount > 0 ? 'outros_rec' : 'outros'
  const d = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')

  // ── RDB ──
  if (/aplicac.o rdb|aplicação rdb/.test(d)) return 'rdb_aplicacao'
  if (/resgate rdb/.test(d)) return 'rdb_resgate'

  // ── Empresa encerrada ──
  if (description.includes('62.498.088')) return 'empresa_encerrada'

  // ── Salário / receitas ──
  if (/transferencia recebida/.test(d) && description.includes('•••.393.060') && amount > 0) return 'salario'
  if (/deposito de emprestimo|depósito de emprestimo/.test(d)) return 'emprestimo'

  // ── Estornos ──
  if (/^estorno/.test(d)) return 'estorno'

  // ── Psicóloga ──
  if (/rosenara bohrer/.test(d)) return 'saude'

  // ── Energia ──
  if (/\brge\b/.test(d) || /02\.016\.440/.test(description)) return 'energia'

  // ── Internet ──
  if (/claro/.test(d)) return 'moradia'

  // ── Senff ──
  if (/senffnet/.test(d)) return 'alimentacao'

  // ── Streaming ──
  if (/netflix/.test(d)) return 'assinaturas'
  if (/spotify/.test(d)) return 'assinaturas'
  if (/amazon prime|prime video/.test(d)) return 'assinaturas'
  if (/youtube premium/.test(d)) return 'assinaturas'
  if (/disney/.test(d)) return 'assinaturas'

  // ── Saúde ──
  if (/dr\.? central|19\.013\.906/.test(d)) return 'saude'
  if (/pagar me pagamentos|18\.727\.053/.test(d)) return 'saude'
  if (/rosenara|psicologo|psicolog/.test(d)) return 'saude'
  if (/farmacia|farmácia|drogaria|drogasil|sao joao farmacias|são joão farmacias/.test(d)) return 'saude'
  if (/rudimar pacheco/.test(d)) return 'saude'

  // ── IA Tools / Google One ──
  if (/carlos eduardo pardal gil/.test(d)) return 'assinaturas'

  // ── Outras assinaturas ──
  if (/bytedance|tiktok/.test(d)) return 'assinaturas'
  if (/hostgator|15\.754\.475/.test(d)) return 'assinaturas'
  if (/openai|anthropic|chatgpt|claude|notion|canva|adobe|figma|github/.test(d)) return 'assinaturas'
  if (/icloud|apple/.test(d)) return 'assinaturas'
  if (/google one/.test(d)) return 'assinaturas'
  if (/uber \*one|uber one membership/.test(d)) return 'assinaturas'

  // ── Contadora ──
  if (/poliana rafaela/.test(d)) return 'outros'

  // ── Riachuelo / Midway ──
  if (/midway/.test(d)) return 'compras'

  // ── Alesta ──
  if (/alesta/.test(d)) return 'outros'

  // ── Kiwify / Hotmart ──
  if (/kiwify|hotmart/.test(d)) return 'outros'

  // ── Shopee ──
  if (/shpp brasil|shopee/.test(d)) return 'compras'

  // ── Receita Federal ──
  if (/receita federal/.test(d)) return 'outros'

  // ── Moto / veículo ──
  if (/farrapos casa da moto|cia da moto/.test(d)) return 'transporte'
  if (/shell|petrobras|ipiranga|posto /.test(d)) return 'transporte'

  // ── Transporte ──
  if (/\buber\b/.test(d) || /nupay - uber/.test(d) || /uber \*trip/.test(d)) return 'transporte'
  if (/\b99\b|99pop|99taxi|nupay - 99/.test(d)) return 'transporte'
  if (/cabify|buser|passagem|onibus|metro/.test(d)) return 'transporte'

  // ── Delivery ──
  if (/ifood|99food|ifd\*|nupay - ifood/.test(d)) return 'alimentacao'
  if (/ubereats|rappi/.test(d)) return 'alimentacao'

  // ── Restaurantes / Alimentação ──
  if (/restaurante|pizzaria|fama pizza|lanches|petiskeira|buffon|cantina|burger|kiosque|kiosk/.test(d)) return 'alimentacao'
  if (/zamp s.a|13\.574\.594/.test(d)) return 'alimentacao' // Burger King rede
  if (/viezzer|centerpan|fruteira victor|apolo filial|abastecedora/.test(d)) return 'alimentacao'
  if (/supermercado|mercado|atacadao|assai|carrefour|extra |walmart/.test(d)) return 'alimentacao'
  if (/padaria|panificadora/.test(d)) return 'alimentacao'

  // ── Imóvel / Nápoles ──
  if (/napoles|engefortes/.test(d)) return 'imovel'
  if (/caixa economica/.test(d)) return 'imovel'

  // ── Moradia (pagamentos ao Vicente) ──
  if (/marcelo vicente pereira/.test(d) && amount < 0) return 'moradia'

  // ── PIX marketplace ──
  if (/pix marketplace/.test(d)) return 'compras'

  // ── Adyen (compras online) ──
  if (/adyen/.test(d)) return 'compras'

  // ── Pagamento de fatura/boleto ──
  if (/pagamento de fatura|pagamento de boleto/.test(d)) return 'compras'

  // ── Receitas ──
  if (amount > 0) return 'outros_rec'

  return 'outros'
}
