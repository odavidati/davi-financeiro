const RULES = [
  {
    category: 'transporte',
    keywords: ['uber','99 tecnologia','99pop','99taxi','via nupay - uber','via nupay - 99','cabify','buser','onibus','metro','trem','passagem','estacionamento','pedagio','shell','petrobras','posto ','combustivel','gasolina'],
  },
  {
    category: 'alimentacao',
    keywords: ['ifood','via nupay - ifood','rappi','ubereats','delivery','restaurante','lanchonete','pizzaria','hamburger','burguer','subway','mcdonalds','mcdonald','bk ','burger king','sushi','temaki','churrasco','padaria','confeitaria','cafeteria','starbucks','supermercado','mercado','atacadao','assai','carrefour','extra ','walmart','dia ','hipermercado','hortifruti','sacolao','feira','viezzer','buffon','restaurante','bar e'],
  },
  {
    category: 'assinaturas',
    keywords: ['spotify','netflix','amazon prime','prime video','apple ','icloud','google one','youtube premium','disney','hbo','paramount','deezer','openai','anthropic','chatgpt','claude','notion','canva','adobe','figma','microsoft 365','office 365','dropbox','lastpass','1password','nordvpn','expressvpn','cursor','github copilot','adyen latin america'],
  },
  {
    category: 'saude',
    keywords: ['psicologo','psicolog','farmacia','drogaria','droga ','ultrafarma','medifarma','medico','hospital','clinica','laboratorio','dentista','odonto','fisioterapeuta','academia','smartfit','bluefit','bodytech','biolab','unimed','amil','hapvida','sulamerica saude','drogasil','pacheco','raia '],
  },
  {
    category: 'energia',
    keywords: ['rge ','rge sul','rge -','cpfl','corsan','sabesp','cemig','coelba','energisa','celpe','copasa','cosern','gas natural','comgas'],
  },
  {
    category: 'moradia',
    keywords: ['condominio','aluguel','claro -','claro ','oi fiber','net combo','vivo fibra','giga+','tim live','sky ','iptu','seguro residencial','seguro imovel','hair pub','barbearia','cabelereiro'],
  },
  {
    category: 'imovel',
    keywords: ['napoles','napolis','caixa economica','cef ','mrv','construtora','incorporadora','registro de imovel','cartorio','engefortes'],
  },
  {
    category: 'investimento',
    keywords: ['aplicacao rdb','aplicação rdb','resgate rdb','rendimento','cdb','lci','lca','tesouro direto','fundo de investimento','renda fixa'],
  },
  {
    category: 'lazer',
    keywords: ['cinema','ingresso','show ','teatro','steam','playstation','xbox','nintendo','nuuvem','green man gaming','humble bundle','twitch','kickstarter','booking','airbnb','hotel','pousada','viagem','passagem aerea','latam','gol ','azul '],
  },
  {
    category: 'compras',
    keywords: ['amazon.com','mercado livre','mercadolivre','shopee','americanas','casas bahia','magazine luiza','magalu','renner','riachuelo','zara','hm ','centauro','netshoes','kabum','aliexpress','shein','wish ','midway','senffnet','shpp brasil','pix marketplace'],
  },
]

export function categorize(description) {
  if (!description) return 'outros'
  const lower = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.category
    }
  }
  return 'outros'
}
