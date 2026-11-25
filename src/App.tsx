import { useCallback, useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { ClientSiteView } from './components/ClientSiteView';
import { HelpAndTermsModal } from './components/HelpAndTermsModal';
import { LandingPage } from './components/LandingPage';
import { OnboardingModal, OnboardingWizardResult } from './components/OnboardingModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import { SaaSWorkspace, WorkspaceTab } from './components/SaaSWorkspace';
import { createInitialSaasClients, createSegmentPreset } from './data/presets';
import { SEGMENT_OPTIONS } from './data/segments';
import {
  AccessRole,
  AuthUserSummary,
  Categoria,
  ContaFinanceira,
  Lancamento,
  LeadCRM,
  LeadStage,
  SaasClientRecord,
  SegmentKey,
  TenantDataset,
} from './types/finance';
import { addDaysISO, formatBRL, getTodayISO } from './utils/formatters';
import { generateDueRecurrences } from './utils/kpiEngine';

const STORAGE_KEY = 'lordes_saas_datasets_v1';

type SegmentStore = Record<SegmentKey, TenantDataset>;

function createDefaultSegmentStore(): SegmentStore {
  return Object.fromEntries(
    SEGMENT_OPTIONS.map(({ value }) => [value, createSegmentPreset(value)]),
  ) as SegmentStore;
}

function loadInitialStore(): SegmentStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SegmentStore>;
      const defaults = createDefaultSegmentStore();
      return Object.fromEntries(
        SEGMENT_OPTIONS.map(({ value }) => [
          value,
          parsed[value] ? { ...defaults[value], ...parsed[value] } : defaults[value],
        ]),
      ) as SegmentStore;
    }
  } catch {
    // fallback to defaults
  }
  return createDefaultSegmentStore();
}

function nowTimestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${getTodayISO()} ${hh}:${mm}`;
}

function readSiteParamFromUrl(): string | null {
  try {
    const slug = new URLSearchParams(window.location.search).get('site');
    return slug && slug.trim() ? slug.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [connectedSiteSlug, setConnectedSiteSlug] = useState<string | null>(readSiteParamFromUrl);
  const [viewMode, setViewMode] = useState<'site' | 'painel'>('site');
  const [segment, setSegment] = useState<SegmentKey>('servicos');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [role, setRole] = useState<AccessRole>('proprietario');
  const [store, setStore] = useState<SegmentStore>(loadInitialStore);

  // Sessão autenticada mantida exclusivamente em memória (sem localStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserSummary | null>(null);
  const [authTenantDataset, setAuthTenantDataset] = useState<TenantDataset | null>(null);
  const [teamMembers, setTeamMembers] = useState<AuthUserSummary[]>([]);
  const [saasClients, setSaasClients] = useState<SaasClientRecord[]>(createInitialSaasClients);

  // Modais globais
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [helpModalTab, setHelpModalTab] = useState<'ajuda' | 'lgpd' | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setConnectedSiteSlug(readSiteParamFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // ignore storage quota errors
    }
  }, [store]);

  const setUrlSiteParam = (slug: string | null) => {
    setConnectedSiteSlug(slug);
    try {
      const url = new URL(window.location.href);
      if (slug) {
        url.searchParams.set('site', slug);
      } else {
        url.searchParams.delete('site');
      }
      window.history.pushState({}, '', url.toString());
    } catch {
      // ignore history errors
    }
  };

  const fetchSaasClients = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/v1/lordes-admin/clients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { clients?: SaasClientRecord[] };
        if (Array.isArray(data.clients)) {
          setSaasClients(data.clients);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchTeamMembers = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/v1/tenant/members', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { members?: AuthUserSummary[] };
        if (Array.isArray(data.members)) {
          setTeamMembers(data.members);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const refreshAuthenticatedTenant = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/v1/tenant', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { user?: AuthUserSummary; dataset?: TenantDataset };
        if (data.dataset) setAuthTenantDataset(data.dataset);
        if (data.user) setAuthUser(data.user);
      }
    } catch {
      // ignore
    }
  }, []);

  const persistAuthenticatedTenant = useCallback(
    async (token: string, nextDataset: TenantDataset) => {
      try {
        const res = await fetch('/api/v1/tenant', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ dataset: nextDataset }),
        });
        if (res.ok) {
          const data = (await res.json()) as { dataset?: TenantDataset };
          if (data.dataset) {
            setAuthTenantDataset(data.dataset);
          }
        }
      } catch {
        // preserva estado em memória se requisição falhar
      }
    },
    [],
  );

  // Sincroniza leads recebidos pelo site conectado ao entrar na aba CRM
  useEffect(() => {
    if (authToken && viewMode === 'painel' && activeTab === 'crm') {
      void refreshAuthenticatedTenant(authToken);
    }
  }, [authToken, viewMode, activeTab, refreshAuthenticatedTenant]);

  const isAuthenticated = Boolean(authToken && authUser && authTenantDataset);
  const activeDataset = authTenantDataset ?? store[segment];
  const effectiveRole = authUser ? authUser.papel : role;
  const actorLabel =
    authUser?.nome ||
    (effectiveRole === 'proprietario'
      ? 'Proprietário'
      : effectiveRole === 'financeiro'
        ? 'Financeiro'
        : 'Contador');

  const updateActiveDataset = (updater: (prev: TenantDataset) => TenantDataset) => {
    if (authToken && authTenantDataset) {
      const next = updater(authTenantDataset);
      setAuthTenantDataset(next);
      void persistAuthenticatedTenant(authToken, next);
      return;
    }
    setStore((prev) => ({
      ...prev,
      [segment]: updater(prev[segment]),
    }));
  };

  const handleOpenDashboard = (targetSeg?: SegmentKey, targetTab?: string) => {
    setUrlSiteParam(null);
    if (targetSeg && !isAuthenticated) setSegment(targetSeg);
    if (targetTab) setActiveTab(targetTab as WorkspaceTab);
    setViewMode('painel');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthenticated = (
    token: string,
    user: AuthUserSummary,
    dataset: TenantDataset,
    isNewSignup: boolean,
    currentFirebaseIdToken?: string,
  ) => {
    setUrlSiteParam(null);
    setAuthToken(token);
    setFirebaseIdToken(currentFirebaseIdToken || null);
    setAuthUser(user);
    setAuthTenantDataset(dataset);
    setSegment(dataset.empresa.segmento);
    setRole(user.papel);
    setAuthModalOpen(false);
    setActiveTab('dashboard');
    setViewMode('painel');
    void fetchTeamMembers(token);
    if (user.isOperator) {
      void fetchSaasClients(token);
    }
    if (isNewSignup) {
      setOnboardingOpen(true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setAuthToken(null);
    setFirebaseIdToken(null);
    setAuthUser(null);
    setAuthTenantDataset(null);
    setTeamMembers([]);
    setSaasClients(createInitialSaasClients());
    setOnboardingOpen(false);
    setRole('proprietario');
    setActiveTab('dashboard');
    setViewMode('site');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitLeadFromSite = (leadInput: Omit<LeadCRM, 'id' | 'empresaId' | 'criadoEm' | 'estagio'>) => {
    const targetSeg: SegmentKey = 'servicos';
    setStore((prev) => {
      const ds = prev[targetSeg];
      const newLead: LeadCRM = {
        ...leadInput,
        id: `lead-${Date.now()}`,
        empresaId: ds.empresa.id,
        estagio: 'Novo Lead',
        criadoEm: getTodayISO(),
      };
      return {
        ...prev,
        [targetSeg]: {
          ...ds,
          leads: [newLead, ...ds.leads],
          auditoria: [
            {
              id: `aud-${Date.now()}`,
              usuario: 'Site LORDES',
              acao: 'criou',
              entidade: 'Lead CRM',
              resumo: `Novo orçamento recebido pelo site: ${newLead.empresaNome} (${formatBRL(newLead.valorEstimadoCents)})`,
              timestamp: nowTimestamp(),
            },
            ...ds.auditoria,
          ],
        },
      };
    });

    void fetch('/api/v1/leads/public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadInput),
    }).catch(() => {
      // fallback silencioso caso ambiente sem API ativa
    });
  };

  const handleDemoSiteLead = (
    targetSeg: SegmentKey,
    leadInput: Omit<LeadCRM, 'id' | 'empresaId' | 'criadoEm' | 'estagio'>,
  ) => {
    setStore((prev) => {
      const ds = prev[targetSeg];
      const newLead: LeadCRM = {
        ...leadInput,
        id: `lead-site-${Date.now()}`,
        empresaId: ds.empresa.id,
        estagio: 'Novo Lead',
        criadoEm: getTodayISO(),
      };
      return {
        ...prev,
        [targetSeg]: {
          ...ds,
          leads: [newLead, ...ds.leads],
          auditoria: [
            {
              id: `aud-${Date.now()}`,
              usuario: 'Site Conectado',
              acao: 'criou',
              entidade: 'Lead CRM',
              resumo: `Lead recebido do site conectado: ${newLead.empresaNome} (${formatBRL(newLead.valorEstimadoCents)})`,
              timestamp: nowTimestamp(),
            },
            ...ds.auditoria,
          ],
        },
      };
    });
  };

  const handleSaveEntries = (entries: Omit<Lancamento, 'id' | 'criadoEm'>[], editId?: string) => {
    const today = getTodayISO();
    updateActiveDataset((prev) => {
      if (editId && entries[0]) {
        const updated = entries[0];
        return {
          ...prev,
          lancamentos: prev.lancamentos.map((l) =>
            l.id === editId ? { ...l, ...updated, id: l.id, criadoEm: l.criadoEm } : l,
          ),
          auditoria: [
            {
              id: `aud-${Date.now()}`,
              usuario: actorLabel,
              acao: 'editou',
              entidade: 'Lançamento',
              resumo: `Editou "${updated.descricao}" (${formatBRL(updated.valorCents)})`,
              timestamp: nowTimestamp(),
            },
            ...prev.auditoria,
          ],
        };
      }

      const created: Lancamento[] = entries.map((e, idx) => ({
        ...e,
        id: `l-${Date.now()}-${idx}`,
        empresaId: prev.empresa.id,
        criadoEm: today,
      }));

      const totalVal = created.reduce((acc, c) => acc + c.valorCents, 0);
      const isImport = created.some((c) => c.criadoPor === 'Importação OFX/CSV');

      return {
        ...prev,
        lancamentos: [...created, ...prev.lancamentos],
        auditoria: [
          {
            id: `aud-${Date.now()}`,
            usuario: actorLabel,
            acao: isImport ? 'importou' : 'criou',
            entidade: 'Lançamento',
            resumo: isImport
              ? `Importou ${created.length} lançamento(s) via extrato OFX/CSV (${formatBRL(totalVal)})`
              : created.length > 1
                ? `Criou parcelamento em ${created.length}x: "${created[0].descricao.replace(/\s*\(1\/\d+\)$/, '')}" (total ${formatBRL(totalVal)})`
                : `Lançou ${created[0].tipo}: "${created[0].descricao}" (${formatBRL(created[0].valorCents)})`,
            timestamp: nowTimestamp(),
          },
          ...prev.auditoria,
        ],
      };
    });
  };

  const handleDeleteEntry = (id: string) => {
    updateActiveDataset((prev) => {
      const target = prev.lancamentos.find((l) => l.id === id);
      return {
        ...prev,
        lancamentos: prev.lancamentos.map((l) =>
          l.id === id ? { ...l, excluidoEm: getTodayISO() } : l,
        ),
        auditoria: [
          {
            id: `aud-${Date.now()}`,
            usuario: actorLabel,
            acao: 'excluiu',
            entidade: 'Lançamento',
            resumo: `Excluiu (soft delete) "${target?.descricao || id}"`,
            timestamp: nowTimestamp(),
          },
          ...prev.auditoria,
        ],
      };
    });
  };

  const handleGenerateRecurrences = (): number => {
    const today = getTodayISO();
    const { generated } = generateDueRecurrences(activeDataset, today);
    if (generated.length === 0) return 0;

    updateActiveDataset((prev) => {
      const latest = generateDueRecurrences(prev, today);
      if (latest.generated.length === 0) return prev;
      return {
        ...prev,
        lancamentos: [...latest.generated, ...latest.updatedOriginals],
        auditoria: [
          {
            id: `aud-${Date.now()}`,
            usuario: 'Motor de Recorrência',
            acao: 'recorrencia',
            entidade: 'Lançamento',
            resumo: `Gerou ${latest.generated.length} lançamento(s) recorrente(s) do mês atual`,
            timestamp: nowTimestamp(),
          },
          ...prev.auditoria,
        ],
      };
    });
    return generated.length;
  };

  const handleConfirmBaixa = (
    id: string,
    contaId: string,
    dataPagamento: string,
    valorPagoCents: number,
    jurosMultaCents: number,
    baixaParcial: boolean,
  ) => {
    updateActiveDataset((prev) => {
      const target = prev.lancamentos.find((l) => l.id === id);
      return {
        ...prev,
        lancamentos: prev.lancamentos.map((l) =>
          l.id === id
            ? {
                ...l,
                contaId,
                dataPagamento,
                valorPagoCents,
                jurosMultaCents,
                status: baixaParcial ? l.status : 'pago',
              }
            : l,
        ),
        auditoria: [
          {
            id: `aud-${Date.now()}`,
            usuario: actorLabel,
            acao: 'baixou',
            entidade: 'Lançamento',
            resumo: `${baixaParcial ? 'Baixa parcial' : 'Baixa total'} em "${target?.descricao || id}" (${formatBRL(valorPagoCents)})`,
            timestamp: nowTimestamp(),
          },
          ...prev.auditoria,
        ],
      };
    });
  };

  const handleAddLead = (leadInput: Omit<LeadCRM, 'id' | 'empresaId' | 'criadoEm' | 'estagio'>) => {
    updateActiveDataset((prev) => {
      const newLead: LeadCRM = {
        ...leadInput,
        id: `lead-${Date.now()}`,
        empresaId: prev.empresa.id,
        estagio: 'Novo Lead',
        criadoEm: getTodayISO(),
      };
      return {
        ...prev,
        leads: [newLead, ...prev.leads],
        auditoria: [
          {
            id: `aud-${Date.now()}`,
            usuario: actorLabel,
            acao: 'criou',
            entidade: 'Lead CRM',
            resumo: `Cadastrou lead "${newLead.empresaNome}" (${formatBRL(newLead.valorEstimadoCents)})`,
            timestamp: nowTimestamp(),
          },
          ...prev.auditoria,
        ],
      };
    });
  };

  const handleUpdateLeadStage = (leadId: string, stage: LeadStage) => {
    updateActiveDataset((prev) => ({
      ...prev,
      leads: prev.leads.map((l) => (l.id === leadId ? { ...l, estagio: stage } : l)),
    }));
  };

  const handleConvertLeadToReceivable = (leadId: string) => {
    const today = getTodayISO();
    updateActiveDataset((prev) => {
      const lead = prev.leads.find((l) => l.id === leadId);
      if (!lead || lead.convertidoLancamentoId) return prev;

      const defaultReceitaCat = prev.categorias.find((c) => c.tipo === 'receita')?.id || '';
      const defaultConta = prev.contas[0]?.id || '';
      const newLancId = `l-lead-${Date.now()}`;
      const newPessoaId = `p-lead-${Date.now()}`;

      const newPessoa = {
        id: newPessoaId,
        empresaId: prev.empresa.id,
        tipo: 'cliente' as const,
        nome: lead.empresaNome,
        documento: '—',
        telefone: lead.telefone,
        email: lead.email,
      };

      const newLanc: Lancamento = {
        id: newLancId,
        empresaId: prev.empresa.id,
        tipo: 'receita',
        valorCents: lead.valorEstimadoCents,
        dataCompetencia: today,
        dataVencimento: addDaysISO(today, 7),
        status: 'previsto',
        categoriaId: defaultReceitaCat,
        contaId: defaultConta,
        pessoaId: newPessoaId,
        formaPagamento: 'Pix',
        descricao: `${lead.empresaNome} — ${lead.servicoSolicitado}`,
        origem: lead.origem,
        leadId: lead.id,
        criadoPor: 'CRM LORDES',
        criadoEm: today,
      };

      return {
        ...prev,
        pessoas: [newPessoa, ...prev.pessoas],
        lancamentos: [newLanc, ...prev.lancamentos],
        leads: prev.leads.map((l) =>
          l.id === leadId
            ? { ...l, estagio: 'Aprovado', convertidoLancamentoId: newLancId }
            : l,
        ),
        auditoria: [
          {
            id: `aud-${Date.now()}`,
            usuario: actorLabel,
            acao: 'converteu_lead',
            entidade: 'Lead CRM',
            resumo: `Aprovou "${lead.empresaNome}" e gerou conta a receber de ${formatBRL(lead.valorEstimadoCents)}`,
            timestamp: nowTimestamp(),
          },
          ...prev.auditoria,
        ],
      };
    });
  };

  const handleUpdateMeta = (faturamentoCents: number, lucroCents: number, limiteDespesaCents: number) => {
    updateActiveDataset((prev) => ({
      ...prev,
      meta: { ...prev.meta, faturamentoCents, lucroCents, limiteDespesaCents },
    }));
  };

  const handleAddConta = (nome: string, tipo: ContaFinanceira['tipo'], saldoInicialCents: number) => {
    updateActiveDataset((prev) => ({
      ...prev,
      contas: [
        ...prev.contas,
        {
          id: `c-${Date.now()}`,
          empresaId: prev.empresa.id,
          nome,
          tipo,
          saldoInicialCents,
          ativa: true,
        },
      ],
    }));
  };

  const handleAddCategoria = (cat: Omit<Categoria, 'id' | 'empresaId'>) => {
    updateActiveDataset((prev) => ({
      ...prev,
      categorias: [
        ...prev.categorias,
        {
          ...cat,
          id: `cat-${Date.now()}`,
          empresaId: prev.empresa.id,
        },
      ],
    }));
  };

  const handleDeleteCategoria = (id: string) => {
    updateActiveDataset((prev) => ({
      ...prev,
      categorias: prev.categorias.filter((c) => c.id !== id && c.categoriaPaiId !== id),
    }));
  };

  const handleAddCentroCusto = (nome: string) => {
    updateActiveDataset((prev) => ({
      ...prev,
      centrosCusto: [
        ...prev.centrosCusto,
        {
          id: `cc-${Date.now()}`,
          empresaId: prev.empresa.id,
          nome,
          ativo: true,
        },
      ],
    }));
  };

  const handleAddProduto = (
    nome: string,
    tipo: 'produto' | 'servico',
    precoVendaCents: number,
    custoUnitarioCents: number,
  ) => {
    updateActiveDataset((prev) => ({
      ...prev,
      produtos: [
        ...prev.produtos,
        {
          id: `prod-${Date.now()}`,
          empresaId: prev.empresa.id,
          nome,
          tipo,
          precoVendaCents,
          custoUnitarioCents,
          ativo: true,
        },
      ],
    }));
  };

  const handleAddPessoa = (
    tipo: 'cliente' | 'fornecedor',
    nome: string,
    telefone: string,
    email: string,
  ) => {
    updateActiveDataset((prev) => ({
      ...prev,
      pessoas: [
        {
          id: `p-${Date.now()}`,
          empresaId: prev.empresa.id,
          tipo,
          nome,
          documento: '—',
          telefone: telefone || '—',
          email: email || '—',
        },
        ...prev.pessoas,
      ],
    }));
  };

  const handleUpdateWhiteLabel = (patch: {
    produtoNome?: string;
    nomeFantasia?: string;
    corPrimaria?: string;
    subdominio?: string;
    siteSlug?: string;
    siteHeadline?: string;
    siteWhatsapp?: string;
    logoDataUrl?: string;
    plano?: 'Essencial' | 'Profissional' | 'Premium';
  }) => {
    updateActiveDataset((prev) => ({
      ...prev,
      empresa: { ...prev.empresa, ...patch },
    }));
  };

  const handleSwitchCompany = async (empresaId: string): Promise<string | null> => {
    if (!authToken) return 'Sessão não autenticada.';
    try {
      const res = await fetch('/api/v1/auth/switch-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ empresaId }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Não foi possível alternar de empresa.';
      setAuthToken(data.token);
      setAuthUser(data.user);
      setAuthTenantDataset(data.dataset);
      setSegment(data.dataset.empresa.segmento);
      setRole(data.user.papel);
      void fetchTeamMembers(data.token);
      return null;
    } catch {
      return 'Falha de conexão com o servidor.';
    }
  };

  const handleCreateCompany = async (empresaNome: string, seg: SegmentKey): Promise<string | null> => {
    if (!authToken) return 'Sessão não autenticada.';
    try {
      const res = await fetch('/api/v1/tenant/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ empresaNome, segmento: seg }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Não foi possível criar a empresa.';
      setAuthToken(data.token);
      setAuthUser(data.user);
      setAuthTenantDataset(data.dataset);
      setSegment(data.dataset.empresa.segmento);
      setRole(data.user.papel);
      void fetchTeamMembers(data.token);
      return null;
    } catch {
      return 'Falha de conexão com o servidor.';
    }
  };

  const handleSetup2FA = async (): Promise<
    { secret: string; otpauthUrl: string; qrDataUrl: string } | { error: string }
  > => {
    if (!authToken) return { error: 'Sessão não autenticada.' };
    try {
      const res = await fetch('/api/v1/auth/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Falha ao gerar QR Code 2FA.' };
      return data;
    } catch {
      return { error: 'Falha de conexão com o servidor.' };
    }
  };

  const handleEnable2FA = async (code: string): Promise<string | null> => {
    if (!authToken) return 'Sessão não autenticada.';
    try {
      const res = await fetch('/api/v1/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Código inválido.';
      if (data.user) setAuthUser(data.user);
      return null;
    } catch {
      return 'Falha de conexão com o servidor.';
    }
  };

  const handleDisable2FA = async (senha: string): Promise<string | null> => {
    if (!authToken) return 'Sessão não autenticada.';
    try {
      const res = await fetch('/api/v1/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ senha }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Não foi possível desativar 2FA.';
      if (data.user) setAuthUser(data.user);
      return null;
    } catch {
      return 'Falha de conexão com o servidor.';
    }
  };

  const handleRequestEmailVerification = async (): Promise<{
    emailSent: boolean;
    message: string;
    error?: string;
  }> => {
    if (!authToken) return { emailSent: false, message: '', error: 'Sessão não autenticada.' };
    try {
      const res = await fetch('/api/v1/auth/request-email-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ firebaseIdToken }),
      });
      const data = await res.json();
      if (!res.ok) return { emailSent: false, message: '', error: data.error || 'Erro ao solicitar código.' };
      if (data.user) setAuthUser(data.user);
      return { emailSent: Boolean(data.emailSent), message: data.message || 'Solicitação enviada.' };
    } catch {
      return { emailSent: false, message: '', error: 'Falha de conexão com o servidor.' };
    }
  };

  const handleVerifyEmail = async (): Promise<string | null> => {
    if (!authToken) return 'Sessão não autenticada.';
    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ firebaseIdToken }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Código inválido.';
      if (data.user) setAuthUser(data.user);
      return null;
    } catch {
      return 'Falha de conexão com o servidor.';
    }
  };

  const handleRotateSiteKey = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/v1/tenant/rotate-site-key', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { siteWebhookKey?: string };
        if (data.siteWebhookKey) {
          setAuthTenantDataset((prev) =>
            prev ? { ...prev, empresa: { ...prev.empresa, siteWebhookKey: data.siteWebhookKey } } : prev,
          );
        }
      }
    } catch {
      // ignore
    }
  };

  const handleAddTeamMember = async (member: {
    nome: string;
    email: string;
    senha: string;
    papel: 'financeiro' | 'leitura';
  }): Promise<string | null> => {
    if (!authToken) return 'Sessão não autenticada.';
    try {
      const res = await fetch('/api/v1/tenant/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(member),
      });
      const data = (await res.json()) as { member?: AuthUserSummary; error?: string };
      if (!res.ok) {
        return data.error || 'Não foi possível criar o usuário.';
      }
      if (data.member) {
        setTeamMembers((prev) => [...prev, data.member!]);
      }
      return null;
    } catch {
      return 'Falha de conexão com o servidor.';
    }
  };

  const handleRemoveTeamMember = async (memberId: string): Promise<void> => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/v1/tenant/members/${encodeURIComponent(memberId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
    } catch {
      // ignore
    }
  };

  const handleCompleteOnboarding = (result: OnboardingWizardResult) => {
    const today = getTodayISO();
    updateActiveDataset((prev) => {
      // Atualiza categorias se o segmento mudou e ainda não havia lançamentos registrados
      const nextCategorias =
        result.segmento !== prev.empresa.segmento && prev.lancamentos.length === 0
          ? createSegmentPreset(result.segmento).categorias.map((c, idx) => ({
              ...c,
              id: `cat-${prev.empresa.id}-${idx + 1}`,
              empresaId: prev.empresa.id,
              categoriaPaiId: undefined,
            }))
          : prev.categorias;

      const updatedContas = [...prev.contas];
      if (updatedContas[0]) {
        updatedContas[0] = {
          ...updatedContas[0],
          nome: result.contaPrincipalNome,
          saldoInicialCents: result.saldoPrincipalCents,
        };
      }
      if (result.contaSecundariaNome) {
        if (updatedContas[1]) {
          updatedContas[1] = {
            ...updatedContas[1],
            nome: result.contaSecundariaNome,
            saldoInicialCents: result.saldoSecundarioCents,
          };
        } else {
          updatedContas.push({
            id: `c-sec-${Date.now()}`,
            empresaId: prev.empresa.id,
            nome: result.contaSecundariaNome,
            tipo: 'caixa',
            saldoInicialCents: result.saldoSecundarioCents,
            ativa: true,
          });
        }
      }

      const defaultReceitaCat =
        nextCategorias.find((c) => c.tipo === 'receita')?.id || nextCategorias[0]?.id || '';
      const defaultDespesaCat =
        nextCategorias.find((c) => c.tipo === 'despesa')?.id || nextCategorias[0]?.id || '';

      const createdEntries: Lancamento[] = result.entradasIniciais.map((item, idx) => ({
        id: `l-onb-${Date.now()}-${idx}`,
        empresaId: prev.empresa.id,
        tipo: item.tipo,
        valorCents: item.valorCents,
        valorPagoCents: item.valorCents,
        dataCompetencia: item.dataISO || today,
        dataVencimento: item.dataISO || today,
        dataPagamento: item.dataISO || today,
        status: 'pago',
        categoriaId: item.tipo === 'receita' ? defaultReceitaCat : defaultDespesaCat,
        contaId: updatedContas[0]?.id || '',
        formaPagamento: 'Pix',
        descricao: item.descricao,
        origem: item.tipo === 'receita' ? 'Site LORDES' : undefined,
        criadoPor: actorLabel,
        criadoEm: today,
      }));

      return {
        ...prev,
        empresa: {
          ...prev.empresa,
          nomeFantasia: result.nomeFantasia,
          documento: result.documento,
          regimeTributario: result.regimeTributario,
          segmento: result.segmento,
          siteSlug: result.siteSlug || prev.empresa.siteSlug,
          siteHeadline: result.siteHeadline || prev.empresa.siteHeadline,
          siteWhatsapp: result.siteWhatsapp,
          onboardingCompleted: true,
        },
        categorias: nextCategorias,
        contas: updatedContas,
        meta: {
          ...prev.meta,
          faturamentoCents: result.metaFaturamentoCents,
          lucroCents: result.metaLucroCents,
          limiteDespesaCents: result.limiteDespesaCents,
        },
        lancamentos: [...createdEntries, ...prev.lancamentos],
        auditoria: [
          {
            id: `aud-${Date.now()}`,
            usuario: actorLabel,
            acao: 'editou',
            entidade: 'OnboardWizard',
            resumo: `Concluiu OnboardWizard para ${result.nomeFantasia} (${createdEntries.length} movimentação(ões) inicial(is))`,
            timestamp: nowTimestamp(),
          },
          ...prev.auditoria,
        ],
      };
    });
    setSegment(result.segmento);
    setOnboardingOpen(false);
  };

  const handleUpdateSaasClientStatus = (id: string, status: SaasClientRecord['status']) => {
    setSaasClients((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    if (authToken && authUser?.isOperator) {
      void fetch(`/api/v1/lordes-admin/clients/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      }).catch(() => {
        // ignore
      });
    }
  };

  const handleResetSegment = () => {
    if (isAuthenticated) {
      const preset = createSegmentPreset(activeDataset.empresa.segmento);
      updateActiveDataset((prev) => ({
        ...preset,
        empresa: { ...prev.empresa },
      }));
      return;
    }
    setStore((prev) => ({
      ...prev,
      [segment]: createSegmentPreset(segment),
    }));
  };

  const handleDeleteAccount = async () => {
    if (authToken) {
      try {
        await fetch('/api/v1/tenant', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // continue logout cleanup
      }
      handleLogout();
      return;
    }

    setStore((prev) => ({
      ...prev,
      [segment]: createSegmentPreset(segment),
    }));
    setViewMode('site');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <OfflineIndicator />
      {connectedSiteSlug ? (
        <ClientSiteView
          siteSlug={connectedSiteSlug}
          demoDatasets={store}
          onBackToLordes={() => {
            setUrlSiteParam(null);
            setViewMode('site');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenPanel={() => {
            setUrlSiteParam(null);
            setViewMode('painel');
            setActiveTab('crm');
            if (authToken) {
              void refreshAuthenticatedTenant(authToken);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onDemoSiteLead={handleDemoSiteLead}
        />
      ) : viewMode === 'site' ? (
        <LandingPage
          authenticatedEmail={authUser?.email ?? null}
          onOpenDashboard={handleOpenDashboard}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenLegal={() => setHelpModalTab('lgpd')}
          onSubmitLeadFromSite={handleSubmitLeadFromSite}
        />
      ) : (
        <SaaSWorkspace
          dataset={activeDataset}
          segment={segment}
          activeTab={activeTab}
          role={effectiveRole}
          authUser={authUser}
          teamMembers={teamMembers}
          saasClients={saasClients}
          onChangeTab={setActiveTab}
          onChangeSegment={setSegment}
          onChangeRole={setRole}
          onBackToSite={() => {
            setViewMode('site');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenConnectedSite={(slug) => {
            setUrlSiteParam(slug);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onRefreshTenant={() => {
            if (authToken) void refreshAuthenticatedTenant(authToken);
          }}
          onRotateSiteKey={() => void handleRotateSiteKey()}
          onAddTeamMember={handleAddTeamMember}
          onRemoveTeamMember={handleRemoveTeamMember}
          onOpenAuth={() => setAuthModalOpen(true)}
          onLogout={handleLogout}
          onOpenOnboarding={() => setOnboardingOpen(true)}
          onOpenHelp={(tab) => setHelpModalTab(tab)}
          onSaveEntries={handleSaveEntries}
          onDeleteEntry={handleDeleteEntry}
          onGenerateRecurrences={handleGenerateRecurrences}
          onConfirmBaixa={handleConfirmBaixa}
          onAddLead={handleAddLead}
          onUpdateLeadStage={handleUpdateLeadStage}
          onConvertLeadToReceivable={handleConvertLeadToReceivable}
          onUpdateMeta={handleUpdateMeta}
          onAddConta={handleAddConta}
          onAddCategoria={handleAddCategoria}
          onDeleteCategoria={handleDeleteCategoria}
          onAddCentroCusto={handleAddCentroCusto}
          onAddProduto={handleAddProduto}
          onAddPessoa={handleAddPessoa}
          onUpdateWhiteLabel={handleUpdateWhiteLabel}
          onSwitchCompany={handleSwitchCompany}
          onCreateCompany={handleCreateCompany}
          onSetup2FA={handleSetup2FA}
          onEnable2FA={handleEnable2FA}
          onDisable2FA={handleDisable2FA}
          onRequestEmailVerification={handleRequestEmailVerification}
          onVerifyEmail={handleVerifyEmail}
          onUpdateSaasClientStatus={handleUpdateSaasClientStatus}
          onResetSegment={handleResetSegment}
          onDeleteAccount={() => void handleDeleteAccount()}
        />
      )}

      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onAuthenticated={handleAuthenticated}
          onOpenLegal={() => setHelpModalTab('lgpd')}
        />
      )}

      {onboardingOpen && (
        <OnboardingModal
          dataset={activeDataset}
          onClose={() => setOnboardingOpen(false)}
          onComplete={handleCompleteOnboarding}
        />
      )}

      {helpModalTab && (
        <HelpAndTermsModal
          initialTab={helpModalTab}
          onClose={() => setHelpModalTab(null)}
        />
      )}
    </>
  );
}
