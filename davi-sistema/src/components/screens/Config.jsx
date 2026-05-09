import { useApp } from '../../context/AppContext'
import { USER, NAPOLES, DEFAULT_FIXED, CATEGORIES } from '../../constants'
import { fmt } from '../../utils/format'

function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle} aria-checked={on} role="switch"
      style={{
        width: 48, height: 26, borderRadius: 100,
        background: on ? 'var(--accent)' : 'var(--bg-elevated)',
        border: `2px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2,
        transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        transform: on ? 'translateX(22px)' : 'translateX(0)',
        transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div className="card">
      <div className="section-label">{title}</div>
      {children}
    </div>
  )
}

export default function Config({ onSignOut }) {
  const { state, dispatch } = useApp()
  const { settings } = state

  return (
    <div className="screen">
      <div className="screen-title">Configurações</div>

      {/* Profile */}
      <Section title="Perfil">
        <div className="row gap-12 mb-14">
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: 'var(--accent-dim)', border: '1.5px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
          }}>🧑‍💻</div>
          <div>
            <div className="fs-16 fw-700">{USER.name}</div>
            <div className="fs-13 c-secondary">{USER.city}</div>
            <span className="badge badge-accent mt-4" style={{ fontSize: 11 }}>TDAH · CLT</span>
          </div>
        </div>
        {[
          { label: 'Renda líquida CLT', value: fmt(USER.netIncome) },
          { label: 'Renda bruta CLT',   value: fmt(USER.grossIncome) },
        ].map((r, i) => (
          <div key={i} className="row-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
            <span className="fs-13 c-secondary">{r.label}</span>
            <span className="amt-xs c-accent">{r.value}</span>
          </div>
        ))}
      </Section>


      {/* Theme */}
      <Section title="Aparência">
        <div className="row-between">
          <div>
            <div className="fs-14 fw-600">Modo escuro</div>
            <div className="fs-12 c-muted">Fundo preto, estilo premium</div>
          </div>
          <Toggle
            on={settings.theme === 'dark'}
            onToggle={() => dispatch({ type: 'SET_SETTING', key: 'theme', value: settings.theme === 'dark' ? 'light' : 'dark' })}
          />
        </div>
      </Section>

      {/* Fixed expenses — 3 phases */}
      <Section title="Gastos fixos por fase">
        <div className="alert alert-info mb-14">
          <span className="alert-icon">🔄</span>
          <div className="fs-12 lh-14">
            <strong>3 fases:</strong><br/>
            • Até mai/2026: com condomínio atual (Vicente)<br/>
            • Jun/2026: Cond. sai + entra parcela Nápoles<br/>
            • Jun/2028: + juros de obra Caixa + cond. Nápoles
          </div>
        </div>

        {[
          { key: 'pre',  label: '📋 Fase 1 — até mai/2026',         color: 'c-secondary' },
          { key: 'post', label: '🏗️ Fase 2 — jun/2026 a mai/2028',  color: 'c-warning' },
          { key: 'obra', label: '🏦 Fase 3 — jun/2028 em diante',   color: 'c-danger' },
        ].map(phase => (
          <div key={phase.key} style={{ marginBottom: 16 }}>
            <div className={`fs-13 fw-700 ${phase.color} mb-8`}>{phase.label}</div>
            {DEFAULT_FIXED[phase.key].map(f => (
              <div key={f.id} className="row-between" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="row gap-8">
                  <span style={{ fontSize: 15 }}>{f.icon}</span>
                  <span className="fs-12">{f.name}</span>
                </div>
                <span className={`amt-xs ${phase.key === 'obra' && ['caixa','condnap'].includes(f.id) ? 'c-warning' : 'c-danger'}`}>
                  -{fmt(f.amount)}
                </span>
              </div>
            ))}
            <div className="row-between mt-6">
              <span className="fs-12 fw-700">Total</span>
              <span className={`amt-xs fw-700 ${phase.color}`}>
                -{fmt(DEFAULT_FIXED[phase.key].reduce((s, f) => s + f.amount, 0))}
              </span>
            </div>
          </div>
        ))}
      </Section>

      {/* Emergency fund */}
      <Section title="Meta — Reserva de emergência">
        <div className="form-group">
          <label className="form-label">Valor atual (R$)</label>
          <input
            className="input input-mono" type="number"
            value={settings.emergencyFundCurrent || ''}
            onChange={e => dispatch({ type: 'SET_SETTING', key: 'emergencyFundCurrent', value: parseFloat(e.target.value) || 0 })}
            placeholder="0,00" inputMode="decimal"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Meta (R$)</label>
          <input
            className="input input-mono" type="number"
            value={settings.emergencyFundGoal || ''}
            onChange={e => dispatch({ type: 'SET_SETTING', key: 'emergencyFundGoal', value: parseFloat(e.target.value) || 8000 })}
            placeholder="8000" inputMode="decimal"
          />
        </div>
      </Section>

      {/* Nápoles settings */}
      <Section title="Nápoles 407A — Contrato">
        <div className="fs-12 c-muted mb-10">Contrato assinado: 07/05/2026 — Engefortes Engenharia Ltda</div>
        {[
          { label: 'Endereço',                value: 'Av. Santos Ferreira, 4200' },
          { label: 'Valor total',             value: fmt(NAPOLES.totalValue) },
          { label: 'Entrada total',           value: fmt(NAPOLES.entradaTotal) },
          { label: 'Parcelas de entrada',     value: `48x ${fmt(NAPOLES.monthlyBase)} + INCC` },
          { label: 'Reforços anuais',         value: '3x R$2.000 (dez/26, dez/27, dez/28)' },
          { label: 'Financiamento bancário',  value: fmt(NAPOLES.caixaFinancing) },
          { label: 'Subsídio RS (Porta Entr.)', value: fmt(NAPOLES.subsidyRS) },
          { label: 'Subsídio Federal',        value: fmt(NAPOLES.subsidyFederal) },
          { label: 'Parcela Caixa (est.)',    value: `~${fmt(NAPOLES.caixaInstallmentApprox)}/mês` },
          { label: 'Início juros obra + Cond.', value: 'Jun/2028' },
          { label: 'Condomínio estimado',     value: `~${fmt(NAPOLES.condominiumEstimate)}/mês` },
          { label: 'Entrega contratual',      value: '31/Jul/2028' },
          { label: 'Prazo máximo',            value: 'Jan/2029 (tol. 180 dias)' },
          { label: 'Garagem',                 value: `Vaga nº ${NAPOLES.garagem}` },
          { label: 'Área total',              value: `${NAPOLES.unitArea}m²` },
        ].map((r, i) => (
          <div key={i} className="row-between" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
            <span className="fs-12 c-secondary">{r.label}</span>
            <span className="amt-xs fs-12">{r.value}</span>
          </div>
        ))}

        <div className="divider" />

        <div className="row-between">
          <div>
            <div className="fs-14 fw-600">CCS emitido</div>
            <div className="fs-12 c-muted">Habilita subsídio Porta de Entrada RS</div>
          </div>
          <Toggle
            on={!!settings.ccsEmitted}
            onToggle={() => dispatch({ type: 'SET_SETTING', key: 'ccsEmitted', value: !settings.ccsEmitted })}
          />
        </div>
      </Section>

      {/* App info */}
      <Section title="Sobre">
        <div className="fs-13 c-secondary lh-16">
          <div className="fw-600 mb-4">Davi Finance v1.1.0</div>
          <div>Controle financeiro pessoal para Davi da Silva Ramos.</div>
          <div className="c-muted mt-6">Dados pré-carregados com extrato Nubank jan–mai/2026.</div>
          <div className="c-muted mt-4">Dados salvos localmente (localStorage). Privado.</div>
        </div>
      </Section>


      {/* Sign out */}
      {onSignOut && (
        <Section title="Conta">
          <div className="fs-13 c-secondary mb-12 lh-14">
            Você está logado com sincronização ativa entre dispositivos.
          </div>
          <button className="btn btn-ghost btn-full" onClick={onSignOut}>
            🚪 Sair da conta
          </button>
        </Section>
      )}

      {/* Danger zone */}
      <div className="card" style={{ border: '1px solid rgba(248,113,113,0.18)', marginBottom: 32 }}>
        <div className="section-label" style={{ color: 'var(--danger)' }}>⚠️ Zona de perigo</div>
        <div className="fs-13 c-secondary mb-12 lh-14">
          Apaga todas as transações (incluindo dados Nubank pré-carregados), configurações e progresso.
        </div>
        <button
          className="btn btn-danger btn-full"
          onClick={() => {
            if (window.confirm('⚠️ Isso apagará TUDO, incluindo os dados Nubank pré-carregados. Tem certeza?')) {
              dispatch({ type: 'RESET' })
            }
          }}
        >
          🗑️ Resetar todos os dados
        </button>
      </div>
    </div>
  )
}
