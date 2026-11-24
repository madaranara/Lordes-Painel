export type SegmentKey = 'servicos' | 'comercio' | 'alimentacao';

export type AccessRole = 'proprietario' | 'financeiro' | 'leitura';

export type PeriodFilter =
  | 'hoje'
  | '7d'
  | 'mes_atual'
  | 'mes_anterior'
  | 'trimestre'
  | 'ano'
  | 'personalizado';

export interface CustomPeriodRange {
  start: string;
  end: string;
}

export type TransactionType = 'receita' | 'despesa' | 'transferencia';

export type TransactionStatus = 'previsto' | 'pago' | 'atrasado' | 'cancelado';

export type PaymentMethod =
  | 'Pix'
  | 'Cartão de Crédito'
  | 'Cartão de Débito'
  | 'Boleto'
  | 'Transferência'
  | 'Dinheiro';

export type MarketingOrigin =
  | 'Site LORDES'
  | 'Google'
  | 'Instagram'
  | 'Indicação'
  | 'Balcão / Direto';

export interface EmpresaConfig {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  documento: string;
  segmento: SegmentKey;
  regimeTributario: string;
  plano: 'Essencial' | 'Profissional' | 'Premium';
  corPrimaria: string;
  subdominio: string;
  produtoNome: string;
  siteSlug?: string;
  siteWebhookKey?: string;
  siteHeadline?: string;
  siteWhatsapp?: string;
  logoDataUrl?: string;
  onboardingCompleted?: boolean;
  aceiteLgpdEm?: string;
}

export interface ContaFinanceira {
  id: string;
  empresaId: string;
  nome: string;
  tipo: 'caixa' | 'banco' | 'carteira' | 'cartao';
  saldoInicialCents: number;
  ativa: boolean;
}

export interface Categoria {
  id: string;
  empresaId: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  natureza: 'fixa' | 'variavel';
  grupoDre: 'receita_bruta' | 'deducao' | 'custo_variavel' | 'despesa_fixa' | 'marketing';
  categoriaPaiId?: string;
}

export interface CentroCusto {
  id: string;
  empresaId: string;
  nome: string;
  ativo: boolean;
}

export interface ProdutoServico {
  id: string;
  empresaId: string;
  nome: string;
  tipo: 'produto' | 'servico';
  precoVendaCents: number;
  custoUnitarioCents: number;
  ativo: boolean;
}

export interface Pessoa {
  id: string;
  empresaId: string;
  tipo: 'cliente' | 'fornecedor';
  nome: string;
  documento: string;
  telefone: string;
  email: string;
}

export interface Lancamento {
  id: string;
  empresaId: string;
  tipo: TransactionType;
  valorCents: number;
  valorPagoCents?: number;
  jurosMultaCents?: number;
  dataCompetencia: string; // YYYY-MM-DD
  dataVencimento: string; // YYYY-MM-DD
  dataPagamento?: string; // YYYY-MM-DD
  status: TransactionStatus;
  categoriaId: string;
  subcategoriaId?: string;
  centroCustoId?: string;
  produtoId?: string;
  contaId: string;
  contaDestinoId?: string;
  pessoaId?: string;
  formaPagamento: PaymentMethod;
  descricao: string;
  observacao?: string;
  anexoNome?: string;
  anexoDataUrl?: string;
  origem?: MarketingOrigin;
  recorrente?: boolean;
  frequencia?: 'semanal' | 'mensal' | 'anual';
  ultimaGeracaoRecorrencia?: string;
  parcelaNumero?: number;
  parcelaTotal?: number;
  leadId?: string;
  criadoPor: string;
  criadoEm: string;
  excluidoEm?: string;
}

export interface MetaMensal {
  mesReferencia: string; // YYYY-MM
  faturamentoCents: number;
  lucroCents: number;
  limiteDespesaCents: number;
}

export type LeadStage = 'Novo Lead' | 'Orçamento Enviado' | 'Aprovado' | 'Perdido';

export interface LeadCRM {
  id: string;
  empresaId: string;
  nome: string;
  empresaNome: string;
  telefone: string;
  email: string;
  segmento: string;
  planoInteresse: 'Essencial' | 'Profissional' | 'Premium';
  origem: MarketingOrigin;
  valorEstimadoCents: number;
  servicoSolicitado: string;
  estagio: LeadStage;
  criadoEm: string;
  convertidoLancamentoId?: string;
}

export interface AuditoriaLog {
  id: string;
  usuario: string;
  acao: 'criou' | 'editou' | 'baixou' | 'excluiu' | 'converteu_lead' | 'importou' | 'recorrencia';
  entidade: string;
  resumo: string;
  timestamp: string;
}

export interface TenantDataset {
  empresa: EmpresaConfig;
  contas: ContaFinanceira[];
  categorias: Categoria[];
  centrosCusto: CentroCusto[];
  produtos: ProdutoServico[];
  pessoas: Pessoa[];
  lancamentos: Lancamento[];
  meta: MetaMensal;
  leads: LeadCRM[];
  auditoria: AuditoriaLog[];
}

export interface CompanyMembershipSummary {
  empresaId: string;
  nomeFantasia: string;
  plano: 'Essencial' | 'Profissional' | 'Premium';
  papel: AccessRole;
}

export interface AuthUserSummary {
  id: string;
  nome: string;
  email: string;
  empresaId: string;
  papel: AccessRole;
  twoFactorEnabled: boolean;
  emailVerified?: boolean;
  isOperator?: boolean;
  companies?: CompanyMembershipSummary[];
}

export interface SaasClientRecord {
  id: string;
  empresaNome: string;
  responsavel: string;
  segmento: string;
  plano: 'Essencial' | 'Profissional' | 'Premium';
  valorMensalCents: number;
  status: 'trial_3m' | 'ativa' | 'inadimplente' | 'cancelada';
  siteContratado: boolean;
  lancamentosSemana: number;
  inicioEm: string;
}
