-- LORDES — Schema de Produção PostgreSQL com Isolamento Multi-Tenant via Row Level Security (RLS)
-- Referência: Seção 7.4 da Documentação do Produto LORDES

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Empresas (Tenants)
CREATE TABLE IF NOT EXISTS empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT NOT NULL DEFAULT '',
  documento TEXT NOT NULL DEFAULT '',
  segmento TEXT NOT NULL CHECK (segmento IN ('servicos', 'comercio', 'alimentacao')),
  regime_tributario TEXT NOT NULL DEFAULT 'Simples Nacional',
  plano TEXT NOT NULL DEFAULT 'Profissional' CHECK (plano IN ('Essencial', 'Profissional', 'Premium')),
  cor_primaria TEXT NOT NULL DEFAULT '#1E40AF',
  subdominio TEXT NOT NULL DEFAULT '',
  produto_nome TEXT NOT NULL DEFAULT 'LORDES Gestor',
  site_slug TEXT UNIQUE,
  site_webhook_key TEXT,
  site_headline TEXT,
  site_whatsapp TEXT,
  logo_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  aceite_lgpd_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Usuários e Membros Multi-Empresa
CREATE TABLE IF NOT EXISTS usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  totp_secret TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_operator BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS membro_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  papel TEXT NOT NULL CHECK (papel IN ('proprietario', 'financeiro', 'leitura')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, empresa_id)
);

-- 3. Assinaturas SaaS LORDES
CREATE TABLE IF NOT EXISTS assinatura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  plano TEXT NOT NULL CHECK (plano IN ('Essencial', 'Profissional', 'Premium')),
  valor_mensal_cents BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('trial_3m', 'ativa', 'inadimplente', 'cancelada')),
  site_contratado BOOLEAN NOT NULL DEFAULT TRUE,
  gateway_customer_id TEXT,
  gateway_subscription_id TEXT,
  inicio_em DATE NOT NULL DEFAULT CURRENT_DATE,
  proximo_vencimento DATE
);

-- 4. Contas Financeiras, Categorias, Centros de Custo, Produtos e Pessoas
CREATE TABLE IF NOT EXISTS conta_financeira (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('caixa', 'banco', 'carteira', 'cartao')),
  saldo_inicial_cents BIGINT NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS categoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  natureza TEXT NOT NULL CHECK (natureza IN ('fixa', 'variavel')),
  grupo_dre TEXT NOT NULL CHECK (grupo_dre IN ('receita_bruta', 'deducao', 'custo_variavel', 'despesa_fixa', 'marketing')),
  categoria_pai_id UUID REFERENCES categoria(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS centro_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS produto_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('produto', 'servico')),
  preco_venda_cents BIGINT NOT NULL DEFAULT 0,
  custo_unitario_cents BIGINT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pessoa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cliente', 'fornecedor')),
  nome TEXT NOT NULL,
  documento TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT ''
);

-- 5. Recorrências e Lançamentos
CREATE TABLE IF NOT EXISTS recorrencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  valor_cents BIGINT NOT NULL,
  frequencia TEXT NOT NULL CHECK (frequencia IN ('semanal', 'mensal', 'anual')),
  proximo_vencimento DATE NOT NULL,
  categoria_id UUID REFERENCES categoria(id) ON DELETE SET NULL,
  conta_id UUID REFERENCES conta_financeira(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS lancamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  valor_cents BIGINT NOT NULL CHECK (valor_cents >= 0),
  valor_pago_cents BIGINT,
  juros_multa_cents BIGINT,
  data_competencia DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL CHECK (status IN ('previsto', 'pago', 'atrasado', 'cancelado')),
  categoria_id UUID REFERENCES categoria(id) ON DELETE SET NULL,
  centro_custo_id UUID REFERENCES centro_custo(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES produto_servico(id) ON DELETE SET NULL,
  conta_id UUID REFERENCES conta_financeira(id) ON DELETE SET NULL,
  conta_destino_id UUID REFERENCES conta_financeira(id) ON DELETE SET NULL,
  pessoa_id UUID REFERENCES pessoa(id) ON DELETE SET NULL,
  recorrencia_id UUID REFERENCES recorrencia(id) ON DELETE SET NULL,
  forma_pagamento TEXT NOT NULL,
  descricao TEXT NOT NULL,
  observacao TEXT,
  anexo_url TEXT,
  origem TEXT,
  recorrente BOOLEAN NOT NULL DEFAULT FALSE,
  frequencia TEXT CHECK (frequencia IN ('semanal', 'mensal', 'anual')),
  ultima_geracao_recorrencia DATE,
  parcela_numero INT,
  parcela_total INT,
  criado_por TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  excluido_em TIMESTAMPTZ
);

-- 6. Leads do Site Conectado & CRM
CREATE TABLE IF NOT EXISTS lead_crm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  empresa_nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  segmento TEXT NOT NULL,
  plano_interesse TEXT NOT NULL,
  origem TEXT NOT NULL,
  valor_estimado_cents BIGINT NOT NULL DEFAULT 0,
  servico_solicitado TEXT NOT NULL,
  estagio TEXT NOT NULL CHECK (estagio IN ('Novo Lead', 'Orçamento Enviado', 'Aprovado', 'Perdido')),
  convertido_lancamento_id UUID REFERENCES lancamento(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Metas, Alertas e Auditoria
CREATE TABLE IF NOT EXISTS meta_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  mes_referencia CHAR(7) NOT NULL,
  faturamento_cents BIGINT NOT NULL DEFAULT 0,
  lucro_cents BIGINT NOT NULL DEFAULT 0,
  limite_despesa_cents BIGINT NOT NULL DEFAULT 0,
  UNIQUE (empresa_id, mes_referencia)
);

CREATE TABLE IF NOT EXISTS alerta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nivel TEXT NOT NULL CHECK (nivel IN ('critico', 'atencao', 'info')),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  lido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  usuario TEXT NOT NULL,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  resumo TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices compostos para consultas rápidas de dashboard e fluxo de caixa
CREATE INDEX IF NOT EXISTS idx_lancamento_empresa_comp ON lancamento (empresa_id, data_competencia) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_lancamento_empresa_venc ON lancamento (empresa_id, data_vencimento, status) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_empresa_estagio ON lead_crm (empresa_id, estagio, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa_ts ON auditoria (empresa_id, criado_em DESC);

-- Row Level Security (RLS) por empresa_id definido na sessão (SET LOCAL app.current_empresa_id = '...')
ALTER TABLE conta_financeira ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE centro_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE produto_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoa ENABLE ROW LEVEL SECURITY;
ALTER TABLE recorrencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerta ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'conta_financeira', 'categoria', 'centro_custo', 'produto_servico',
    'pessoa', 'recorrencia', 'lancamento', 'lead_crm',
    'meta_mensal', 'alerta', 'auditoria'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS tenant_isolation_%I ON %I USING (empresa_id = current_setting(''app.current_empresa_id'', true)::uuid)',
      tbl, tbl
    );
  END LOOP;
END $$;
