import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileUp,
  Globe,
  History,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  MailCheck,
  Menu,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Repeat,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import {
  AccessRole,
  AuthUserSummary,
  Categoria,
  ContaFinanceira,
  CustomPeriodRange,
  Lancamento,
  LeadCRM,
  LeadStage,
  MarketingOrigin,
  PeriodFilter,
  SaasClientRecord,
  SegmentKey,
  TenantDataset,
} from '../types/finance';
import {
  addDaysISO,
  downloadCSV,
  downloadXLSX,
  formatBRL,
  formatDateBR,
  formatPercent,
  getMonthKey,
  getTodayISO,
  parseBRLInputToCents,
} from '../utils/formatters';
import {
  buildCashFlowSeries,
  computeDashboardMetrics,
  computeMonthlyDRE,
} from '../utils/kpiEngine';
import { getPlanEntitlements } from '../utils/planLimits';
import { SEGMENT_OPTIONS } from '../data/segments';
import { CashFlowAreaChart, RevenueExpenseChart } from './Charts';
import { KpiCard } from './KpiCard';
import { QuickEntryModal } from './QuickEntryModal';
import { BaixaModal } from './BaixaModal';
import { StatementImportModal } from './StatementImportModal';
import { LordesAdminView } from './LordesAdminView';
import { PWAInstallButton } from './PWAInstallButton';

export type WorkspaceTab =
  | 'dashboard'
  | 'kpis'
  | 'lancamentos'
  | 'contas_pr'
  | 'crm'
  | 'relatorios'
  | 'cadastros'
  | 'configuracoes'
  | 'lordes_admin';

interface SaaSWorkspaceProps {
  dataset: TenantDataset;
  segment: SegmentKey;
  activeTab: WorkspaceTab;
  role: AccessRole;
  authUser: AuthUserSummary | null;
  teamMembers: AuthUserSummary[];
  saasClients: SaasClientRecord[];
  onChangeTab: (tab: WorkspaceTab) => void;
  onChangeSegment: (segment: SegmentKey) => void;
  onChangeRole: (role: AccessRole) => void;
  onBackToSite: () => void;
  onOpenConnectedSite: (siteSlug: string) => void;
  onRefreshTenant: () => void;
  onRotateSiteKey: () => void;
  onAddTeamMember: (member: {
    nome: string;
    email: string;
    senha: string;
    papel: 'financeiro' | 'leitura';
  }) => Promise<string | null>;
  onRemoveTeamMember: (memberId: string) => Promise<void>;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenOnboarding: () => void;
  onOpenHelp: (tab: 'ajuda' | 'lgpd') => void;
  onSaveEntries: (entries: Omit<Lancamento, 'id' | 'criadoEm'>[], editId?: string) => void;
  onDeleteEntry: (id: string) => void;
  onGenerateRecurrences: () => number;
  onConfirmBaixa: (
    id: string,
    contaId: string,
    dataPagamento: string,
    valorPagoCents: number,
    jurosMultaCents: number,
    baixaParcial: boolean,
  ) => void;
  onAddLead: (lead: Omit<LeadCRM, 'id' | 'empresaId' | 'criadoEm' | 'estagio'>) => void;
  onUpdateLeadStage: (leadId: string, stage: LeadStage) => void;
  onConvertLeadToReceivable: (leadId: string) => void;
  onUpdateMeta: (faturamentoCents: number, lucroCents: number, limiteDespesaCents: number) => void;
  onAddConta: (nome: string, tipo: ContaFinanceira['tipo'], saldoInicialCents: number) => void;
  onAddCategoria: (cat: Omit<Categoria, 'id' | 'empresaId'>) => void;
  onDeleteCategoria: (id: string) => void;
  onAddCentroCusto: (nome: string) => void;
  onAddProduto: (
    nome: string,
    tipo: 'produto' | 'servico',
    precoVendaCents: number,
    custoUnitarioCents: number,
  ) => void;
  onAddPessoa: (tipo: 'cliente' | 'fornecedor', nome: string, telefone: string, email: string) => void;
  onUpdateWhiteLabel: (patch: {
    produtoNome?: string;
    nomeFantasia?: string;
    corPrimaria?: string;
    subdominio?: string;
    siteSlug?: string;
    siteHeadline?: string;
    siteWhatsapp?: string;
    logoDataUrl?: string;
    plano?: 'Essencial' | 'Profissional' | 'Premium';
  }) => void;
  onSwitchCompany: (empresaId: string) => Promise<string | null>;
  onCreateCompany: (empresaNome: string, segmento: SegmentKey) => Promise<string | null>;
  onSetup2FA: () => Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string } | { error: string }>;
  onEnable2FA: (code: string) => Promise<string | null>;
  onDisable2FA: (senha: string) => Promise<string | null>;
  onRequestEmailVerification: () => Promise<{ emailSent: boolean; message: string; error?: string }>;
  onVerifyEmail: () => Promise<string | null>;
  onUpdateSaasClientStatus: (id: string, status: SaasClientRecord['status']) => void;
  onResetSegment: () => void;
  onDeleteAccount: () => void;
}

const TAB_LABELS: { id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
  { id: 'kpis', label: 'Saúde e KPIs', icon: TrendingUp },
  { id: 'lancamentos', label: 'Lançamentos', icon: Receipt },
  { id: 'contas_pr', label: 'Pagar e Receber', icon: Wallet },
  { id: 'crm', label: 'CRM e Leads', icon: Users },
  { id: 'relatorios', label: 'Fluxo e DRE', icon: BarChart3 },
  { id: 'cadastros', label: 'Metas e Cadastros', icon: Target },
  { id: 'configuracoes', label: 'White-Label', icon: Settings },
  { id: 'lordes_admin', label: 'Operação LORDES', icon: Briefcase },
];

const PERIOD_OPTIONS: { id: PeriodFilter; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: 'mes_atual', label: 'Mês atual' },
  { id: 'mes_anterior', label: 'Mês anterior' },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'ano', label: 'Ano' },
  { id: 'personalizado', label: 'Personalizado' },
];

export const SaaSWorkspace: React.FC<SaaSWorkspaceProps> = ({
  dataset,
  segment,
  activeTab,
  role,
  authUser,
  teamMembers,
  saasClients,
  onChangeTab,
  onChangeSegment,
  onChangeRole,
  onBackToSite,
  onOpenConnectedSite,
  onRefreshTenant,
  onRotateSiteKey,
  onAddTeamMember,
  onRemoveTeamMember,
  onOpenAuth,
  onLogout,
  onOpenOnboarding,
  onOpenHelp,
  onSaveEntries,
  onDeleteEntry,
  onGenerateRecurrences,
  onConfirmBaixa,
  onAddLead,
  onUpdateLeadStage,
  onConvertLeadToReceivable,
  onUpdateMeta,
  onAddConta,
  onAddCategoria,
  onDeleteCategoria,
  onAddCentroCusto,
  onAddProduto,
  onAddPessoa,
  onUpdateWhiteLabel,
  onSwitchCompany,
  onCreateCompany,
  onSetup2FA,
  onEnable2FA,
  onDisable2FA,
  onRequestEmailVerification,
  onVerifyEmail,
  onUpdateSaasClientStatus,
  onResetSegment,
  onDeleteAccount,
}) => {
  const today = getTodayISO();
  const isReadOnly = role === 'leitura';
  const accentColor = dataset.empresa.corPrimaria || '#1E40AF';
  const entitlements = getPlanEntitlements(dataset.empresa.plano);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('mes_atual');
  const [customRange, setCustomRange] = useState<CustomPeriodRange>({
    start: addDaysISO(today, -15),
    end: today,
  });
  const [selectedCentroCusto, setSelectedCentroCusto] = useState('');
  const [entryModal, setEntryModal] = useState<{ mode: 'quick' | 'full'; edit?: Lancamento | null } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [baixaTarget, setBaixaTarget] = useState<Lancamento | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  // Filtros Lançamentos & Contas P/R
  const [searchTx, setSearchTx] = useState('');
  const [filterTipoTx, setFilterTipoTx] = useState<'todos' | 'receita' | 'despesa' | 'transferencia'>('todos');
  const [filterStatusTx, setFilterStatusTx] = useState<'todos' | 'pago' | 'previsto' | 'atrasado'>('todos');
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [prTab, setPrTab] = useState<'todos' | 'receber' | 'pagar' | 'atrasados'>('todos');
  const [prCategoriaFilter, setPrCategoriaFilter] = useState('');
  const [prPessoaFilter, setPrPessoaFilter] = useState('');

  // Relatórios
  const [reportSubTab, setReportSubTab] = useState<'fluxo' | 'dre'>('dre');
  const [dreMonth, setDreMonth] = useState(getMonthKey(today));
  const [dreCentroCusto, setDreCentroCusto] = useState('');

  // CRM novo lead inline
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadNome, setLeadNome] = useState('');
  const [leadEmpresa, setLeadEmpresa] = useState('');
  const [leadTel, setLeadTel] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadOrigem, setLeadOrigem] = useState<MarketingOrigin>('Site LORDES');
  const [leadValorStr, setLeadValorStr] = useState('2.500,00');
  const [leadServico, setLeadServico] = useState('');

  // Cadastros Metas / Contas / Categorias / Centros de Custo / Produtos / Pessoas
  const [metaFatStr, setMetaFatStr] = useState((dataset.meta.faturamentoCents / 100).toFixed(2).replace('.', ','));
  const [metaLucroStr, setMetaLucroStr] = useState((dataset.meta.lucroCents / 100).toFixed(2).replace('.', ','));
  const [metaLimStr, setMetaLimStr] = useState((dataset.meta.limiteDespesaCents / 100).toFixed(2).replace('.', ','));
  const [metaSavedMsg, setMetaSavedMsg] = useState(false);

  const [newContaNome, setNewContaNome] = useState('');
  const [newContaTipo, setNewContaTipo] = useState<ContaFinanceira['tipo']>('banco');
  const [newContaSaldoStr, setNewContaSaldoStr] = useState('0,00');

  const [newCatNome, setNewCatNome] = useState('');
  const [newCatTipo, setNewCatTipo] = useState<'receita' | 'despesa'>('despesa');
  const [newCatNat, setNewCatNat] = useState<'fixa' | 'variavel'>('variavel');
  const [newCatDre, setNewCatDre] = useState<Categoria['grupoDre']>('custo_variavel');
  const [newCatPai, setNewCatPai] = useState('');

  const [newCcNome, setNewCcNome] = useState('');
  const [newProdNome, setNewProdNome] = useState('');
  const [newProdTipo, setNewProdTipo] = useState<'produto' | 'servico'>('servico');
  const [newProdPrecoStr, setNewProdPrecoStr] = useState('');
  const [newProdCustoStr, setNewProdCustoStr] = useState('');

  const [newPessoaTipo, setNewPessoaTipo] = useState<'cliente' | 'fornecedor'>('cliente');
  const [newPessoaNome, setNewPessoaNome] = useState('');
  const [newPessoaTel, setNewPessoaTel] = useState('');
  const [newPessoaEmail, setNewPessoaEmail] = useState('');

  // Equipe da empresa (usuários isolados dentro do mesmo tenant)
  const [memberNome, setMemberNome] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberSenha, setMemberSenha] = useState('');
  const [memberPapel, setMemberPapel] = useState<'financeiro' | 'leitura'>('financeiro');
  const [memberError, setMemberError] = useState('');

  // Multi-empresa, 2FA TOTP & Verificação de e-mail
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanySeg, setNewCompanySeg] = useState<SegmentKey>('servicos');
  const [companyError, setCompanyError] = useState('');

  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string; qrDataUrl: string } | null>(null);
  const [totpConfirmCode, setTotpConfirmCode] = useState('');
  const [disable2FAPass, setDisable2FAPass] = useState('');
  const [securityMsg, setSecurityMsg] = useState('');
  const [securityErr, setSecurityErr] = useState('');
  const [logoError, setLogoError] = useState('');

  const effectiveSiteSlug = dataset.empresa.siteSlug || `demo-${segment}`;
  const originBase = typeof window !== 'undefined' ? window.location.origin : '';
  const connectedSiteUrl = `${originBase}/?site=${effectiveSiteSlug}`;
  const webhookUrl = `${originBase}/api/v1/public/site/${effectiveSiteSlug}/leads`;
  const embedSnippet = `<script>
// Cole no formulário do site do cliente (${dataset.empresa.nomeFantasia})
async function enviarOrcamentoLordes(dados) {
  await fetch("${webhookUrl}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Lordes-Site-Key": "${dataset.empresa.siteWebhookKey || 'SUA_CHAVE_DO_SITE'}"
    },
    body: JSON.stringify({
      nome: dados.nome,
      empresaNome: dados.empresa || dados.nome,
      telefone: dados.whatsapp,
      email: dados.email,
      servicoSolicitado: dados.servico,
      valorEstimadoCents: Math.round((dados.valor || 0) * 100),
      utmSource: new URLSearchParams(location.search).get("utm_source") || "site"
    })
  });
}
</script>`;

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const metrics = useMemo(
    () =>
      computeDashboardMetrics(
        dataset,
        period,
        today,
        period === 'personalizado' ? customRange : undefined,
        selectedCentroCusto || undefined,
      ),
    [dataset, period, today, customRange, selectedCentroCusto],
  );
  const cashFlowSeries = useMemo(() => buildCashFlowSeries(dataset, today), [dataset, today]);
  const dreSummary = useMemo(
    () => computeMonthlyDRE(dataset, dreMonth, dreCentroCusto || undefined),
    [dataset, dreMonth, dreCentroCusto],
  );

  const revExpChartData = useMemo(() => {
    const prevMetrics = computeDashboardMetrics(dataset, 'mes_anterior', today);
    const curMetrics = computeDashboardMetrics(dataset, 'mes_atual', today);
    return [
      { label: 'Mês anterior', receitasCents: prevMetrics.faturamentoCents, despesasCents: prevMetrics.despesasCents },
      { label: 'Mês atual', receitasCents: curMetrics.faturamentoCents, despesasCents: curMetrics.despesasCents },
      { label: 'Previsto 30d', receitasCents: curMetrics.aReceber30dCents, despesasCents: curMetrics.aPagar30dCents },
    ];
  }, [dataset, today]);

  const catMap = useMemo(() => new Map(dataset.categorias.map((c) => [c.id, c.nome])), [dataset.categorias]);
  const contaMap = useMemo(() => new Map(dataset.contas.map((c) => [c.id, c.nome])), [dataset.contas]);
  const pessoaMap = useMemo(() => new Map(dataset.pessoas.map((p) => [p.id, p.nome])), [dataset.pessoas]);
  const ccMap = useMemo(() => new Map((dataset.centrosCusto || []).map((c) => [c.id, c.nome])), [dataset.centrosCusto]);

  const activeTransactions = useMemo(
    () =>
      dataset.lancamentos
        .filter((l) => !l.excluidoEm)
        .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento)),
    [dataset.lancamentos],
  );

  const filteredTransactions = useMemo(() => {
    const q = searchTx.trim().toLowerCase();
    return activeTransactions.filter((l) => {
      if (filterTipoTx !== 'todos' && l.tipo !== filterTipoTx) return false;
      if (filterStatusTx !== 'todos' && l.status !== filterStatusTx) return false;
      if (q) {
        const cat = (catMap.get(l.categoriaId) || '').toLowerCase();
        const pes = (l.pessoaId ? pessoaMap.get(l.pessoaId) || '' : '').toLowerCase();
        if (!l.descricao.toLowerCase().includes(q) && !cat.includes(q) && !pes.includes(q)) return false;
      }
      return true;
    });
  }, [activeTransactions, filterTipoTx, filterStatusTx, searchTx, catMap, pessoaMap]);

  const openPayablesReceivables = useMemo(() => {
    return activeTransactions
      .filter((l) => l.tipo !== 'transferencia' && (l.status === 'previsto' || l.status === 'atrasado'))
      .filter((l) => {
        const isOverdue = l.status === 'atrasado' || l.dataVencimento < today;
        if (prTab === 'receber' && l.tipo !== 'receita') return false;
        if (prTab === 'pagar' && l.tipo !== 'despesa') return false;
        if (prTab === 'atrasados' && !isOverdue) return false;
        if (prCategoriaFilter && l.categoriaId !== prCategoriaFilter) return false;
        if (prPessoaFilter && l.pessoaId !== prPessoaFilter) return false;
        return true;
      })
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  }, [activeTransactions, prTab, prCategoriaFilter, prPessoaFilter, today]);

  const curMonthMetrics = useMemo(() => computeDashboardMetrics(dataset, 'mes_atual', today), [dataset, today]);
  const metaProgressPct =
    dataset.meta.faturamentoCents > 0
      ? Math.min(100, (curMonthMetrics.faturamentoCents / dataset.meta.faturamentoCents) * 100)
      : 0;
  const diaAtual = Number(today.split('-')[2]);
  const diasNoMes = new Date(Number(today.split('-')[0]), Number(today.split('-')[1]), 0).getDate();
  const diasRestantes = Math.max(1, diasNoMes - diaAtual + 1);
  const faltaParaMetaCents = Math.max(0, dataset.meta.faturamentoCents - curMonthMetrics.faturamentoCents);
  const ritmoDiarioNecessarioCents = Math.round(faltaParaMetaCents / diasRestantes);

  const handleCopyWeeklyWhatsApp = async () => {
    if (authUser && !entitlements.allowPixWhatsapp) {
      notify('Resumo WhatsApp disponível a partir do plano Profissional.');
      return;
    }
    const summary = `*Resumo Financeiro — ${dataset.empresa.nomeFantasia}*\n• Faturamento: ${formatBRL(metrics.faturamentoCents)}\n• Despesas: ${formatBRL(metrics.despesasCents)}\n• Resultado (Sobrou): ${formatBRL(metrics.resultadoCents)}\n• Saldo em caixa hoje: ${formatBRL(metrics.saldoAtualCents)}\n• Projetado 30 dias: ${formatBRL(metrics.saldoProjetado30dCents)}\nSemáforo: ${metrics.semaforo.label} — ${metrics.semaforo.mensagem}`;
    try {
      await navigator.clipboard.writeText(summary);
      notify('Resumo semanal copiado para colar no WhatsApp.');
    } catch {
      notify('Não foi possível copiar automaticamente.');
    }
  };

  const handleCopyPixCharge = async (l: Lancamento) => {
    if (authUser && !entitlements.allowPixWhatsapp) {
      notify('Cobrança Pix por WhatsApp disponível a partir do plano Profissional.');
      return;
    }
    const aberto = Math.max(0, l.valorCents - (l.valorPagoCents ?? 0));
    const cliNome = (l.pessoaId && pessoaMap.get(l.pessoaId)) || 'Cliente';
    const msg = `Olá, ${cliNome}! Segue o lembrete do pagamento referente a "${l.descricao}" no valor de ${formatBRL(aberto)}, com vencimento em ${formatDateBR(l.dataVencimento)}. Chave Pix CNPJ ${dataset.empresa.documento} (${dataset.empresa.nomeFantasia}).`;
    try {
      await navigator.clipboard.writeText(msg);
      notify('Mensagem de cobrança Pix copiada para o WhatsApp.');
    } catch {
      notify('Não foi possível copiar.');
    }
  };

  const buildTransactionRows = () =>
    activeTransactions.map((l) => [
      formatDateBR(l.dataCompetencia),
      formatDateBR(l.dataVencimento),
      formatDateBR(l.dataPagamento),
      l.tipo,
      l.descricao,
      catMap.get(l.categoriaId) || '',
      (l.centroCustoId && ccMap.get(l.centroCustoId)) || 'Geral',
      contaMap.get(l.contaId) || '',
      (l.valorCents / 100).toFixed(2).replace('.', ','),
      l.status,
    ]);

  const txExportHeaders = [
    'Data Competência',
    'Vencimento',
    'Pagamento',
    'Tipo',
    'Descrição',
    'Categoria',
    'Centro de Custo',
    'Conta',
    'Valor (R$)',
    'Situação',
  ];

  const handleExportTransactionsCSV = () => {
    downloadCSV(
      `lancamentos-${dataset.empresa.nomeFantasia.toLowerCase().replace(/\s+/g, '-')}.csv`,
      txExportHeaders,
      buildTransactionRows(),
    );
  };

  const handleExportTransactionsXLSX = () => {
    downloadXLSX(
      `lancamentos-${dataset.empresa.nomeFantasia.toLowerCase().replace(/\s+/g, '-')}.xlsx`,
      'Lançamentos',
      txExportHeaders,
      buildTransactionRows(),
    );
  };

  const buildDreRows = () => [
    ['Receita Bruta', (dreSummary.receitaBrutaCents / 100).toFixed(2).replace('.', ',')],
    ['Deduções / Impostos / Taxas', (-dreSummary.deducoesCents / 100).toFixed(2).replace('.', ',')],
    ['Receita Líquida', (dreSummary.receitaLiquidaCents / 100).toFixed(2).replace('.', ',')],
    ['Custos Variáveis', (-dreSummary.custosVariaveisCents / 100).toFixed(2).replace('.', ',')],
    ['Margem de Contribuição', (dreSummary.margemContribuicaoCents / 100).toFixed(2).replace('.', ',')],
    ['Despesas Fixas', (-dreSummary.despesasFixasCents / 100).toFixed(2).replace('.', ',')],
    ['Marketing & Aquisição', (-dreSummary.marketingCents / 100).toFixed(2).replace('.', ',')],
    ['Resultado Líquido', (dreSummary.resultadoLiquidoCents / 100).toFixed(2).replace('.', ',')],
  ];

  const handleExportDreCSV = () => {
    downloadCSV(`dre-${dreMonth}.csv`, ['Linha DRE', 'Valor (R$)'], buildDreRows());
  };

  const handleExportDreXLSX = () => {
    downloadXLSX(`dre-${dreMonth}.xlsx`, `DRE ${dreMonth}`, ['Linha DRE', 'Valor (R$)'], buildDreRows());
  };

  const visibleTabs = TAB_LABELS.filter((t) => {
    if (t.id === 'lordes_admin') {
      return !authUser || Boolean(authUser.isOperator);
    }
    return true;
  });

  const activeTabLabel = TAB_LABELS.find((t) => t.id === activeTab)?.label || 'Início';

  const semaforoStyles =
    metrics.semaforo.cor === 'verde'
      ? {
          wrap: 'bg-emerald-50 border-emerald-200 text-emerald-950',
          badge: 'bg-emerald-700 text-white',
          icon: CheckCircle2,
        }
      : metrics.semaforo.cor === 'amarelo'
        ? {
            wrap: 'bg-amber-50 border-amber-200 text-amber-950',
            badge: 'bg-amber-600 text-white',
            icon: AlertTriangle,
          }
        : {
            wrap: 'bg-rose-50 border-rose-200 text-rose-950',
            badge: 'bg-rose-700 text-white',
            icon: ShieldAlert,
          };

  const SemaforoIcon = semaforoStyles.icon;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200 no-print">
        <div className="h-16 px-5 border-b border-slate-200 flex items-center gap-2.5">
          {dataset.empresa.logoDataUrl && (
            <img
              src={dataset.empresa.logoDataUrl}
              alt={dataset.empresa.nomeFantasia}
              className="w-8 h-8 rounded-lg object-contain border border-slate-200 bg-white shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="font-display text-sm font-extrabold tracking-tight text-slate-900 truncate">
              {dataset.empresa.produtoNome}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {authUser ? `Conta isolada · ${dataset.empresa.plano}` : dataset.empresa.subdominio}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  active ? 'text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                style={active ? { backgroundColor: accentColor } : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2.5">
          {!authUser && (
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Segmento Demo
              </label>
              <select
                value={segment}
                onChange={(e) => onChangeSegment(e.target.value as SegmentKey)}
                className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-md bg-slate-50 text-slate-800"
              >
                {SEGMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {authUser ? (
            <div className="space-y-2">
              {authUser.companies && authUser.companies.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-500">Empresa ativa</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCompanyForm((v) => !v);
                        setCompanyError('');
                      }}
                      className="text-[11px] font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                    >
                      + Nova empresa
                    </button>
                  </div>
                  <select
                    value={authUser.empresaId}
                    onChange={async (e) => {
                      const err = await onSwitchCompany(e.target.value);
                      if (err) notify(err);
                      else notify('Empresa alternada com isolamento ativo.');
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-md bg-slate-50 text-slate-800"
                  >
                    {authUser.companies.map((c) => (
                      <option key={c.empresaId} value={c.empresaId}>
                        {c.nomeFantasia} ({c.papel})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showNewCompanyForm && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setCompanyError('');
                    const err = await onCreateCompany(newCompanyName, newCompanySeg);
                    if (err) {
                      setCompanyError(err);
                    } else {
                      setNewCompanyName('');
                      setShowNewCompanyForm(false);
                      notify('Nova empresa criada e isolada.');
                    }
                  }}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2"
                >
                  <input
                    type="text"
                    required
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Nome da nova empresa"
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                  <select
                    value={newCompanySeg}
                    onChange={(e) => setNewCompanySeg(e.target.value as SegmentKey)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  >
                    {SEGMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.shortLabel}
                      </option>
                    ))}
                  </select>
                  {companyError && <p className="text-[11px] text-rose-700">{companyError}</p>}
                  <button
                    type="submit"
                    className="w-full py-1.5 text-[11px] font-semibold text-white bg-[#1E40AF] rounded cursor-pointer"
                  >
                    Criar empresa
                  </button>
                </form>
              )}

              <div className="px-2.5 py-2 rounded-md bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-medium text-slate-500">Acesso da conta</div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">
                  {authUser.papel === 'proprietario'
                    ? 'Proprietário (Total)'
                    : authUser.papel === 'financeiro'
                      ? 'Financeiro (Operação)'
                      : 'Contador (Somente leitura)'}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Perfil de Acesso (Demo)
              </label>
              <select
                value={role}
                onChange={(e) => onChangeRole(e.target.value as AccessRole)}
                className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-md bg-slate-50 text-slate-800"
              >
                <option value="proprietario">Proprietário (Total)</option>
                <option value="financeiro">Financeiro (Operação)</option>
                <option value="leitura">Contador (Somente leitura)</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="py-1.5 px-2 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center justify-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              Onboarding
            </button>
            <button
              type="button"
              onClick={() => onOpenHelp('ajuda')}
              className="py-1.5 px-2 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center justify-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3 h-3" />
              Ajuda
            </button>
          </div>

          {authUser ? (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair ({authUser.nome.split(' ')[0]})
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-[#1E40AF] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Criar conta / Entrar
            </button>
          )}

          <PWAInstallButton compact />

          <button
            type="button"
            onClick={onBackToSite}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao site LORDES
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="fixed inset-0 bg-slate-950/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-slate-200">
            <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between">
              <span className="font-display text-sm font-bold text-slate-900 truncate">
                {dataset.empresa.produtoNome}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500"
                aria-label="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onChangeTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg ${
                      active ? 'text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    style={active ? { backgroundColor: accentColor } : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 space-y-2">
              {!authUser && (
                <select
                  value={segment}
                  onChange={(e) => onChangeSegment(e.target.value as SegmentKey)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md bg-slate-50"
                >
                  {SEGMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              <PWAInstallButton compact />
              <button
                type="button"
                onClick={onBackToSite}
                className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
              >
                Voltar ao site LORDES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegação"
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
              <span className="font-semibold text-slate-800 truncate">{dataset.empresa.nomeFantasia}</span>
              <span aria-hidden="true">/</span>
              <span className="text-slate-600 whitespace-nowrap">{activeTabLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isReadOnly ? (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg whitespace-nowrap">
                Modo Contador · Somente leitura
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEntryModal({ mode: 'quick' })}
                  style={{ backgroundColor: accentColor }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Lançamento Rápido
                </button>
                <button
                  type="button"
                  onClick={() => setEntryModal({ mode: 'full' })}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Completo
                </button>
              </>
            )}
          </div>
        </header>

        {toastMsg && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 no-print">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* 1. DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              {authUser && !dataset.empresa.onboardingCompleted && !isReadOnly && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1E40AF]">
                      <Sparkles className="w-4 h-4" />
                      Primeiros passos de {dataset.empresa.nomeFantasia}
                    </div>
                    <p className="text-xs text-slate-600">
                      Complete a configuração guiada para definir saldo inicial, importar extrato ou lançar movimentações e deixar o site conectado pronto.
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-700">
                      <span>
                        {dataset.contas.some((c) => c.saldoInicialCents > 0) ? '✓' : '○'} Saldo das contas
                      </span>
                      <span>
                        {activeTransactions.length > 0 ? '✓' : '○'} Primeiros lançamentos ({activeTransactions.length})
                      </span>
                      <span>
                        {dataset.empresa.siteSlug ? '✓' : '○'} Link do site (?site={effectiveSiteSlug})
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenConnectedSite(effectiveSiteSlug)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Ver site conectado
                    </button>
                    <button
                      type="button"
                      onClick={onOpenOnboarding}
                      style={{ backgroundColor: accentColor }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Abrir OnboardWizard
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className={`flex-1 border rounded-xl p-4 flex items-start sm:items-center gap-3.5 ${semaforoStyles.wrap}`}>
                  <div className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 shrink-0 ${semaforoStyles.badge}`}>
                    <SemaforoIcon className="w-3.5 h-3.5" />
                    <span>Semáforo: {metrics.semaforo.label}</span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{metrics.semaforo.mensagem}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyWeeklyWhatsApp}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Resumo WhatsApp
                  </button>
                  <select
                    value={selectedCentroCusto}
                    onChange={(e) => setSelectedCentroCusto(e.target.value)}
                    className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700"
                  >
                    <option value="">Todas as unidades / obras</option>
                    {(dataset.centrosCusto || []).map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg overflow-x-auto">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPeriod(opt.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        period === opt.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {period === 'personalizado' && (
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="date"
                      value={customRange.start}
                      onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))}
                      className="px-2.5 py-1.5 font-mono-num border border-slate-300 rounded-lg bg-white"
                    />
                    <span className="text-slate-400">até</span>
                    <input
                      type="date"
                      value={customRange.end}
                      onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
                      className="px-2.5 py-1.5 font-mono-num border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              {metrics.alertas.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {metrics.alertas.map((al) => (
                    <div
                      key={al.id}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                        al.nivel === 'critico'
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                          : 'bg-amber-50/70 border-amber-200 text-amber-950'
                      }`}
                    >
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          al.nivel === 'critico' ? 'text-rose-700' : 'text-amber-700'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold">{al.titulo}</div>
                        <div className="text-xs opacity-90 mt-0.5">{al.descricao}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-sm font-bold text-slate-900">
                    Números essenciais do período
                  </h2>
                  <span className="text-xs text-slate-500">Clique no ícone ? para ver a fórmula</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    title="Faturamento"
                    plainHint="Quanto vendi"
                    value={formatBRL(metrics.faturamentoCents)}
                    deltaPct={metrics.faturamentoDeltaPct}
                    question="Quanto vendi no período?"
                    formula="Soma das receitas do período"
                  />
                  <KpiCard
                    title="Despesas"
                    plainHint="Quanto gastei"
                    value={formatBRL(metrics.despesasCents)}
                    deltaPct={metrics.despesasDeltaPct}
                    invertDeltaColor
                    question="Quanto gastei no período?"
                    formula="Soma das despesas do período"
                  />
                  <KpiCard
                    title="Resultado (Quanto sobrou)"
                    plainHint="Lucro ou prejuízo"
                    value={formatBRL(metrics.resultadoCents)}
                    deltaPct={metrics.resultadoDeltaPct}
                    tone={metrics.resultadoCents >= 0 ? 'positive' : 'negative'}
                    question="Sobrou dinheiro no período?"
                    formula="Receitas − Despesas"
                  />
                  <KpiCard
                    title="Margem líquida"
                    plainHint="Quanto sobra de cada R$ 100"
                    value={formatPercent(metrics.margemLiquidaPct)}
                    tone={
                      metrics.margemLiquidaPct > 10
                        ? 'positive'
                        : metrics.margemLiquidaPct >= 0
                          ? 'warning'
                          : 'negative'
                    }
                    question="De cada R$ 100 vendidos, quanto sobra?"
                    formula="Resultado ÷ Receitas × 100"
                  />
                  <KpiCard
                    title="Saldo em caixa hoje"
                    plainHint="Quanto tenho agora"
                    value={formatBRL(metrics.saldoAtualCents)}
                    tone={metrics.saldoAtualCents >= 0 ? 'neutral' : 'negative'}
                    question="Quanto tenho somando todas as contas?"
                    formula="Soma dos saldos iniciais + movimentações pagas"
                  />
                  <KpiCard
                    title="A receber (30 dias)"
                    plainHint="Quanto vai entrar"
                    value={formatBRL(metrics.aReceber30dCents)}
                    question="Quanto tenho a receber até os próximos 30 dias?"
                    formula="Receitas previstas não recebidas + atrasadas"
                  />
                  <KpiCard
                    title="A pagar (30 dias)"
                    plainHint="Quanto vou ter que pagar"
                    value={formatBRL(metrics.aPagar30dCents)}
                    question="Quanto preciso pagar até os próximos 30 dias?"
                    formula="Despesas previstas não pagas + atrasadas"
                  />
                  <KpiCard
                    title="Saldo projetado (30 dias)"
                    plainHint="Vou ficar no azul ou vermelho?"
                    value={formatBRL(metrics.saldoProjetado30dCents)}
                    tone={metrics.saldoProjetado30dCents >= 0 ? 'positive' : 'negative'}
                    question="Vou ficar no azul ou no vermelho em 30 dias?"
                    formula="Saldo atual + A receber (30d) − A pagar (30d)"
                  />
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="mb-4">
                    <h3 className="font-display text-sm font-bold text-slate-900">Receitas x Despesas</h3>
                    <p className="text-xs text-slate-500">Comparativo mensal e previsão dos próximos 30 dias</p>
                  </div>
                  <RevenueExpenseChart data={revExpChartData} accentColor={accentColor} />
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="mb-4">
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      Fluxo de caixa acumulado
                    </h3>
                    <p className="text-xs text-slate-500">Histórico realizado e projeção para os próximos 30 dias</p>
                  </div>
                  <CashFlowAreaChart points={cashFlowSeries} accentColor={accentColor} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display text-sm font-bold text-slate-900">Meta de faturamento</h3>
                      <span className="text-xs font-mono-num font-semibold text-slate-700">
                        {metaProgressPct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${metaProgressPct}%`, backgroundColor: accentColor }}
                      />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 font-mono-num">
                      <span>{formatBRL(curMonthMetrics.faturamentoCents)}</span>
                      <span>Meta: {formatBRL(dataset.meta.faturamentoCents)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {faltaParaMetaCents > 0
                        ? `Ritmo necessário: ${formatBRL(ritmoDiarioNecessarioCents)} por dia nos próximos ${diasRestantes} dia(s).`
                        : 'Meta mensal atingida!'}
                    </p>
                  </div>

                  <div className="pt-5 border-t border-slate-100">
                    <h4 className="font-display text-xs font-bold text-slate-900 mb-3">
                      Despesas por categoria
                    </h4>
                    <div className="space-y-2.5">
                      {metrics.despesasPorCategoria.slice(0, 5).map((item) => (
                        <div key={item.nome}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-700 truncate pr-2">{item.nome}</span>
                            <span className="font-mono-num text-slate-900 font-medium shrink-0">
                              {formatBRL(item.valorCents)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-700 rounded-full"
                              style={{ width: `${Math.min(100, item.pct)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {metrics.despesasPorCategoria.length === 0 && (
                        <p className="text-xs text-slate-400">Sem despesas no período.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-900 mb-1">
                      Receitas por origem
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      De onde vêm as vendas registradas no período
                    </p>
                    <div className="space-y-3">
                      {metrics.receitasPorOrigem.map((orig) => (
                        <div key={orig.origem}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">{orig.origem}</span>
                            <span className="font-mono-num text-slate-900">
                              {formatBRL(orig.valorCents)} ({orig.pct.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, orig.pct)}%`, backgroundColor: accentColor }}
                            />
                          </div>
                        </div>
                      ))}
                      {metrics.receitasPorOrigem.length === 0 && (
                        <p className="text-xs text-slate-400">Sem receitas no período.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Leads ativos no CRM</span>
                    <button
                      type="button"
                      onClick={() => onChangeTab('crm')}
                      className="font-semibold hover:underline cursor-pointer"
                      style={{ color: accentColor }}
                    >
                      {dataset.leads.length} lead(s) →
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display text-sm font-bold text-slate-900">
                        Próximos vencimentos
                      </h3>
                      <button
                        type="button"
                        onClick={() => onChangeTab('contas_pr')}
                        className="text-xs font-semibold hover:underline cursor-pointer"
                        style={{ color: accentColor }}
                      >
                        Ver todos
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {openPayablesReceivables.slice(0, 5).map((item) => {
                        const isOverdue = item.status === 'atrasado' || item.dataVencimento < today;
                        return (
                          <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 truncate">
                                {item.descricao}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono-num">
                                {formatDateBR(item.dataVencimento)} ·{' '}
                                <span className={isOverdue ? 'text-rose-700 font-semibold' : ''}>
                                  {isOverdue ? 'Atrasado' : item.tipo === 'receita' ? 'A receber' : 'A pagar'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-xs font-bold font-mono-num ${
                                  item.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {item.tipo === 'receita' ? '+' : '-'}
                                {formatBRL(item.valorCents - (item.valorPagoCents ?? 0))}
                              </span>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => setBaixaTarget(item)}
                                  className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded cursor-pointer"
                                >
                                  Baixar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {openPayablesReceivables.length === 0 && (
                        <p className="text-xs text-slate-500 py-4">Nenhuma conta em aberto no momento.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 2. SAÚDE E KPIS AVANÇADOS */}
          {activeTab === 'kpis' && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Indicadores de saúde e desempenho comercial
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fórmulas gerenciais transparentes para decisão do dono (clique no ? de cada cartão)
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg overflow-x-auto">
                  {PERIOD_OPTIONS.filter((p) => p.id !== 'personalizado').map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPeriod(opt.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
                        period === opt.id ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 mb-3">
                  Saúde do negócio (Estrutura e Caixa)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    title="Ponto de equilíbrio"
                    plainHint="Mínimo para não ter prejuízo"
                    value={formatBRL(metrics.pontoEquilibrioCents)}
                    question="Quanto preciso vender para pagar toda a estrutura?"
                    formula="Custos fixos ÷ Margem de contribuição %"
                  />
                  <KpiCard
                    title="Margem de contribuição"
                    plainHint="Sobra por venda p/ pagar fixos"
                    value={formatPercent(metrics.margemContribuicaoPct)}
                    question="Quanto cada venda ajuda a pagar os custos fixos?"
                    formula="(Receita − Custos variáveis) ÷ Receita × 100"
                  />
                  <KpiCard
                    title="Custos fixos mensais"
                    plainHint="Peso da estrutura"
                    value={formatBRL(metrics.custosFixosMensaisCents)}
                    question="Quanto custa manter a empresa aberta no período?"
                    formula="Soma das despesas marcadas como fixas"
                  />
                  <KpiCard
                    title="Runway (Fôlego de caixa)"
                    plainHint="Meses de autonomia"
                    value={`${metrics.runwayMeses.toFixed(1).replace('.', ',')} meses`}
                    tone={metrics.runwayMeses >= 2 ? 'positive' : 'warning'}
                    question="Por quantos meses o caixa aguenta no ritmo atual?"
                    formula="Saldo em caixa ÷ Média de despesas mensais"
                  />
                  <KpiCard
                    title="Inadimplência"
                    plainHint="Atraso sobre a receber"
                    value={formatPercent(metrics.inadimplenciaPct)}
                    tone={metrics.inadimplenciaPct > 15 ? 'negative' : metrics.inadimplenciaPct >= 5 ? 'warning' : 'positive'}
                    question="Qual o percentual de recebíveis atrasados?"
                    formula="A receber atrasado ÷ Total a receber × 100"
                  />
                  <KpiCard
                    title="Prazo médio de recebimento"
                    plainHint="Velocidade de entrada"
                    value={`${metrics.prazoMedioRecebimentoDias} dias`}
                    question="Quantos dias levo para receber após vender?"
                    formula="Média de dias entre competência e recebimento"
                  />
                  <KpiCard
                    title="Prazo médio de pagamento"
                    plainHint="Folga com fornecedores"
                    value={`${metrics.prazoMedioPagamentoDias} dias`}
                    question="Quantos dias tenho para pagar compras?"
                    formula="Média de dias entre compra e pagamento"
                  />
                  <KpiCard
                    title="Variação mês a mês"
                    plainHint="Crescimento de vendas"
                    value={formatPercent(metrics.variacaoMesAMesPct)}
                    tone={metrics.variacaoMesAMesPct >= 0 ? 'positive' : 'negative'}
                    question="As vendas cresceram ou caíram em relação ao mês anterior?"
                    formula="(Mês atual − Mês anterior) ÷ Mês anterior × 100"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 mb-3">
                  KPIs Comerciais, Marketing &amp; Recorrência
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <KpiCard
                    title="Ticket médio"
                    plainHint="Valor médio por venda"
                    value={formatBRL(metrics.ticketMedioCents)}
                    question="Quanto cada venda gera em média?"
                    formula="Receita do período ÷ Nº de vendas"
                  />
                  <KpiCard
                    title="Nº de vendas"
                    plainHint="Volume de entradas"
                    value={String(metrics.numVendas)}
                    question="Quantas vendas foram fechadas?"
                    formula="Contagem de receitas no período"
                  />
                  <KpiCard
                    title="CAC estimado"
                    plainHint="Custo por novo cliente"
                    value={formatBRL(metrics.cacCents)}
                    question="Quanto custa adquirir um cliente pelos canais digitais?"
                    formula="Gasto em marketing ÷ Clientes adquiridos via canais digitais"
                  />
                  <KpiCard
                    title="Retorno do marketing"
                    plainHint="Site + Anúncios"
                    value={`${metrics.retornoMarketingX.toFixed(1).replace('.', ',')}x`}
                    tone={metrics.retornoMarketingX >= 2 ? 'positive' : 'neutral'}
                    question="Quanto volta em receita para cada R$ 1 investido?"
                    formula="Receita atribuída (Site/Google/Insta) ÷ Gasto em marketing"
                  />
                  <KpiCard
                    title="Receita recorrente"
                    plainHint={`Avulsa: ${formatBRL(metrics.receitaAvulsaCents)}`}
                    value={formatBRL(metrics.receitaRecorrenteCents)}
                    question="Quanto da receita vem de contratos recorrentes?"
                    formula="Soma de receitas marcadas como recorrentes"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="font-display text-sm font-bold text-slate-900 mb-3">
                    Receita e margem por produto / serviço
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2.5 font-medium">Produto / Serviço</th>
                          <th className="py-2.5 font-medium text-right">Vendas</th>
                          <th className="py-2.5 font-medium text-right">Receita</th>
                          <th className="py-2.5 font-medium text-right">Margem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {metrics.receitasPorProduto.map((pr) => (
                          <tr key={pr.nome} className="hover:bg-slate-50">
                            <td className="py-2.5 font-medium text-slate-900">{pr.nome}</td>
                            <td className="py-2.5 text-right font-mono-num text-slate-600">{pr.qtd}</td>
                            <td className="py-2.5 text-right font-mono-num font-semibold text-slate-900">
                              {formatBRL(pr.valorCents)}
                            </td>
                            <td className="py-2.5 text-right font-mono-num font-semibold text-emerald-700">
                              {formatPercent(pr.margemPct)}
                            </td>
                          </tr>
                        ))}
                        {metrics.receitasPorProduto.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              Vincule produtos/serviços ao lançar receitas para medir margem por item.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="font-display text-sm font-bold text-slate-900 mb-3">
                    Receita por cliente (Concentração)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2.5 font-medium">Cliente</th>
                          <th className="py-2.5 font-medium text-right">Vendas</th>
                          <th className="py-2.5 font-medium text-right">Total</th>
                          <th className="py-2.5 font-medium text-right">Participação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {metrics.topClientes.map((cli) => (
                          <tr key={cli.nome} className="hover:bg-slate-50">
                            <td className="py-2.5 font-medium text-slate-900">{cli.nome}</td>
                            <td className="py-2.5 text-right font-mono-num text-slate-600">{cli.qtd}</td>
                            <td className="py-2.5 text-right font-mono-num font-semibold text-slate-900">
                              {formatBRL(cli.valorCents)}
                            </td>
                            <td className="py-2.5 text-right font-mono-num text-slate-600">
                              {metrics.faturamentoCents > 0
                                ? formatPercent((cli.valorCents / metrics.faturamentoCents) * 100)
                                : '0,0%'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. LANÇAMENTOS */}
          {activeTab === 'lancamentos' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">Lançamentos financeiros</h2>
                  <p className="text-xs text-slate-500">
                    Receitas, despesas, parcelamentos, recorrências, anexos e importação OFX/CSV
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!isReadOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (authUser && !entitlements.allowOfx) {
                            notify('Importação OFX disponível no plano Profissional/Premium; CSV liberado.');
                          }
                          setImportModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        {authUser && !entitlements.allowOfx ? 'Importar CSV' : 'Importar OFX / CSV'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const count = onGenerateRecurrences();
                          notify(
                            count > 0
                              ? `${count} lançamento(s) recorrente(s) gerado(s) para este mês.`
                              : 'Todas as recorrências deste mês já foram geradas.',
                          );
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        Gerar recorrências
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAuditDrawer((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    Histórico ({dataset.auditoria.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTransactionsCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTransactionsXLSX}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Excel (.xlsx)
                  </button>
                </div>
              </div>

              {showAuditDrawer && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xs font-bold text-slate-900">
                      Auditoria de alterações (quem mudou o quê e quando)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAuditDrawer(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Ocultar
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto text-xs">
                    {dataset.auditoria.map((a) => (
                      <div key={a.id} className="py-2 flex flex-wrap justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-900">{a.usuario}</span>{' '}
                          <span className="text-slate-600">· {a.resumo}</span>
                        </div>
                        <span className="font-mono-num text-slate-400">{a.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTx}
                    onChange={(e) => setSearchTx(e.target.value)}
                    placeholder="Buscar por descrição, categoria ou cliente..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                  />
                </div>
                <select
                  value={filterTipoTx}
                  onChange={(e) => setFilterTipoTx(e.target.value as typeof filterTipoTx)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="todos">Todos os tipos</option>
                  <option value="receita">Receitas</option>
                  <option value="despesa">Despesas</option>
                  <option value="transferencia">Transferências</option>
                </select>
                <select
                  value={filterStatusTx}
                  onChange={(e) => setFilterStatusTx(e.target.value as typeof filterStatusTx)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="todos">Todas as situações</option>
                  <option value="pago">Pago / Recebido</option>
                  <option value="previsto">Previsto</option>
                  <option value="atrasado">Atrasado</option>
                </select>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="py-3 px-4 font-medium">Vencimento</th>
                        <th className="py-3 px-4 font-medium">Descrição</th>
                        <th className="py-3 px-4 font-medium">Categoria / Conta</th>
                        <th className="py-3 px-4 font-medium">Situação</th>
                        <th className="py-3 px-4 font-medium text-right">Valor</th>
                        {!isReadOnly && <th className="py-3 px-4 font-medium text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((l) => {
                        const isOverdue = l.status === 'atrasado' || (l.status === 'previsto' && l.dataVencimento < today);
                        return (
                          <tr key={l.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4 font-mono-num text-slate-600 whitespace-nowrap">
                              {formatDateBR(l.dataVencimento)}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{l.descricao}</span>
                                {l.anexoDataUrl && (
                                  <a
                                    href={l.anexoDataUrl}
                                    download={l.anexoNome || 'comprovante'}
                                    title={`Baixar anexo: ${l.anexoNome || 'arquivo'}`}
                                    className="text-[#1E40AF] hover:opacity-75"
                                  >
                                    <Paperclip className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {l.formaPagamento}
                                {l.pessoaId && pessoaMap.get(l.pessoaId) ? ` · ${pessoaMap.get(l.pessoaId)}` : ''}
                                {l.centroCustoId && ccMap.get(l.centroCustoId) ? ` · ${ccMap.get(l.centroCustoId)}` : ''}
                                {l.origem ? ` · ${l.origem}` : ''}
                                {l.recorrente ? ` · Recorrente (${l.frequencia})` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <div>{l.tipo === 'transferencia' ? 'Transferência interna' : catMap.get(l.categoriaId)}</div>
                              <div className="text-[11px] text-slate-400">
                                {contaMap.get(l.contaId)}
                                {l.contaDestinoId ? ` → ${contaMap.get(l.contaDestinoId)}` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-medium">
                              {l.status === 'pago' ? (
                                <span className="text-emerald-700">
                                  {l.tipo === 'receita' ? 'Recebido' : 'Pago'}
                                </span>
                              ) : isOverdue ? (
                                <span className="text-rose-700">Atrasado</span>
                              ) : (
                                <span className="text-amber-700">Previsto</span>
                              )}
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-mono-num font-semibold whitespace-nowrap ${
                                l.tipo === 'receita'
                                  ? 'text-emerald-700'
                                  : l.tipo === 'despesa'
                                    ? 'text-rose-700'
                                    : 'text-slate-700'
                              }`}
                            >
                              {l.tipo === 'receita' ? '+' : l.tipo === 'despesa' ? '-' : ''}
                              {formatBRL(l.valorCents)}
                            </td>
                            {!isReadOnly && (
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  {l.status !== 'pago' && l.tipo !== 'transferencia' && (
                                    <button
                                      type="button"
                                      onClick={() => setBaixaTarget(l)}
                                      className="px-2 py-1 text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                    >
                                      Baixar
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setEntryModal({ mode: 'full', edit: l })}
                                    aria-label="Editar lançamento"
                                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteEntry(l.id)}
                                    aria-label="Excluir lançamento"
                                    className="p-1.5 text-slate-400 hover:text-rose-700 rounded cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500">
                            Nenhum lançamento encontrado com os filtros atuais.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. CONTAS A PAGAR E A RECEBER */}
          {activeTab === 'contas_pr' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Contas a pagar e a receber
                  </h2>
                  <p className="text-xs text-slate-500">
                    Baixa total ou parcial, cobrança Pix por WhatsApp e juros/multa para atrasados
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
                  {(
                    [
                      ['todos', 'Em aberto'],
                      ['receber', 'A receber'],
                      ['pagar', 'A pagar'],
                      ['atrasados', 'Atrasados'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPrTab(id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                        prTab === id ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-3">
                <select
                  value={prCategoriaFilter}
                  onChange={(e) => setPrCategoriaFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Todas as categorias</option>
                  {dataset.categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <select
                  value={prPessoaFilter}
                  onChange={(e) => setPrPessoaFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Todos os clientes / fornecedores</option>
                  {dataset.pessoas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="py-3 px-4 font-medium">Vencimento</th>
                        <th className="py-3 px-4 font-medium">Descrição / Pessoa</th>
                        <th className="py-3 px-4 font-medium">Conta prevista</th>
                        <th className="py-3 px-4 font-medium text-right">Original</th>
                        <th className="py-3 px-4 font-medium text-right">Em aberto</th>
                        {!isReadOnly && <th className="py-3 px-4 font-medium text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {openPayablesReceivables.map((item) => {
                        const isOverdue = item.status === 'atrasado' || item.dataVencimento < today;
                        const aberto = Math.max(0, item.valorCents - (item.valorPagoCents ?? 0));
                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono-num whitespace-nowrap">
                              <span className={isOverdue ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                                {formatDateBR(item.dataVencimento)}
                              </span>
                              <div className="text-[11px] text-slate-400">
                                {isOverdue ? 'Em atraso' : 'No prazo'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{item.descricao}</div>
                              <div className="text-[11px] text-slate-500">
                                {catMap.get(item.categoriaId)}
                                {item.pessoaId && pessoaMap.get(item.pessoaId)
                                  ? ` · ${pessoaMap.get(item.pessoaId)}`
                                  : ''}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{contaMap.get(item.contaId)}</td>
                            <td className="py-3 px-4 text-right font-mono-num text-slate-500">
                              {formatBRL(item.valorCents)}
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-mono-num font-bold ${
                                item.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {formatBRL(aberto)}
                            </td>
                            {!isReadOnly && (
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  {item.tipo === 'receita' && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyPixCharge(item)}
                                      className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                                    >
                                      Cobrar Pix
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setBaixaTarget(item)}
                                    style={{ backgroundColor: accentColor }}
                                    className="px-3 py-1.5 text-[11px] font-semibold text-white rounded-md cursor-pointer"
                                  >
                                    {item.tipo === 'receita' ? 'Receber' : 'Pagar'}
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {openPayablesReceivables.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500">
                            Tudo em dia! Não há contas pendentes neste filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. CRM E LEADS DO SITE */}
          {activeTab === 'crm' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    CRM &amp; Leads capturados pelo Site
                  </h2>
                  <p className="text-xs text-slate-500">
                    Orçamentos enviados pelo site viram leads e, ao aprovar, geram receita prevista no caixa
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {authUser && (
                    <button
                      type="button"
                      onClick={() => {
                        onRefreshTenant();
                        notify('Leads sincronizados com o site da empresa.');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Atualizar leads
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenConnectedSite(effectiveSiteSlug)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir site conectado
                  </button>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setShowLeadForm((v) => !v)}
                      style={{ backgroundColor: accentColor }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Novo Lead Manual
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Globe className="w-3.5 h-3.5 text-[#1E40AF]" />
                    <span>Link exclusivo do site conectado à {dataset.empresa.nomeFantasia}</span>
                  </div>
                  <div className="text-xs font-mono-num text-slate-500 truncate mt-0.5">
                    {connectedSiteUrl}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(connectedSiteUrl);
                      notify('Link exclusivo do site copiado.');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar link
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeTab('configuracoes')}
                    className="px-3 py-1.5 text-xs font-semibold text-[#1E40AF] bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                  >
                    Código para site externo
                  </button>
                </div>
              </div>

              {showLeadForm && !isReadOnly && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!leadNome.trim() || !leadEmpresa.trim()) return;
                    onAddLead({
                      nome: leadNome.trim(),
                      empresaNome: leadEmpresa.trim(),
                      telefone: leadTel.trim() || '(11) 99999-0000',
                      email: leadEmail.trim() || 'contato@cliente.com.br',
                      segmento: dataset.empresa.segmento,
                      planoInteresse: 'Profissional',
                      origem: leadOrigem,
                      valorEstimadoCents: parseBRLInputToCents(leadValorStr) || 200000,
                      servicoSolicitado: leadServico.trim() || 'Orçamento comercial',
                    });
                    setLeadNome('');
                    setLeadEmpresa('');
                    setLeadTel('');
                    setLeadEmail('');
                    setLeadServico('');
                    setShowLeadForm(false);
                  }}
                  className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  <input
                    type="text"
                    required
                    value={leadNome}
                    onChange={(e) => setLeadNome(e.target.value)}
                    placeholder="Nome do contato"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={leadEmpresa}
                    onChange={(e) => setLeadEmpresa(e.target.value)}
                    placeholder="Empresa do cliente"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={leadTel}
                    onChange={(e) => setLeadTel(e.target.value)}
                    placeholder="WhatsApp"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={leadServico}
                    onChange={(e) => setLeadServico(e.target.value)}
                    placeholder="Serviço / Produto solicitado"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg sm:col-span-2"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={leadValorStr}
                      onChange={(e) => setLeadValorStr(e.target.value)}
                      placeholder="Valor R$"
                      className="w-full px-3 py-2 text-xs font-mono-num border border-slate-300 rounded-lg"
                    />
                    <select
                      value={leadOrigem}
                      onChange={(e) => setLeadOrigem(e.target.value as MarketingOrigin)}
                      className="px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Site LORDES">Site</option>
                      <option value="Google">Google</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Indicação">Indicação</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowLeadForm(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{ backgroundColor: accentColor }}
                      className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer"
                    >
                      Salvar Lead
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="py-3 px-4 font-medium">Data</th>
                        <th className="py-3 px-4 font-medium">Cliente / Empresa</th>
                        <th className="py-3 px-4 font-medium">Escopo / Origem</th>
                        <th className="py-3 px-4 font-medium text-right">Valor estimado</th>
                        <th className="py-3 px-4 font-medium">Estágio</th>
                        {!isReadOnly && <th className="py-3 px-4 font-medium text-right">Financeiro</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dataset.leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono-num text-slate-500 whitespace-nowrap">
                            {formatDateBR(lead.criadoEm)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{lead.empresaNome}</div>
                            <div className="text-[11px] text-slate-500">
                              {lead.nome} · {lead.telefone}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-800">{lead.servicoSolicitado}</div>
                            <div className="text-[11px] text-slate-500">
                              Origem: {lead.origem} · Plano {lead.planoInteresse}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900">
                            {formatBRL(lead.valorEstimadoCents)}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              disabled={isReadOnly}
                              value={lead.estagio}
                              onChange={(e) => onUpdateLeadStage(lead.id, e.target.value as LeadStage)}
                              className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-md bg-white"
                            >
                              <option value="Novo Lead">Novo Lead</option>
                              <option value="Orçamento Enviado">Orçamento Enviado</option>
                              <option value="Aprovado">Aprovado</option>
                              <option value="Perdido">Perdido</option>
                            </select>
                          </td>
                          {!isReadOnly && (
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {lead.convertidoLancamentoId ? (
                                <span className="text-emerald-700 font-semibold">
                                  Lançado no caixa
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onConvertLeadToReceivable(lead.id)}
                                  style={{ backgroundColor: accentColor }}
                                  className="px-3 py-1.5 text-[11px] font-semibold text-white rounded-md cursor-pointer"
                                >
                                  Aprovar e Gerar Receita
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. FLUXO DE CAIXA & DRE SIMPLIFICADO */}
          {activeTab === 'relatorios' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Relatórios gerenciais (Fluxo de Caixa e DRE)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pronto para o dono analisar por unidade e o contador exportar em planilha ou PDF
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setReportSubTab('dre')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                        reportSubTab === 'dre' ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      DRE Simplificado
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportSubTab('fluxo')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                        reportSubTab === 'fluxo' ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      Fluxo de Caixa
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      reportSubTab === 'dre'
                        ? handleExportDreCSV()
                        : downloadCSV(
                            `fluxo-caixa-${today}.csv`,
                            ['Data', 'Tipo', 'Entradas (R$)', 'Saídas (R$)', 'Saldo Acumulado (R$)'],
                            cashFlowSeries.map((p) => [
                              formatDateBR(p.isoDate),
                              p.tipo,
                              (p.entradasCents / 100).toFixed(2).replace('.', ','),
                              (p.saidasCents / 100).toFixed(2).replace('.', ','),
                              (p.saldoAcumuladoCents / 100).toFixed(2).replace('.', ','),
                            ]),
                          )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      reportSubTab === 'dre'
                        ? handleExportDreXLSX()
                        : downloadXLSX(
                            `fluxo-caixa-${today}.xlsx`,
                            'Fluxo de Caixa',
                            ['Data', 'Tipo', 'Entradas (R$)', 'Saídas (R$)', 'Saldo Acumulado (R$)'],
                            cashFlowSeries.map((p) => [
                              formatDateBR(p.isoDate),
                              p.tipo,
                              (p.entradasCents / 100).toFixed(2).replace('.', ','),
                              (p.saidasCents / 100).toFixed(2).replace('.', ','),
                              (p.saldoAcumuladoCents / 100).toFixed(2).replace('.', ','),
                            ]),
                          )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    PDF / Imprimir
                  </button>
                </div>
              </div>

              {reportSubTab === 'dre' ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900">
                        DRE Simplificado Mensal — {dataset.empresa.nomeFantasia}
                      </h3>
                      <p className="text-xs text-slate-500">Regime de competência gerencial</p>
                    </div>
                    <div className="flex items-center gap-2 no-print">
                      <select
                        value={dreCentroCusto}
                        onChange={(e) => setDreCentroCusto(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">Todos os centros de custo</option>
                        {(dataset.centrosCusto || []).map((cc) => (
                          <option key={cc.id} value={cc.id}>
                            {cc.nome}
                          </option>
                        ))}
                      </select>
                      <input
                        type="month"
                        value={dreMonth}
                        onChange={(e) => setDreMonth(e.target.value)}
                        className="px-3 py-1.5 text-xs font-mono-num border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 text-sm">
                    {[
                      { label: '(+) Receita Bruta', val: dreSummary.receitaBrutaCents, bold: true },
                      { label: '(−) Deduções, Impostos e Taxas', val: -dreSummary.deducoesCents },
                      { label: '(=) Receita Líquida', val: dreSummary.receitaLiquidaCents, bold: true },
                      { label: '(−) Custos Variáveis (Materiais, Insumos, Mão de Obra)', val: -dreSummary.custosVariaveisCents },
                      { label: '(=) Margem de Contribuição', val: dreSummary.margemContribuicaoCents, bold: true },
                      { label: '(−) Despesas Fixas (Estrutura, Aluguel, Equipe)', val: -dreSummary.despesasFixasCents },
                      { label: '(−) Investimento em Marketing e Site', val: -dreSummary.marketingCents },
                      {
                        label: '(=) Resultado Líquido do Mês (Lucro / Prejuízo)',
                        val: dreSummary.resultadoLiquidoCents,
                        bold: true,
                        highlight: true,
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className={`py-3 flex items-center justify-between ${
                          row.highlight ? 'bg-slate-50 px-3 rounded-lg mt-2' : ''
                        }`}
                      >
                        <span className={row.bold ? 'font-bold text-slate-900' : 'text-slate-600'}>
                          {row.label}
                        </span>
                        <span
                          className={`font-mono-num ${row.bold ? 'font-bold' : 'font-medium'} ${
                            row.val < 0
                              ? 'text-rose-700'
                              : row.highlight
                                ? 'text-emerald-700'
                                : 'text-slate-900'
                          }`}
                        >
                          {formatBRL(row.val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <CashFlowAreaChart points={cashFlowSeries} accentColor={accentColor} />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <th className="py-3 px-4 font-medium">Marco</th>
                          <th className="py-3 px-4 font-medium">Classificação</th>
                          <th className="py-3 px-4 font-medium text-right">Entradas</th>
                          <th className="py-3 px-4 font-medium text-right">Saídas</th>
                          <th className="py-3 px-4 font-medium text-right">Saldo Acumulado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cashFlowSeries.map((pt) => (
                          <tr key={pt.isoDate}>
                            <td className="py-2.5 px-4 font-mono-num font-medium text-slate-900">
                              {pt.label} ({formatDateBR(pt.isoDate)})
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {pt.tipo === 'realizado' ? 'Realizado' : 'Projetado'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num text-emerald-700">
                              +{formatBRL(pt.entradasCents)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num text-rose-700">
                              -{formatBRL(pt.saidasCents)}
                            </td>
                            <td
                              className={`py-2.5 px-4 text-right font-mono-num font-bold ${
                                pt.saldoAcumuladoCents >= 0 ? 'text-slate-900' : 'text-rose-700'
                              }`}
                            >
                              {formatBRL(pt.saldoAcumuladoCents)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. METAS, CONTAS E CADASTROS COMPLETOS */}
          {activeTab === 'cadastros' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Metas, Contas, Categorias, Centros de Custo e Catálogo
                </h2>
                <p className="text-xs text-slate-500">
                  Configure metas mensais, contas financeiras, categorias personalizadas, unidades e margem de itens
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (isReadOnly) return;
                    onUpdateMeta(
                      parseBRLInputToCents(metaFatStr) || dataset.meta.faturamentoCents,
                      parseBRLInputToCents(metaLucroStr) || dataset.meta.lucroCents,
                      parseBRLInputToCents(metaLimStr) || dataset.meta.limiteDespesaCents,
                    );
                    setMetaSavedMsg(true);
                    setTimeout(() => setMetaSavedMsg(false), 2500);
                  }}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
                >
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Metas do mês ({dataset.meta.mesReferencia})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Meta Faturamento (R$)
                      </label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={metaFatStr}
                        onChange={(e) => setMetaFatStr(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Meta Lucro (R$)
                      </label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={metaLucroStr}
                        onChange={(e) => setMetaLucroStr(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Limite Despesas (R$)
                      </label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={metaLimStr}
                        onChange={(e) => setMetaLimStr(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-emerald-700 font-medium">
                        {metaSavedMsg ? 'Metas atualizadas no dashboard.' : ''}
                      </span>
                      <button
                        type="submit"
                        style={{ backgroundColor: accentColor }}
                        className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                      >
                        Salvar metas
                      </button>
                    </div>
                  )}
                </form>

                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Saldos por conta financeira
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {metrics.saldosPorConta.map((c) => (
                      <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-900">{c.nome}</div>
                          <div className="text-[11px] text-slate-500 capitalize">{c.tipo}</div>
                        </div>
                        <div className="font-mono-num font-bold text-slate-900">
                          {formatBRL(c.saldoCents)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isReadOnly && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newContaNome.trim()) return;
                        onAddConta(newContaNome.trim(), newContaTipo, parseBRLInputToCents(newContaSaldoStr));
                        setNewContaNome('');
                        setNewContaSaldoStr('0,00');
                      }}
                      className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-2"
                    >
                      <input
                        type="text"
                        value={newContaNome}
                        onChange={(e) => setNewContaNome(e.target.value)}
                        placeholder="Nova conta (ex: Bradesco)"
                        className="sm:col-span-2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                      />
                      <select
                        value={newContaTipo}
                        onChange={(e) => setNewContaTipo(e.target.value as ContaFinanceira['tipo'])}
                        className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                      >
                        <option value="banco">Banco</option>
                        <option value="caixa">Caixa</option>
                        <option value="carteira">Carteira</option>
                      </select>
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Categorias (CRUD) e Centros de Custo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Categorias &amp; Subcategorias ({dataset.categorias.length})
                  </h3>
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto text-xs">
                    {dataset.categorias.map((c) => {
                      const paiNome = c.categoriaPaiId ? catMap.get(c.categoriaPaiId) : null;
                      return (
                        <div key={c.id} className="py-2 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-medium text-slate-900">
                              {paiNome ? `${paiNome} › ${c.nome}` : c.nome}
                            </span>
                            <div className="text-[11px] text-slate-500">
                              {c.tipo === 'receita' ? 'Receita' : 'Despesa'} ·{' '}
                              {c.natureza === 'fixa' ? 'Fixa' : 'Variável'}
                            </div>
                          </div>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => onDeleteCategoria(c.id)}
                              aria-label="Excluir categoria"
                              className="p-1 text-slate-400 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!isReadOnly && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newCatNome.trim()) return;
                        onAddCategoria({
                          nome: newCatNome.trim(),
                          tipo: newCatTipo,
                          natureza: newCatNat,
                          grupoDre: newCatTipo === 'receita' ? 'receita_bruta' : newCatDre,
                          categoriaPaiId: newCatPai || undefined,
                        });
                        setNewCatNome('');
                        setNewCatPai('');
                      }}
                      className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2"
                    >
                      <input
                        type="text"
                        value={newCatNome}
                        onChange={(e) => setNewCatNome(e.target.value)}
                        placeholder="Nome da categoria"
                        className="col-span-2 sm:col-span-3 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                      />
                      <select
                        value={newCatTipo}
                        onChange={(e) => setNewCatTipo(e.target.value as 'receita' | 'despesa')}
                        className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                      >
                        <option value="despesa">Despesa</option>
                        <option value="receita">Receita</option>
                      </select>
                      <select
                        value={newCatNat}
                        onChange={(e) => setNewCatNat(e.target.value as 'fixa' | 'variavel')}
                        className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                      >
                        <option value="variavel">Variável</option>
                        <option value="fixa">Fixa</option>
                      </select>
                      <select
                        value={newCatPai}
                        onChange={(e) => setNewCatPai(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">Categoria raiz</option>
                        {dataset.categorias
                          .filter((c) => c.tipo === newCatTipo && !c.categoriaPaiId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              Sub de: {c.nome}
                            </option>
                          ))}
                      </select>
                      {newCatTipo === 'despesa' && (
                        <select
                          value={newCatDre}
                          onChange={(e) => setNewCatDre(e.target.value as Categoria['grupoDre'])}
                          className="col-span-2 px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                        >
                          <option value="custo_variavel">DRE: Custo variável</option>
                          <option value="despesa_fixa">DRE: Despesa fixa</option>
                          <option value="deducao">DRE: Dedução / Imposto</option>
                          <option value="marketing">DRE: Marketing</option>
                        </select>
                      )}
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md cursor-pointer"
                      >
                        Criar categoria
                      </button>
                    </form>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Centros de custo / Unidades */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      Centros de custo / Unidades ({(dataset.centrosCusto || []).length})
                    </h3>
                    <div className="divide-y divide-slate-100 text-xs">
                      {(dataset.centrosCusto || []).map((cc) => (
                        <div key={cc.id} className="py-2 font-medium text-slate-900">
                          {cc.nome}
                        </div>
                      ))}
                    </div>
                    {!isReadOnly && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newCcNome.trim()) return;
                          onAddCentroCusto(newCcNome.trim());
                          setNewCcNome('');
                        }}
                        className="pt-2 flex gap-2"
                      >
                        <input
                          type="text"
                          value={newCcNome}
                          onChange={(e) => setNewCcNome(e.target.value)}
                          placeholder="Nova unidade, loja ou obra..."
                          className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md cursor-pointer"
                        >
                          Adicionar
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Produtos e Serviços (Precificação & Margem) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      Produtos &amp; Serviços ({(dataset.produtos || []).length})
                    </h3>
                    <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto text-xs">
                      {(dataset.produtos || []).map((pr) => {
                        const margem =
                          pr.precoVendaCents > 0
                            ? ((pr.precoVendaCents - pr.custoUnitarioCents) / pr.precoVendaCents) * 100
                            : 0;
                        return (
                          <div key={pr.id} className="py-2 flex items-center justify-between gap-2">
                            <div>
                              <div className="font-semibold text-slate-900">{pr.nome}</div>
                              <div className="text-[11px] text-slate-500 font-mono-num">
                                Preço: {formatBRL(pr.precoVendaCents)} · Custo: {formatBRL(pr.custoUnitarioCents)}
                              </div>
                            </div>
                            <span className="font-mono-num font-bold text-emerald-700">
                              {formatPercent(margem)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {!isReadOnly && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newProdNome.trim()) return;
                          onAddProduto(
                            newProdNome.trim(),
                            newProdTipo,
                            parseBRLInputToCents(newProdPrecoStr),
                            parseBRLInputToCents(newProdCustoStr),
                          );
                          setNewProdNome('');
                          setNewProdPrecoStr('');
                          setNewProdCustoStr('');
                        }}
                        className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2"
                      >
                        <input
                          type="text"
                          value={newProdNome}
                          onChange={(e) => setNewProdNome(e.target.value)}
                          placeholder="Item / Serviço"
                          className="col-span-2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                        />
                        <input
                          type="text"
                          value={newProdPrecoStr}
                          onChange={(e) => setNewProdPrecoStr(e.target.value)}
                          placeholder="Preço R$"
                          className="px-2.5 py-1.5 text-xs font-mono-num border border-slate-300 rounded-md"
                        />
                        <input
                          type="text"
                          value={newProdCustoStr}
                          onChange={(e) => setNewProdCustoStr(e.target.value)}
                          placeholder="Custo R$"
                          className="px-2.5 py-1.5 text-xs font-mono-num border border-slate-300 rounded-md"
                        />
                        <select
                          value={newProdTipo}
                          onChange={(e) => setNewProdTipo(e.target.value as 'produto' | 'servico')}
                          className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                        >
                          <option value="servico">Serviço</option>
                          <option value="produto">Produto</option>
                        </select>
                        <button
                          type="submit"
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md cursor-pointer"
                        >
                          Salvar item
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              {/* Clientes e Fornecedores */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Clientes e Fornecedores ({dataset.pessoas.length})
                </h3>
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto text-xs">
                  {dataset.pessoas.map((p) => (
                    <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">{p.nome}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.tipo === 'cliente' ? 'Cliente' : 'Fornecedor'} · {p.telefone}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400">{p.email}</span>
                    </div>
                  ))}
                </div>
                {!isReadOnly && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newPessoaNome.trim()) return;
                      onAddPessoa(newPessoaTipo, newPessoaNome.trim(), newPessoaTel.trim(), newPessoaEmail.trim());
                      setNewPessoaNome('');
                      setNewPessoaTel('');
                      setNewPessoaEmail('');
                    }}
                    className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-5 gap-2"
                  >
                    <select
                      value={newPessoaTipo}
                      onChange={(e) => setNewPessoaTipo(e.target.value as 'cliente' | 'fornecedor')}
                      className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                    >
                      <option value="cliente">Cliente</option>
                      <option value="fornecedor">Fornecedor</option>
                    </select>
                    <input
                      type="text"
                      value={newPessoaNome}
                      onChange={(e) => setNewPessoaNome(e.target.value)}
                      placeholder="Nome"
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                    />
                    <input
                      type="text"
                      value={newPessoaTel}
                      onChange={(e) => setNewPessoaTel(e.target.value)}
                      placeholder="Telefone"
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                    />
                    <input
                      type="email"
                      value={newPessoaEmail}
                      onChange={(e) => setNewPessoaEmail(e.target.value)}
                      placeholder="E-mail"
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md cursor-pointer"
                    >
                      Cadastrar
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* 8. WHITE-LABEL & CONFIGURAÇÕES */}
          {activeTab === 'configuracoes' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Personalização White-Label &amp; Segurança (LGPD)
                </h2>
                <p className="text-xs text-slate-500">
                  Mostre para o cliente da LORDES como o painel assume o nome, as cores e o domínio da empresa dele
                </p>
              </div>

              {/* Plano da Empresa e Recursos Liberados */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Plano ativo: {entitlements.plano} ({formatBRL(entitlements.precoMensalCents)}/mês)
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{entitlements.resumo}</p>
                  </div>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1.5">
                      {(['Essencial', 'Profissional', 'Premium'] as const).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => {
                            onUpdateWhiteLabel({ plano: tier });
                            notify(`Plano alterado para ${tier}.`);
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                            dataset.empresa.plano === tier
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <div className="text-slate-500">Usuários</div>
                    <div className="font-mono-num font-bold text-slate-900">
                      {authUser ? `${teamMembers.length} / ${entitlements.maxUsers}` : `Até ${entitlements.maxUsers}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Empresas</div>
                    <div className="font-mono-num font-bold text-slate-900">
                      {authUser?.companies ? `${authUser.companies.length} / ${entitlements.maxCompanies}` : `Até ${entitlements.maxCompanies}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Extrato OFX &amp; Pix</div>
                    <div className="font-semibold text-slate-900">{entitlements.allowOfx ? 'Liberado' : 'Plano Profissional'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">White-Label</div>
                    <div className="font-semibold text-slate-900">{entitlements.allowWhiteLabel ? 'Liberado' : 'Plano Premium'}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Building2 className="w-4 h-4 text-slate-600" />
                    Identidade visual do cliente (Plano Premium White-Label)
                  </div>
                  {authUser && !entitlements.allowWhiteLabel && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onUpdateWhiteLabel({ plano: 'Premium' })}
                      className="text-xs font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                    >
                      Ativar plano Premium para enviar logo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Nome do painel (Sidebar)
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={dataset.empresa.produtoNome}
                      onChange={(e) => onUpdateWhiteLabel({ produtoNome: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Nome da empresa cliente
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={dataset.empresa.nomeFantasia}
                      onChange={(e) => onUpdateWhiteLabel({ nomeFantasia: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Subdomínio personalizado
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={dataset.empresa.subdominio}
                      onChange={(e) => onUpdateWhiteLabel({ subdominio: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Cor da marca do cliente
                    </label>
                    <div className="flex items-center gap-2">
                      {['#1E40AF', '#0F766E', '#B45309', '#0F172A', '#7C2D12'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => onUpdateWhiteLabel({ corPrimaria: color })}
                          className={`w-8 h-8 rounded-lg border-2 cursor-pointer ${
                            dataset.empresa.corPrimaria === color ? 'border-slate-900 scale-105' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Cor ${color}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Logotipo da empresa (exibido no painel e no site conectado — PNG, JPG, WebP ou SVG até 500 KB)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      {dataset.empresa.logoDataUrl ? (
                        <img
                          src={dataset.empresa.logoDataUrl}
                          alt="Logotipo atual"
                          className="w-12 h-12 rounded-lg object-contain border border-slate-200 bg-slate-50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                          <ImagePlus className="w-5 h-5" />
                        </div>
                      )}
                      {!isReadOnly && (
                        <>
                          <label className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
                            Enviar logotipo
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              className="hidden"
                              onChange={(e) => {
                                setLogoError('');
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (authUser && !entitlements.allowWhiteLabel) {
                                  setLogoError('Upload de logotipo exclusivo do plano Premium.');
                                  return;
                                }
                                if (file.size > 500 * 1024) {
                                  setLogoError('Arquivo maior que 500 KB. Reduza a imagem.');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (typeof reader.result === 'string') {
                                    onUpdateWhiteLabel({ logoDataUrl: reader.result });
                                    notify('Logotipo atualizado.');
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                          {dataset.empresa.logoDataUrl && (
                            <button
                              type="button"
                              onClick={() => onUpdateWhiteLabel({ logoDataUrl: undefined })}
                              className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
                            >
                              Remover logo
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {logoError && <p className="text-xs font-medium text-rose-700 mt-1.5">{logoError}</p>}
                  </div>
                </div>
              </div>

              {/* Linkar Site e Painel (100% isolado por empresa) */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Globe className="w-4 h-4 text-[#1E40AF]" />
                    Linkar Site &harr; Painel (Exclusivo desta loja)
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenConnectedSite(effectiveSiteSlug)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer"
                    style={{ backgroundColor: accentColor }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir site conectado
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Todo orçamento enviado pelo link abaixo ou pelo código de integração cai exclusivamente no CRM de{' '}
                  <strong className="text-slate-900">{dataset.empresa.nomeFantasia}</strong>, sem risco de misturar com outras lojas.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Identificador único do site (slug)
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={dataset.empresa.siteSlug || ''}
                      onChange={(e) =>
                        onUpdateWhiteLabel({
                          siteSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                        })
                      }
                      placeholder="minha-loja"
                      className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      WhatsApp exibido no site
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={dataset.empresa.siteWhatsapp || ''}
                      onChange={(e) => onUpdateWhiteLabel({ siteWhatsapp: e.target.value })}
                      placeholder="(11) 99999-0000"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Título principal da página de orçamento
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={dataset.empresa.siteHeadline || ''}
                      onChange={(e) => onUpdateWhiteLabel({ siteHeadline: e.target.value })}
                      placeholder="Ex: Solicite seu orçamento sob medida em minutos"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">Link direto do site</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(connectedSiteUrl);
                        notify('Link do site copiado.');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E40AF] cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar
                    </button>
                  </div>
                  <div className="text-xs font-mono-num text-slate-600 break-all">{connectedSiteUrl}</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                      Integrar site externo (WordPress, HTML, Next.js)
                    </span>
                    <div className="flex items-center gap-3">
                      {authUser?.papel === 'proprietario' && (
                        <button
                          type="button"
                          onClick={onRotateSiteKey}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Gerar nova chave
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(embedSnippet);
                          notify('Código de integração do site copiado.');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E40AF] cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        Copiar código
                      </button>
                    </div>
                  </div>
                  <pre className="text-[11px] font-mono-num text-slate-700 bg-white border border-slate-200 rounded-md p-3 overflow-x-auto leading-relaxed">
                    {embedSnippet}
                  </pre>
                </div>
              </div>

              {/* Equipe da empresa (acessos separados por loja) */}
              {authUser && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <UserPlus className="w-4 h-4 text-[#1E40AF]" />
                    Usuários da empresa (isolados nesta loja)
                  </div>
                  <p className="text-xs text-slate-600">
                    Cada pessoa entra com seu próprio e-mail e senha, enxergando apenas os dados de{' '}
                    <strong className="text-slate-900">{dataset.empresa.nomeFantasia}</strong>.
                  </p>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {teamMembers.map((m) => (
                      <div key={m.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-semibold text-slate-900">{m.nome}</div>
                          <div className="text-[11px] text-slate-500">
                            {m.email} · {m.papel === 'proprietario' ? 'Proprietário' : m.papel === 'financeiro' ? 'Financeiro' : 'Contador (Somente leitura)'}
                          </div>
                        </div>
                        {authUser.papel === 'proprietario' && m.id !== authUser.id && (
                          <button
                            type="button"
                            onClick={() => void onRemoveTeamMember(m.id)}
                            className="text-rose-700 hover:text-rose-900 font-semibold cursor-pointer"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {authUser.papel === 'proprietario' && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setMemberError('');
                        const err = await onAddTeamMember({
                          nome: memberNome,
                          email: memberEmail,
                          senha: memberSenha,
                          papel: memberPapel,
                        });
                        if (err) {
                          setMemberError(err);
                        } else {
                          setMemberNome('');
                          setMemberEmail('');
                          setMemberSenha('');
                          notify('Novo acesso criado para esta empresa.');
                        }
                      }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2"
                    >
                      <input
                        type="text"
                        required
                        value={memberNome}
                        onChange={(e) => setMemberNome(e.target.value)}
                        placeholder="Nome (ex: João Contador)"
                        className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                      <input
                        type="email"
                        required
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="E-mail de acesso"
                        className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={memberSenha}
                        onChange={(e) => setMemberSenha(e.target.value)}
                        placeholder="Senha inicial (mín. 6)"
                        className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                      <div className="flex gap-2">
                        <select
                          value={memberPapel}
                          onChange={(e) => setMemberPapel(e.target.value as 'financeiro' | 'leitura')}
                          className="flex-1 px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="financeiro">Financeiro (Operação)</option>
                          <option value="leitura">Contador (Somente leitura)</option>
                        </select>
                        <button
                          type="submit"
                          style={{ backgroundColor: accentColor }}
                          className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                        >
                          Adicionar
                        </button>
                      </div>
                      {memberError && (
                        <p className="sm:col-span-2 text-xs font-medium text-rose-700">{memberError}</p>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* Segurança da Conta: 2FA TOTP (QR Code) & Verificação de E-mail */}
              {authUser && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-[#1E40AF]" />
                    Segurança da conta ({authUser.email})
                  </div>

                  {/* Confirmação de E-mail */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                        <MailCheck className="w-4 h-4 text-slate-600" />
                        <span>
                          E-mail:{' '}
                          {authUser.emailVerified ? (
                            <span className="text-emerald-700">Verificado</span>
                          ) : (
                            <span className="text-amber-700">Aguardando verificação</span>
                          )}
                        </span>
                      </div>
                      {!authUser.emailVerified && (
                        <button
                          type="button"
                          onClick={async () => {
                            setSecurityErr('');
                            setSecurityMsg('');
                            const res = await onRequestEmailVerification();
                            if (res.error) setSecurityErr(res.error);
                            else setSecurityMsg(res.message);
                          }}
                          className="text-xs font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                        >
                          Enviar link de confirmação
                        </button>
                      )}
                    </div>
                    {!authUser.emailVerified && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-600">
                          Abra o link enviado ao seu e-mail e volte para atualizar o status.
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            setSecurityErr('');
                            setSecurityMsg('');
                            const err = await onVerifyEmail();
                            if (err) setSecurityErr(err);
                            else setSecurityMsg('E-mail verificado com sucesso.');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md cursor-pointer"
                        >
                          Já confirmei meu e-mail
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2FA TOTP com QR Code */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                        <QrCode className="w-4 h-4 text-slate-600" />
                        <span>
                          Autenticação em dois fatores (2FA TOTP):{' '}
                          {authUser.twoFactorEnabled ? (
                            <span className="text-emerald-700">Ativo</span>
                          ) : (
                            <span className="text-slate-600">Desativado</span>
                          )}
                        </span>
                      </div>
                      {!authUser.twoFactorEnabled && !totpSetup && (
                        <button
                          type="button"
                          onClick={async () => {
                            setSecurityErr('');
                            setSecurityMsg('');
                            const res = await onSetup2FA();
                            if ('error' in res) setSecurityErr(res.error);
                            else setTotpSetup(res);
                          }}
                          style={{ backgroundColor: accentColor }}
                          className="px-3 py-1.5 text-xs font-semibold text-white rounded-md cursor-pointer"
                        >
                          Configurar 2FA com QR Code
                        </button>
                      )}
                    </div>

                    {totpSetup && !authUser.twoFactorEnabled && (
                      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-center">
                        <img
                          src={totpSetup.qrDataUrl}
                          alt="QR Code 2FA LORDES"
                          className="w-36 h-36 border border-slate-200 rounded-lg shrink-0"
                        />
                        <div className="space-y-2.5 flex-1 min-w-0">
                          <p className="text-xs text-slate-700">
                            Escaneie o QR Code no Google Authenticator, Authy ou 1Password e digite o código de 6 dígitos:
                          </p>
                          <div className="text-[11px] font-mono-num text-slate-500 break-all">
                            Chave manual: {totpSetup.secret}
                          </div>
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              setSecurityErr('');
                              const err = await onEnable2FA(totpConfirmCode);
                              if (err) {
                                setSecurityErr(err);
                              } else {
                                setTotpSetup(null);
                                setTotpConfirmCode('');
                                setSecurityMsg('2FA TOTP ativado com sucesso!');
                              }
                            }}
                            className="flex gap-2"
                          >
                            <input
                              type="text"
                              maxLength={6}
                              required
                              value={totpConfirmCode}
                              onChange={(e) => setTotpConfirmCode(e.target.value.replace(/\D/g, ''))}
                              placeholder="000000"
                              className="w-32 px-3 py-1.5 text-xs font-mono-num border border-slate-300 rounded-md"
                            />
                            <button
                              type="submit"
                              style={{ backgroundColor: accentColor }}
                              className="px-3 py-1.5 text-xs font-semibold text-white rounded-md cursor-pointer"
                            >
                              Ativar 2FA
                            </button>
                            <button
                              type="button"
                              onClick={() => setTotpSetup(null)}
                              className="px-2 py-1.5 text-xs text-slate-600 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </form>
                        </div>
                      </div>
                    )}

                    {authUser.twoFactorEnabled && (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setSecurityErr('');
                          const err = await onDisable2FA(disable2FAPass);
                          if (err) setSecurityErr(err);
                          else {
                            setDisable2FAPass('');
                            setSecurityMsg('2FA desativado.');
                          }
                        }}
                        className="flex flex-wrap gap-2 items-center"
                      >
                        <input
                          type="password"
                          required
                          value={disable2FAPass}
                          onChange={(e) => setDisable2FAPass(e.target.value)}
                          placeholder="Digite sua senha atual para desativar 2FA"
                          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md cursor-pointer"
                        >
                          Desativar 2FA
                        </button>
                      </form>
                    )}
                  </div>

                  {securityMsg && <p className="text-xs font-medium text-emerald-700">{securityMsg}</p>}
                  {securityErr && <p className="text-xs font-medium text-rose-700">{securityErr}</p>}
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  LGPD, Portabilidade e Dados da Conta
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Em conformidade com a LGPD (Seção 9.2), o cliente é o controlador de seus dados financeiros e pode exportar todos os lançamentos a qualquer momento, consultar os termos ou excluir definitivamente a conta.
                  {dataset.empresa.aceiteLgpdEm ? ` Aceite registrado em ${formatDateBR(dataset.empresa.aceiteLgpdEm)}.` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportTransactionsCSV}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar lançamentos (CSV)
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenHelp('lgpd')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Termos e Privacidade (LGPD)
                  </button>
                  {!authUser ? (
                    <button
                      type="button"
                      onClick={onResetSegment}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                    >
                      Restaurar dados padrão deste segmento
                    </button>
                  ) : !confirmDeleteAccount ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAccount(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                    >
                      Excluir minha conta (LGPD)
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onDeleteAccount}
                        className="px-3 py-2 text-xs font-semibold text-white bg-rose-700 rounded-lg cursor-pointer"
                      >
                        Confirmar exclusão definitiva
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAccount(false)}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 9. BACKOFFICE & KIT COMERCIAL LORDES */}
          {activeTab === 'lordes_admin' && (
            <LordesAdminView
              clients={saasClients}
              onUpdateClientStatus={onUpdateSaasClientStatus}
            />
          )}
        </main>
      </div>

      {entryModal && !isReadOnly && (
        <QuickEntryModal
          mode={entryModal.mode}
          initialEdit={entryModal.edit}
          empresaId={dataset.empresa.id}
          contas={dataset.contas}
          categorias={dataset.categorias}
          centrosCusto={dataset.centrosCusto || []}
          produtos={dataset.produtos || []}
          pessoas={dataset.pessoas}
          accentColor={accentColor}
          onClose={() => setEntryModal(null)}
          onSaveEntries={(entries, editId) => {
            onSaveEntries(entries, editId);
            setEntryModal(null);
          }}
        />
      )}

      {importModalOpen && !isReadOnly && (
        <StatementImportModal
          empresaId={dataset.empresa.id}
          contas={dataset.contas}
          categorias={dataset.categorias}
          accentColor={accentColor}
          onClose={() => setImportModalOpen(false)}
          onImportRows={(entries) => {
            onSaveEntries(entries);
            notify(`${entries.length} movimento(s) conciliado(s) do extrato.`);
          }}
        />
      )}

      {baixaTarget && !isReadOnly && (
        <BaixaModal
          lancamento={baixaTarget}
          contas={dataset.contas}
          accentColor={accentColor}
          onClose={() => setBaixaTarget(null)}
          onConfirmBaixa={(id, contaId, dataPag, valorPago, jurosMulta, parcial) => {
            onConfirmBaixa(id, contaId, dataPag, valorPago, jurosMulta, parcial);
            setBaixaTarget(null);
          }}
        />
      )}
    </div>
  );
};
