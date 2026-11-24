import { SaasClientRecord, SegmentKey, TenantDataset } from '../types/finance';
import { addDaysISO, getMonthKey, getTodayISO } from '../utils/formatters';

function buildDateInCurrentMonth(dayOffsetFromStart: number, today: string): string {
  const [y, m] = today.split('-').map(Number);
  const dt = new Date(y, m - 1, Math.min(28, Math.max(1, dayOffsetFromStart)));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function buildDateInPreviousMonth(day: number, today: string): string {
  const [y, m] = today.split('-').map(Number);
  const dt = new Date(y, m - 2, Math.min(28, Math.max(1, day)));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function createInitialSaasClients(): SaasClientRecord[] {
  const today = getTodayISO();
  return [
    {
      id: 'cli-1',
      empresaNome: 'Studio Gesso & Reformas',
      responsavel: 'Rafael Mendes',
      segmento: 'Prestação de Serviços',
      plano: 'Profissional',
      valorMensalCents: 12900,
      status: 'ativa',
      siteContratado: true,
      lancamentosSemana: 14,
      inicioEm: addDaysISO(today, -120),
    },
    {
      id: 'cli-2',
      empresaNome: 'Café & Empório Paulista',
      responsavel: 'Camila Duarte',
      segmento: 'Comércio Local',
      plano: 'Profissional',
      valorMensalCents: 12900,
      status: 'ativa',
      siteContratado: true,
      lancamentosSemana: 21,
      inicioEm: addDaysISO(today, -95),
    },
    {
      id: 'cli-3',
      empresaNome: 'Brava Hamburgueria Artesanal',
      responsavel: 'Bruno Tavares',
      segmento: 'Alimentação & Delivery',
      plano: 'Premium',
      valorMensalCents: 24900,
      status: 'trial_3m',
      siteContratado: true,
      lancamentosSemana: 11,
      inicioEm: addDaysISO(today, -32),
    },
    {
      id: 'cli-4',
      empresaNome: 'Clínica Odonto Sorriso',
      responsavel: 'Dra. Juliana Costa',
      segmento: 'Clínicas',
      plano: 'Premium',
      valorMensalCents: 24900,
      status: 'ativa',
      siteContratado: true,
      lancamentosSemana: 18,
      inicioEm: addDaysISO(today, -150),
    },
    {
      id: 'cli-5',
      empresaNome: 'Oficina Torque Rápido',
      responsavel: 'Henrique Souza',
      segmento: 'Prestação de Serviços',
      plano: 'Essencial',
      valorMensalCents: 6900,
      status: 'inadimplente',
      siteContratado: false,
      lancamentosSemana: 4,
      inicioEm: addDaysISO(today, -64),
    },
  ];
}

function createDigitalPreset(segment: 'sites' | 'saas' | 'software'): TenantDataset {
  const today = getTodayISO();
  const currentMonth = getMonthKey(today);
  const empId = `emp-${segment}`;
  const profiles = {
    sites: {
      nomeFantasia: 'LORDES Sites & Landing Pages',
      corPrimaria: '#7C3AED',
      produtoNome: 'Gestor LORDES Sites',
      headline: 'Sites, landing pages e recorrências organizados em um só painel',
      categorias: [
        { nome: 'Projetos de Site', tipo: 'receita', natureza: 'variavel', grupoDre: 'receita_bruta' },
        { nome: 'Manutenção e Hospedagem', tipo: 'receita', natureza: 'fixa', grupoDre: 'receita_bruta' },
        { nome: 'Domínios e Ferramentas', tipo: 'despesa', natureza: 'fixa', grupoDre: 'despesa_fixa' },
        { nome: 'Freelancers e Produção', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
        { nome: 'Marketing e Aquisição', tipo: 'despesa', natureza: 'variavel', grupoDre: 'marketing' },
      ],
      centros: ['Projetos', 'Recorrências', 'Comercial'],
      produtos: [
        { nome: 'Site Institucional', tipo: 'servico', precoVendaCents: 350000, custoUnitarioCents: 90000 },
        { nome: 'Landing Page de Campanha', tipo: 'servico', precoVendaCents: 120000, custoUnitarioCents: 30000 },
        { nome: 'Manutenção Mensal', tipo: 'servico', precoVendaCents: 4900, custoUnitarioCents: 1200 },
      ],
    },
    saas: {
      nomeFantasia: 'LORDES SaaS',
      corPrimaria: '#0F766E',
      produtoNome: 'Gestor LORDES SaaS',
      headline: 'Assinaturas, churn e custos de infraestrutura sob controle',
      categorias: [
        { nome: 'Assinaturas Mensais', tipo: 'receita', natureza: 'fixa', grupoDre: 'receita_bruta' },
        { nome: 'Setup e Implantação', tipo: 'receita', natureza: 'variavel', grupoDre: 'receita_bruta' },
        { nome: 'Upsell e Add-ons', tipo: 'receita', natureza: 'variavel', grupoDre: 'receita_bruta' },
        { nome: 'Cloud e Infraestrutura', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
        { nome: 'Suporte e Customer Success', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
        { nome: 'Marketing e Vendas', tipo: 'despesa', natureza: 'variavel', grupoDre: 'marketing' },
      ],
      centros: ['Produto', 'Customer Success', 'Vendas'],
      produtos: [
        { nome: 'Plano SaaS Mensal', tipo: 'servico', precoVendaCents: 12900, custoUnitarioCents: 2600 },
        { nome: 'Implantação SaaS', tipo: 'servico', precoVendaCents: 89000, custoUnitarioCents: 25000 },
        { nome: 'Add-on Premium', tipo: 'servico', precoVendaCents: 4900, custoUnitarioCents: 700 },
      ],
    },
    software: {
      nomeFantasia: 'LORDES Software',
      corPrimaria: '#1D4ED8',
      produtoNome: 'Gestor LORDES Software',
      headline: 'Licenças, projetos sob medida e suporte técnico com margem clara',
      categorias: [
        { nome: 'Licenças de Software', tipo: 'receita', natureza: 'fixa', grupoDre: 'receita_bruta' },
        { nome: 'Projetos Customizados', tipo: 'receita', natureza: 'variavel', grupoDre: 'receita_bruta' },
        { nome: 'Suporte e Atualizações', tipo: 'receita', natureza: 'fixa', grupoDre: 'receita_bruta' },
        { nome: 'Desenvolvimento e Terceiros', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
        { nome: 'Cloud e DevOps', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
        { nome: 'Marketing e Comercial', tipo: 'despesa', natureza: 'variavel', grupoDre: 'marketing' },
      ],
      centros: ['Produto', 'Projetos', 'Suporte'],
      produtos: [
        { nome: 'Licença de Software', tipo: 'produto', precoVendaCents: 29900, custoUnitarioCents: 4000 },
        { nome: 'Projeto de Integração', tipo: 'servico', precoVendaCents: 240000, custoUnitarioCents: 85000 },
        { nome: 'Suporte Técnico Mensal', tipo: 'servico', precoVendaCents: 19900, custoUnitarioCents: 3500 },
      ],
    },
  } as const;
  const profile = profiles[segment];

  return {
    empresa: {
      id: empId,
      nomeFantasia: profile.nomeFantasia,
      razaoSocial: `${profile.nomeFantasia} Tecnologia Ltda`,
      documento: 'Não informado',
      segmento: segment,
      regimeTributario: 'Simples Nacional',
      plano: 'Profissional',
      corPrimaria: profile.corPrimaria,
      subdominio: `app.${segment}.lordes.com.br`,
      produtoNome: profile.produtoNome,
      siteSlug: `demo-${segment}`,
      siteWebhookKey: `demo-key-${segment}`,
      siteHeadline: profile.headline,
      siteWhatsapp: '',
      aceiteLgpdEm: today,
    },
    contas: [
      { id: `c-${segment}`, empresaId: empId, nome: 'Conta Principal PJ', tipo: 'banco', saldoInicialCents: 0, ativa: true },
    ],
    categorias: profile.categorias.map((categoria, index) => ({
      ...categoria,
      id: `cat-${segment}-${index + 1}`,
      empresaId: empId,
    })),
    centrosCusto: profile.centros.map((nome, index) => ({
      id: `cc-${segment}-${index + 1}`,
      empresaId: empId,
      nome,
      ativo: true,
    })),
    produtos: profile.produtos.map((produto, index) => ({
      ...produto,
      id: `pr-${segment}-${index + 1}`,
      empresaId: empId,
      ativo: true,
    })),
    pessoas: [],
    lancamentos: [],
    meta: { mesReferencia: currentMonth, faturamentoCents: 0, lucroCents: 0, limiteDespesaCents: 0 },
    leads: [],
    auditoria: [],
  };
}

export function createSegmentPreset(segment: SegmentKey): TenantDataset {
  const today = getTodayISO();
  const currentMonth = getMonthKey(today);

  if (segment === 'sites' || segment === 'saas' || segment === 'software') {
    return createDigitalPreset(segment);
  }

  if (segment === 'servicos') {
    const empId = 'emp-servicos';
    return {
      empresa: {
        id: empId,
        nomeFantasia: 'Studio Gesso & Reformas',
        razaoSocial: 'Studio Gesso e Acabamentos Ltda',
        documento: '42.819.304/0001-12',
        segmento: 'servicos',
        regimeTributario: 'Simples Nacional',
        plano: 'Profissional',
        corPrimaria: '#1E40AF',
        subdominio: 'app.studiogesso.com.br',
        produtoNome: 'Painel Studio Gesso',
        siteSlug: 'demo-servicos',
        siteWebhookKey: 'demo-key-servicos',
        siteHeadline: 'Gesso, Drywall, Acústica e Iluminação sob medida para obras e comércios',
        siteWhatsapp: '(11) 99200-1100',
        aceiteLgpdEm: addDaysISO(today, -120),
      },
      contas: [
        { id: 'c-itau', empresaId: empId, nome: 'Banco Itaú PJ', tipo: 'banco', saldoInicialCents: 1450000, ativa: true },
        { id: 'c-inter', empresaId: empId, nome: 'Conta Inter / Pix', tipo: 'carteira', saldoInicialCents: 420000, ativa: true },
        { id: 'c-caixa', empresaId: empId, nome: 'Caixa Obra (Dinheiro)', tipo: 'caixa', saldoInicialCents: 130000, ativa: true },
      ],
      categorias: [
        { id: 'cat-obra', empresaId: empId, nome: 'Execução de Obra / Gesso', tipo: 'receita', natureza: 'variavel', grupoDre: 'receita_bruta' },
        { id: 'cat-projeto', empresaId: empId, nome: 'Projeto & Consultoria', tipo: 'receita', natureza: 'variavel', grupoDre: 'receita_bruta' },
        { id: 'cat-manut', empresaId: empId, nome: 'Contrato de Manutenção', tipo: 'receita', natureza: 'fixa', grupoDre: 'receita_bruta' },
        { id: 'cat-mat', empresaId: empId, nome: 'Materiais (Placas, Massa, Perfil)', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
        { id: 'cat-mo', empresaId: empId, nome: 'Mão de Obra / Diárias', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
        { id: 'cat-comb', empresaId: empId, nome: 'Combustível & Fretes', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
        { id: 'cat-imp', empresaId: empId, nome: 'Impostos & DAS', tipo: 'despesa', natureza: 'variavel', grupoDre: 'deducao' },
        { id: 'cat-alu', empresaId: empId, nome: 'Aluguel Galpão & Contabilidade', tipo: 'despesa', natureza: 'fixa', grupoDre: 'despesa_fixa' },
        { id: 'cat-mkt', empresaId: empId, nome: 'Google Ads & Site LORDES', tipo: 'despesa', natureza: 'fixa', grupoDre: 'marketing' },
      ],
      centrosCusto: [
        { id: 'cc-comercial', empresaId: empId, nome: 'Obras Comerciais / Clínicas', ativo: true },
        { id: 'cc-residencial', empresaId: empId, nome: 'Reformas Residenciais', ativo: true },
        { id: 'cc-adm', empresaId: empId, nome: 'Estrutura & Galpão', ativo: true },
      ],
      produtos: [
        { id: 'pr-forro', empresaId: empId, nome: 'Forro Drywall Acústico (m² pacote)', tipo: 'servico', precoVendaCents: 1420000, custoUnitarioCents: 710000, ativo: true },
        { id: 'pr-sanca', empresaId: empId, nome: 'Sanca LED & Tabicado Residencial', tipo: 'servico', precoVendaCents: 890000, custoUnitarioCents: 420000, ativo: true },
        { id: 'pr-manut', empresaId: empId, nome: 'Contrato Manutenção Predial', tipo: 'servico', precoVendaCents: 360000, custoUnitarioCents: 110000, ativo: true },
      ],
      pessoas: [
        { id: 'p-1', empresaId: empId, tipo: 'cliente', nome: 'Clínica Odonto Sorriso', documento: '18.221.440/0001-08', telefone: '(11) 99412-8811', email: 'financeiro@odontosorriso.com.br' },
        { id: 'p-2', empresaId: empId, tipo: 'cliente', nome: 'Construtora Horizonte', documento: '33.102.990/0001-55', telefone: '(11) 98210-4402', email: 'obras@horizonteeng.com.br' },
        { id: 'p-3', empresaId: empId, tipo: 'cliente', nome: 'Residencial Vila Nova (Marcos)', documento: '312.445.889-10', telefone: '(11) 97701-1290', email: 'marcos.vilanova@gmail.com' },
        { id: 'p-4', empresaId: empId, tipo: 'fornecedor', nome: 'Casa do Drywall Atacado', documento: '09.442.118/0001-20', telefone: '(11) 3341-9000', email: 'vendas@casadrywall.com.br' },
        { id: 'p-5', empresaId: empId, tipo: 'fornecedor', nome: 'Equipe Gesso Silva', documento: '45.112.880/0001-91', telefone: '(11) 96654-3321', email: 'silva.instalacoes@gmail.com' },
      ],
      lancamentos: [
        {
          id: 'l-prev-1', empresaId: empId, tipo: 'receita', valorCents: 1850000, valorPagoCents: 1850000,
          dataCompetencia: buildDateInPreviousMonth(5, today), dataVencimento: buildDateInPreviousMonth(8, today),
          dataPagamento: buildDateInPreviousMonth(9, today), status: 'pago', categoriaId: 'cat-obra',
          centroCustoId: 'cc-comercial', produtoId: 'pr-forro',
          contaId: 'c-itau', pessoaId: 'p-2', formaPagamento: 'Transferência', descricao: 'Forro acústico Galpão B',
          origem: 'Indicação', criadoPor: 'Rafael Mendes', criadoEm: buildDateInPreviousMonth(5, today),
        },
        {
          id: 'l-prev-2', empresaId: empId, tipo: 'receita', valorCents: 980000, valorPagoCents: 980000,
          dataCompetencia: buildDateInPreviousMonth(14, today), dataVencimento: buildDateInPreviousMonth(18, today),
          dataPagamento: buildDateInPreviousMonth(18, today), status: 'pago', categoriaId: 'cat-obra',
          centroCustoId: 'cc-comercial', produtoId: 'pr-forro',
          contaId: 'c-inter', pessoaId: 'p-1', formaPagamento: 'Pix', descricao: 'Divisórias drywall 4 salas',
          origem: 'Site LORDES', criadoPor: 'Rafael Mendes', criadoEm: buildDateInPreviousMonth(14, today),
        },
        {
          id: 'l-prev-3', empresaId: empId, tipo: 'despesa', valorCents: 740000, valorPagoCents: 740000,
          dataCompetencia: buildDateInPreviousMonth(7, today), dataVencimento: buildDateInPreviousMonth(12, today),
          dataPagamento: buildDateInPreviousMonth(12, today), status: 'pago', categoriaId: 'cat-mat',
          centroCustoId: 'cc-comercial',
          contaId: 'c-itau', pessoaId: 'p-4', formaPagamento: 'Boleto', descricao: 'Compra placas ST e perfis',
          criadoPor: 'Rafael Mendes', criadoEm: buildDateInPreviousMonth(7, today),
        },
        {
          id: 'l-prev-4', empresaId: empId, tipo: 'despesa', valorCents: 680000, valorPagoCents: 680000,
          dataCompetencia: buildDateInPreviousMonth(15, today), dataVencimento: buildDateInPreviousMonth(20, today),
          dataPagamento: buildDateInPreviousMonth(20, today), status: 'pago', categoriaId: 'cat-mo',
          centroCustoId: 'cc-comercial',
          contaId: 'c-inter', pessoaId: 'p-5', formaPagamento: 'Pix', descricao: 'Empreita instaladores mês anterior',
          criadoPor: 'Rafael Mendes', criadoEm: buildDateInPreviousMonth(15, today),
        },
        {
          id: 'l-prev-5', empresaId: empId, tipo: 'despesa', valorCents: 380000, valorPagoCents: 380000,
          dataCompetencia: buildDateInPreviousMonth(10, today), dataVencimento: buildDateInPreviousMonth(10, today),
          dataPagamento: buildDateInPreviousMonth(10, today), status: 'pago', categoriaId: 'cat-alu',
          centroCustoId: 'cc-adm',
          contaId: 'c-itau', formaPagamento: 'Transferência', descricao: 'Aluguel galpão + honorários',
          recorrente: true, frequencia: 'mensal', criadoPor: 'Rafael Mendes', criadoEm: buildDateInPreviousMonth(10, today),
        },
        {
          id: 'l-cur-1', empresaId: empId, tipo: 'receita', valorCents: 1420000, valorPagoCents: 1420000,
          dataCompetencia: addDaysISO(today, -12), dataVencimento: addDaysISO(today, -10),
          dataPagamento: addDaysISO(today, -9), status: 'pago', categoriaId: 'cat-obra',
          centroCustoId: 'cc-comercial', produtoId: 'pr-forro',
          contaId: 'c-itau', pessoaId: 'p-1', formaPagamento: 'Pix', descricao: 'Reforma recepção e sanca LED',
          origem: 'Site LORDES', criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -12),
        },
        {
          id: 'l-cur-2', empresaId: empId, tipo: 'receita', valorCents: 890000, valorPagoCents: 890000,
          dataCompetencia: addDaysISO(today, -8), dataVencimento: addDaysISO(today, -6),
          dataPagamento: addDaysISO(today, -5), status: 'pago', categoriaId: 'cat-obra',
          centroCustoId: 'cc-residencial', produtoId: 'pr-sanca',
          contaId: 'c-inter', pessoaId: 'p-3', formaPagamento: 'Cartão de Crédito', descricao: 'Forro tabicado Apartamento 82',
          origem: 'Google', criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -8),
        },
        {
          id: 'l-cur-3', empresaId: empId, tipo: 'receita', valorCents: 360000, valorPagoCents: 360000,
          dataCompetencia: addDaysISO(today, -3), dataVencimento: addDaysISO(today, -2),
          dataPagamento: addDaysISO(today, -2), status: 'pago', categoriaId: 'cat-manut',
          centroCustoId: 'cc-comercial', produtoId: 'pr-manut',
          contaId: 'c-itau', pessoaId: 'p-2', formaPagamento: 'Pix', descricao: 'Contrato mensal manutenção predial',
          origem: 'Indicação', recorrente: true, frequencia: 'mensal', criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -3),
        },
        {
          id: 'l-cur-4', empresaId: empId, tipo: 'receita', valorCents: 540000, valorPagoCents: 540000,
          dataCompetencia: today, dataVencimento: today, dataPagamento: today, status: 'pago',
          categoriaId: 'cat-projeto', centroCustoId: 'cc-residencial', produtoId: 'pr-sanca',
          contaId: 'c-inter', pessoaId: 'p-3', formaPagamento: 'Pix',
          descricao: 'Sinal pintura epóxi garagem', origem: 'Site LORDES', criadoPor: 'Rafael Mendes', criadoEm: today,
        },
        {
          id: 'l-cur-5', empresaId: empId, tipo: 'despesa', valorCents: 645000, valorPagoCents: 645000,
          dataCompetencia: addDaysISO(today, -11), dataVencimento: addDaysISO(today, -9),
          dataPagamento: addDaysISO(today, -9), status: 'pago', categoriaId: 'cat-mat',
          centroCustoId: 'cc-comercial',
          contaId: 'c-itau', pessoaId: 'p-4', formaPagamento: 'Boleto', descricao: 'Lote chapas RU e massa corrida',
          criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -11),
        },
        {
          id: 'l-cur-6', empresaId: empId, tipo: 'despesa', valorCents: 590000, valorPagoCents: 590000,
          dataCompetencia: addDaysISO(today, -7), dataVencimento: addDaysISO(today, -5),
          dataPagamento: addDaysISO(today, -5), status: 'pago', categoriaId: 'cat-mo',
          centroCustoId: 'cc-comercial',
          contaId: 'c-inter', pessoaId: 'p-5', formaPagamento: 'Pix', descricao: 'Pagamento equipe obra Odonto',
          criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -7),
        },
        {
          id: 'l-cur-7', empresaId: empId, tipo: 'despesa', valorCents: 380000, valorPagoCents: 380000,
          dataCompetencia: buildDateInCurrentMonth(5, today), dataVencimento: buildDateInCurrentMonth(5, today),
          dataPagamento: buildDateInCurrentMonth(5, today), status: 'pago', categoriaId: 'cat-alu',
          centroCustoId: 'cc-adm',
          contaId: 'c-itau', formaPagamento: 'Transferência', descricao: 'Aluguel galpão + contador',
          recorrente: true, frequencia: 'mensal', criadoPor: 'Rafael Mendes', criadoEm: buildDateInCurrentMonth(5, today),
        },
        {
          id: 'l-cur-8', empresaId: empId, tipo: 'despesa', valorCents: 165000, valorPagoCents: 165000,
          dataCompetencia: addDaysISO(today, -4), dataVencimento: addDaysISO(today, -4),
          dataPagamento: addDaysISO(today, -4), status: 'pago', categoriaId: 'cat-comb',
          centroCustoId: 'cc-residencial',
          contaId: 'c-caixa', formaPagamento: 'Dinheiro', descricao: 'Diesel Fiorino e carretos',
          criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -4),
        },
        {
          id: 'l-cur-9', empresaId: empId, tipo: 'despesa', valorCents: 195000, valorPagoCents: 195000,
          dataCompetencia: addDaysISO(today, -6), dataVencimento: addDaysISO(today, -6),
          dataPagamento: addDaysISO(today, -6), status: 'pago', categoriaId: 'cat-mkt',
          centroCustoId: 'cc-adm',
          contaId: 'c-inter', formaPagamento: 'Cartão de Crédito', descricao: 'Anúncios Google + Plano LORDES',
          recorrente: true, frequencia: 'mensal', criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -6),
        },
        {
          id: 'l-cur-10', empresaId: empId, tipo: 'despesa', valorCents: 210000, valorPagoCents: 210000,
          dataCompetencia: addDaysISO(today, -2), dataVencimento: addDaysISO(today, -2),
          dataPagamento: addDaysISO(today, -2), status: 'pago', categoriaId: 'cat-imp',
          centroCustoId: 'cc-adm',
          contaId: 'c-itau', formaPagamento: 'Pix', descricao: 'Guia DAS Simples Nacional',
          recorrente: true, frequencia: 'mensal', criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -2),
        },
        {
          id: 'l-rec-1', empresaId: empId, tipo: 'receita', valorCents: 1180000,
          dataCompetencia: addDaysISO(today, -5), dataVencimento: addDaysISO(today, 4),
          status: 'previsto', categoriaId: 'cat-obra', centroCustoId: 'cc-comercial', produtoId: 'pr-forro',
          contaId: 'c-itau', pessoaId: 'p-2',
          formaPagamento: 'Boleto', descricao: 'Medição 2/2 Loja Shopping Sul', origem: 'Site LORDES',
          parcelaNumero: 2, parcelaTotal: 2, criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -5),
        },
        {
          id: 'l-rec-2', empresaId: empId, tipo: 'receita', valorCents: 490000,
          dataCompetencia: addDaysISO(today, -1), dataVencimento: addDaysISO(today, 12),
          status: 'previsto', categoriaId: 'cat-obra', centroCustoId: 'cc-residencial', produtoId: 'pr-sanca',
          contaId: 'c-inter', pessoaId: 'p-3',
          formaPagamento: 'Pix', descricao: 'Conclusão pintura sala e quartos', origem: 'Instagram',
          criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -1),
        },
        {
          id: 'l-rec-3', empresaId: empId, tipo: 'receita', valorCents: 185000,
          dataCompetencia: addDaysISO(today, -22), dataVencimento: addDaysISO(today, -17),
          status: 'atrasado', categoriaId: 'cat-projeto', centroCustoId: 'cc-residencial',
          contaId: 'c-inter', pessoaId: 'p-3',
          formaPagamento: 'Boleto', descricao: 'Reparo infiltração teto', origem: 'Indicação',
          criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -22),
        },
        {
          id: 'l-pag-1', empresaId: empId, tipo: 'despesa', valorCents: 460000,
          dataCompetencia: today, dataVencimento: addDaysISO(today, 2),
          status: 'previsto', categoriaId: 'cat-mat', centroCustoId: 'cc-comercial',
          contaId: 'c-itau', pessoaId: 'p-4',
          formaPagamento: 'Boleto', descricao: 'Boleto Casa do Drywall (Obra Shopping)',
          criadoPor: 'Rafael Mendes', criadoEm: today,
        },
        {
          id: 'l-pag-2', empresaId: empId, tipo: 'despesa', valorCents: 390000,
          dataCompetencia: today, dataVencimento: addDaysISO(today, 9),
          status: 'previsto', categoriaId: 'cat-mo', centroCustoId: 'cc-comercial',
          contaId: 'c-inter', pessoaId: 'p-5',
          formaPagamento: 'Pix', descricao: 'Quinzena equipe instaladores',
          criadoPor: 'Rafael Mendes', criadoEm: today,
        },
        {
          id: 'l-transf-1', empresaId: empId, tipo: 'transferencia', valorCents: 200000, valorPagoCents: 200000,
          dataCompetencia: addDaysISO(today, -3), dataVencimento: addDaysISO(today, -3),
          dataPagamento: addDaysISO(today, -3), status: 'pago', categoriaId: 'cat-obra',
          contaId: 'c-itau', contaDestinoId: 'c-inter', formaPagamento: 'Pix',
          descricao: 'Reforço de saldo para pagamentos Pix', criadoPor: 'Rafael Mendes', criadoEm: addDaysISO(today, -3),
        },
      ],
      meta: {
        mesReferencia: currentMonth,
        faturamentoCents: 4500000,
        lucroCents: 1200000,
        limiteDespesaCents: 2800000,
      },
      leads: [
        {
          id: 'lead-1', empresaId: empId, nome: 'Carla Nogueira', empresaNome: 'Clínica Estética Lumière',
          telefone: '(11) 99123-4501', email: 'carla@lumiereestetica.com.br', segmento: 'Estética / Saúde',
          planoInteresse: 'Profissional', origem: 'Site LORDES', valorEstimadoCents: 1680000,
          servicoSolicitado: 'Forro acústico + iluminação em 6 salas comerciais', estagio: 'Orçamento Enviado',
          criadoEm: addDaysISO(today, -2),
        },
        {
          id: 'lead-2', empresaId: empId, nome: 'Eduardo Lima', empresaNome: 'Escritório Lima & Associados',
          telefone: '(11) 98444-9012', email: 'eduardo@limaadv.com.br', segmento: 'Escritório',
          planoInteresse: 'Essencial', origem: 'Google', valorEstimadoCents: 940000,
          servicoSolicitado: 'Divisória drywall com vidro duplo', estagio: 'Novo Lead',
          criadoEm: today,
        },
        {
          id: 'lead-3', empresaId: empId, nome: 'Juliana Costa', empresaNome: 'Odonto Sorriso Unidade 2',
          telefone: '(11) 99412-8811', email: 'juliana@odontosorriso.com.br', segmento: 'Clínica',
          planoInteresse: 'Premium', origem: 'Site LORDES', valorEstimadoCents: 1420000,
          servicoSolicitado: 'Reforma recepção e sanca LED', estagio: 'Aprovado',
          criadoEm: addDaysISO(today, -12), convertidoLancamentoId: 'l-cur-1',
        },
      ],
      auditoria: [
        { id: 'aud-1', usuario: 'Rafael Mendes', acao: 'converteu_lead', entidade: 'Lead CRM', resumo: 'Aprovou orçamento Odonto Sorriso (R$ 14.200,00) e gerou receita', timestamp: `${addDaysISO(today, -12)} 14:22` },
        { id: 'aud-2', usuario: 'Rafael Mendes', acao: 'baixou', entidade: 'Lançamento', resumo: 'Confirmou recebimento Pix R$ 3.600,00 — Contrato manutenção', timestamp: `${addDaysISO(today, -2)} 09:40` },
      ],
    };
  }

  if (segment === 'comercio') {
    const empId = 'emp-comercio';
    return {
      empresa: {
        id: empId,
        nomeFantasia: 'Café & Empório Paulista',
        razaoSocial: 'Empório Paulista Comércio de Alimentos Ltda',
        documento: '19.550.210/0001-44',
        segmento: 'comercio',
        regimeTributario: 'Simples Nacional',
        plano: 'Profissional',
        corPrimaria: '#0F766E',
        subdominio: 'app.emporiopaulista.com.br',
        produtoNome: 'Gestor Empório Paulista',
        siteSlug: 'demo-comercio',
        siteWebhookKey: 'demo-key-comercio',
        siteHeadline: 'Kits corporativos, cafés especiais e cestas artesanais entregues na sua empresa',
        siteWhatsapp: '(11) 99450-2200',
        aceiteLgpdEm: addDaysISO(today, -95),
      },
      contas: [
        { id: 'c-stone', empresaId: empId, nome: 'Conta Stone PJ', tipo: 'banco', saldoInicialCents: 2100000, ativa: true },
        { id: 'c-caixa-loja', empresaId: empId, nome: 'Caixa Balcão', tipo: 'caixa', saldoInicialCents: 280000, ativa: true },
      ],
      categorias: [
        { id: 'cat-balcao', empresaId: empId, nome: 'Vendas Balcão & Cafeteria', tipo: 'receita', natureza: 'variavel', grupoDre: 'receita_bruta' },
        { id: 'cat-kits', empresaId: empId, nome: 'Kits Corporativos (Site)', tipo: 'receita', natureza: 'variavel', grupoDre: 'receita_bruta' },
        { id: 'cat-merc', empresaId: empId, nome: 'Mercadorias & Grãos', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
        { id: 'cat-emb', empresaId: empId, nome: 'Embalagens & Copos', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
        { id: 'cat-maq', empresaId: empId, nome: 'Taxas de Maquininha', tipo: 'despesa', natureza: 'variavel', grupoDre: 'deducao' },
        { id: 'cat-fix', empresaId: empId, nome: 'Aluguel Ponto + Equipe', tipo: 'despesa', natureza: 'fixa', grupoDre: 'despesa_fixa' },
        { id: 'cat-mkt-c', empresaId: empId, nome: 'Instagram Ads & Site', tipo: 'despesa', natureza: 'fixa', grupoDre: 'marketing' },
      ],
      centrosCusto: [
        { id: 'cc-loja', empresaId: empId, nome: 'Loja Física Paulista', ativo: true },
        { id: 'cc-b2b', empresaId: empId, nome: 'Eventos & Kits B2B', ativo: true },
      ],
      produtos: [
        { id: 'pc-espresso', empresaId: empId, nome: 'Bebidas & Cafeteria Balcão', tipo: 'produto', precoVendaCents: 3800, custoUnitarioCents: 1100, ativo: true },
        { id: 'pc-kit', empresaId: empId, nome: 'Kit Café Especial Corporativo', tipo: 'produto', precoVendaCents: 14000, custoUnitarioCents: 6800, ativo: true },
      ],
      pessoas: [
        { id: 'pc-1', empresaId: empId, tipo: 'cliente', nome: 'Agência Vértice (Kits)', documento: '27.881.112/0001-33', telefone: '(11) 99201-7710', email: 'rh@vertice.com.br' },
        { id: 'pc-2', empresaId: empId, tipo: 'cliente', nome: 'Consumidor Balcão', documento: '—', telefone: '—', email: '—' },
        { id: 'pc-3', empresaId: empId, tipo: 'fornecedor', nome: 'Torrefação Alta Mogiana', documento: '12.339.440/0001-09', telefone: '(16) 3722-1100', email: 'pedidos@altamogiana.com.br' },
      ],
      lancamentos: [
        {
          id: 'lc-prev-1', empresaId: empId, tipo: 'receita', valorCents: 3820000, valorPagoCents: 3820000,
          dataCompetencia: buildDateInPreviousMonth(15, today), dataVencimento: buildDateInPreviousMonth(15, today),
          dataPagamento: buildDateInPreviousMonth(15, today), status: 'pago', categoriaId: 'cat-balcao',
          centroCustoId: 'cc-loja', produtoId: 'pc-espresso',
          contaId: 'c-stone', pessoaId: 'pc-2', formaPagamento: 'Cartão de Crédito', descricao: 'Fechamento balcão mês anterior',
          origem: 'Balcão / Direto', criadoPor: 'Camila Duarte', criadoEm: buildDateInPreviousMonth(15, today),
        },
        {
          id: 'lc-prev-2', empresaId: empId, tipo: 'despesa', valorCents: 2640000, valorPagoCents: 2640000,
          dataCompetencia: buildDateInPreviousMonth(12, today), dataVencimento: buildDateInPreviousMonth(12, today),
          dataPagamento: buildDateInPreviousMonth(12, today), status: 'pago', categoriaId: 'cat-merc',
          centroCustoId: 'cc-loja',
          contaId: 'c-stone', pessoaId: 'pc-3', formaPagamento: 'Boleto', descricao: 'Reposição mês anterior',
          criadoPor: 'Camila Duarte', criadoEm: buildDateInPreviousMonth(12, today),
        },
        {
          id: 'lc-1', empresaId: empId, tipo: 'receita', valorCents: 2450000, valorPagoCents: 2450000,
          dataCompetencia: addDaysISO(today, -10), dataVencimento: addDaysISO(today, -10),
          dataPagamento: addDaysISO(today, -10), status: 'pago', categoriaId: 'cat-balcao',
          centroCustoId: 'cc-loja', produtoId: 'pc-espresso',
          contaId: 'c-stone', pessoaId: 'pc-2', formaPagamento: 'Cartão de Débito', descricao: 'Vendas cafeteria primeira quinzena',
          origem: 'Balcão / Direto', criadoPor: 'Camila Duarte', criadoEm: addDaysISO(today, -10),
        },
        {
          id: 'lc-2', empresaId: empId, tipo: 'receita', valorCents: 1120000, valorPagoCents: 1120000,
          dataCompetencia: addDaysISO(today, -4), dataVencimento: addDaysISO(today, -3),
          dataPagamento: addDaysISO(today, -3), status: 'pago', categoriaId: 'cat-kits',
          centroCustoId: 'cc-b2b', produtoId: 'pc-kit',
          contaId: 'c-stone', pessoaId: 'pc-1', formaPagamento: 'Pix', descricao: '80 kits café especial para evento',
          origem: 'Site LORDES', criadoPor: 'Camila Duarte', criadoEm: addDaysISO(today, -4),
        },
        {
          id: 'lc-3', empresaId: empId, tipo: 'receita', valorCents: 385000, valorPagoCents: 385000,
          dataCompetencia: today, dataVencimento: today, dataPagamento: today, status: 'pago',
          categoriaId: 'cat-balcao', centroCustoId: 'cc-loja', produtoId: 'pc-espresso',
          contaId: 'c-caixa-loja', pessoaId: 'pc-2', formaPagamento: 'Pix',
          descricao: 'Movimento balcão hoje', origem: 'Instagram', criadoPor: 'Camila Duarte', criadoEm: today,
        },
        {
          id: 'lc-4', empresaId: empId, tipo: 'despesa', valorCents: 1290000, valorPagoCents: 1290000,
          dataCompetencia: addDaysISO(today, -9), dataVencimento: addDaysISO(today, -8),
          dataPagamento: addDaysISO(today, -8), status: 'pago', categoriaId: 'cat-merc',
          centroCustoId: 'cc-loja',
          contaId: 'c-stone', pessoaId: 'pc-3', formaPagamento: 'Boleto', descricao: 'Compra grãos especiais e empório',
          criadoPor: 'Camila Duarte', criadoEm: addDaysISO(today, -9),
        },
        {
          id: 'lc-5', empresaId: empId, tipo: 'despesa', valorCents: 820000, valorPagoCents: 820000,
          dataCompetencia: buildDateInCurrentMonth(5, today), dataVencimento: buildDateInCurrentMonth(5, today),
          dataPagamento: buildDateInCurrentMonth(5, today), status: 'pago', categoriaId: 'cat-fix',
          centroCustoId: 'cc-loja',
          contaId: 'c-stone', formaPagamento: 'Transferência', descricao: 'Aluguel loja + 3 baristas',
          recorrente: true, frequencia: 'mensal', criadoPor: 'Camila Duarte', criadoEm: buildDateInCurrentMonth(5, today),
        },
        {
          id: 'lc-6', empresaId: empId, tipo: 'despesa', valorCents: 145000, valorPagoCents: 145000,
          dataCompetencia: addDaysISO(today, -3), dataVencimento: addDaysISO(today, -3),
          dataPagamento: addDaysISO(today, -3), status: 'pago', categoriaId: 'cat-emb',
          centroCustoId: 'cc-loja',
          contaId: 'c-caixa-loja', formaPagamento: 'Pix', descricao: 'Copos térmicos e sacolas kraft',
          criadoPor: 'Camila Duarte', criadoEm: addDaysISO(today, -3),
        },
        {
          id: 'lc-7', empresaId: empId, tipo: 'despesa', valorCents: 138000, valorPagoCents: 138000,
          dataCompetencia: addDaysISO(today, -2), dataVencimento: addDaysISO(today, -2),
          dataPagamento: addDaysISO(today, -2), status: 'pago', categoriaId: 'cat-maq',
          centroCustoId: 'cc-loja',
          contaId: 'c-stone', formaPagamento: 'Transferência', descricao: 'Taxas cartão mês',
          criadoPor: 'Camila Duarte', criadoEm: addDaysISO(today, -2),
        },
        {
          id: 'lc-8', empresaId: empId, tipo: 'despesa', valorCents: 160000, valorPagoCents: 160000,
          dataCompetencia: addDaysISO(today, -5), dataVencimento: addDaysISO(today, -5),
          dataPagamento: addDaysISO(today, -5), status: 'pago', categoriaId: 'cat-mkt-c',
          centroCustoId: 'cc-b2b',
          contaId: 'c-stone', formaPagamento: 'Cartão de Crédito', descricao: 'Campanha kits corporativos',
          criadoPor: 'Camila Duarte', criadoEm: addDaysISO(today, -5),
        },
        {
          id: 'lc-9', empresaId: empId, tipo: 'receita', valorCents: 840000,
          dataCompetencia: addDaysISO(today, -1), dataVencimento: addDaysISO(today, 6),
          status: 'previsto', categoriaId: 'cat-kits', centroCustoId: 'cc-b2b', produtoId: 'pc-kit',
          contaId: 'c-stone', pessoaId: 'pc-1',
          formaPagamento: 'Boleto', descricao: 'Pedido 60 cestas fim de ano', origem: 'Site LORDES',
          criadoPor: 'Camila Duarte', criadoEm: addDaysISO(today, -1),
        },
        {
          id: 'lc-10', empresaId: empId, tipo: 'despesa', valorCents: 410000,
          dataCompetencia: today, dataVencimento: addDaysISO(today, 7),
          status: 'previsto', categoriaId: 'cat-merc', centroCustoId: 'cc-loja',
          contaId: 'c-stone', pessoaId: 'pc-3',
          formaPagamento: 'Boleto', descricao: 'Torra semanal + leites vegetais',
          criadoPor: 'Camila Duarte', criadoEm: today,
        },
      ],
      meta: {
        mesReferencia: currentMonth,
        faturamentoCents: 5000000,
        lucroCents: 1300000,
        limiteDespesaCents: 3500000,
      },
      leads: [
        {
          id: 'lead-c1', empresaId: empId, nome: 'Fernanda Alves', empresaNome: 'TechBrasil S.A.',
          telefone: '(11) 99877-2201', email: 'fernanda@techbrasil.io', segmento: 'Corporativo',
          planoInteresse: 'Premium', origem: 'Site LORDES', valorEstimadoCents: 960000,
          servicoSolicitado: 'Coffee break + 50 kits personalizados', estagio: 'Novo Lead',
          criadoEm: today,
        },
      ],
      auditoria: [
        { id: 'aud-c1', usuario: 'Camila Duarte', acao: 'criou', entidade: 'Lançamento', resumo: 'Registrou fechamento de vendas balcão hoje R$ 3.850,00', timestamp: `${today} 11:15` },
      ],
    };
  }

  const empId = 'emp-alim';
  return {
    empresa: {
      id: empId,
      nomeFantasia: 'Brava Hamburgueria Artesanal',
      razaoSocial: 'Brava Burgers & Delivery Ltda',
      documento: '38.712.900/0001-77',
      segmento: 'alimentacao',
      regimeTributario: 'Simples Nacional',
      plano: 'Profissional',
      corPrimaria: '#B45309',
      subdominio: 'app.bravaburger.com.br',
      produtoNome: 'Gestor Brava Burger',
      siteSlug: 'demo-alimentacao',
      siteWebhookKey: 'demo-key-alimentacao',
      siteHeadline: 'Smash burgers artesanais, combos e eventos corporativos direto do nosso site',
      siteWhatsapp: '(11) 99710-3300',
      aceiteLgpdEm: addDaysISO(today, -32),
    },
    contas: [
      { id: 'c-nubank', empresaId: empId, nome: 'Nubank PJ', tipo: 'banco', saldoInicialCents: 490000, ativa: true },
      { id: 'c-ifood', empresaId: empId, nome: 'Carteira iFood', tipo: 'carteira', saldoInicialCents: 310000, ativa: true },
    ],
    categorias: [
      { id: 'cat-salao', empresaId: empId, nome: 'Salão & Retirada', tipo: 'receita', natureza: 'variavel', grupoDre: 'receita_bruta' },
      { id: 'cat-deliv', empresaId: empId, nome: 'Delivery Próprio (Site)', tipo: 'receita', natureza: 'variavel', grupoDre: 'receita_bruta' },
      { id: 'cat-app', empresaId: empId, nome: 'Delivery Aplicativos', tipo: 'receita', natureza: 'variavel', grupoDre: 'receita_bruta' },
      { id: 'cat-ins', empresaId: empId, nome: 'Insumos (Carne, Pão, Queijo)', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
      { id: 'cat-taxa-app', empresaId: empId, nome: 'Comissão Aplicativos Delivery', tipo: 'despesa', natureza: 'variavel', grupoDre: 'deducao' },
      { id: 'cat-motoboy', empresaId: empId, nome: 'Entregas & Motoboys', tipo: 'despesa', natureza: 'variavel', grupoDre: 'custo_variavel' },
      { id: 'cat-fix-a', empresaId: empId, nome: 'Aluguel, Energia, Gás & Equipe', tipo: 'despesa', natureza: 'fixa', grupoDre: 'despesa_fixa' },
      { id: 'cat-mkt-a', empresaId: empId, nome: 'Tráfego Local & Site', tipo: 'despesa', natureza: 'fixa', grupoDre: 'marketing' },
    ],
    centrosCusto: [
      { id: 'cc-salao', empresaId: empId, nome: 'Salão & Cardápio Próprio', ativo: true },
      { id: 'cc-apps', empresaId: empId, nome: 'Aplicativos Terceiros', ativo: true },
    ],
    produtos: [
      { id: 'pa-smash', empresaId: empId, nome: 'Combo Smash Direto (Site)', tipo: 'produto', precoVendaCents: 4600, custoUnitarioCents: 1650, ativo: true },
      { id: 'pa-app', empresaId: empId, nome: 'Combo via Aplicativo', tipo: 'produto', precoVendaCents: 5200, custoUnitarioCents: 3150, ativo: true },
    ],
    pessoas: [
      { id: 'pa-1', empresaId: empId, tipo: 'fornecedor', nome: 'Frigorífico Serra Negra', documento: '21.900.331/0001-12', telefone: '(11) 4421-9000', email: 'vendas@frigoserranegra.com.br' },
      { id: 'pa-2', empresaId: empId, tipo: 'cliente', nome: 'Pedidos Online & Salão', documento: '—', telefone: '—', email: '—' },
    ],
    lancamentos: [
      {
        id: 'la-prev-1', empresaId: empId, tipo: 'receita', valorCents: 3100000, valorPagoCents: 3100000,
        dataCompetencia: buildDateInPreviousMonth(15, today), dataVencimento: buildDateInPreviousMonth(15, today),
        dataPagamento: buildDateInPreviousMonth(15, today), status: 'pago', categoriaId: 'cat-app',
        centroCustoId: 'cc-apps', produtoId: 'pa-app',
        contaId: 'c-ifood', pessoaId: 'pa-2', formaPagamento: 'Cartão de Crédito', descricao: 'Vendas mês anterior',
        origem: 'Instagram', criadoPor: 'Bruno Tavares', criadoEm: buildDateInPreviousMonth(15, today),
      },
      {
        id: 'la-prev-2', empresaId: empId, tipo: 'despesa', valorCents: 2890000, valorPagoCents: 2890000,
        dataCompetencia: buildDateInPreviousMonth(15, today), dataVencimento: buildDateInPreviousMonth(15, today),
        dataPagamento: buildDateInPreviousMonth(15, today), status: 'pago', categoriaId: 'cat-ins',
        centroCustoId: 'cc-salao',
        contaId: 'c-nubank', pessoaId: 'pa-1', formaPagamento: 'Boleto', descricao: 'Custos totais mês anterior',
        criadoPor: 'Bruno Tavares', criadoEm: buildDateInPreviousMonth(15, today),
      },
      {
        id: 'la-1', empresaId: empId, tipo: 'receita', valorCents: 1380000, valorPagoCents: 1380000,
        dataCompetencia: addDaysISO(today, -10), dataVencimento: addDaysISO(today, -10),
        dataPagamento: addDaysISO(today, -10), status: 'pago', categoriaId: 'cat-app',
        centroCustoId: 'cc-apps', produtoId: 'pa-app',
        contaId: 'c-ifood', pessoaId: 'pa-2', formaPagamento: 'Cartão de Crédito', descricao: 'Repasse quinzenal app delivery',
        origem: 'Google', criadoPor: 'Bruno Tavares', criadoEm: addDaysISO(today, -10),
      },
      {
        id: 'la-2', empresaId: empId, tipo: 'receita', valorCents: 990000, valorPagoCents: 990000,
        dataCompetencia: addDaysISO(today, -4), dataVencimento: addDaysISO(today, -4),
        dataPagamento: addDaysISO(today, -4), status: 'pago', categoriaId: 'cat-deliv',
        centroCustoId: 'cc-salao', produtoId: 'pa-smash',
        contaId: 'c-nubank', pessoaId: 'pa-2', formaPagamento: 'Pix', descricao: 'Pedidos diretos pelo cardápio do site',
        origem: 'Site LORDES', criadoPor: 'Bruno Tavares', criadoEm: addDaysISO(today, -4),
      },
      {
        id: 'la-3', empresaId: empId, tipo: 'receita', valorCents: 420000, valorPagoCents: 420000,
        dataCompetencia: today, dataVencimento: today, dataPagamento: today, status: 'pago',
        categoriaId: 'cat-salao', centroCustoId: 'cc-salao', produtoId: 'pa-smash',
        contaId: 'c-nubank', pessoaId: 'pa-2', formaPagamento: 'Cartão de Débito',
        descricao: 'Movimento salão semana', origem: 'Balcão / Direto', criadoPor: 'Bruno Tavares', criadoEm: today,
      },
      {
        id: 'la-4', empresaId: empId, tipo: 'despesa', valorCents: 1210000, valorPagoCents: 1210000,
        dataCompetencia: addDaysISO(today, -8), dataVencimento: addDaysISO(today, -8),
        dataPagamento: addDaysISO(today, -8), status: 'pago', categoriaId: 'cat-ins',
        centroCustoId: 'cc-salao',
        contaId: 'c-nubank', pessoaId: 'pa-1', formaPagamento: 'Pix', descricao: 'Blend bovino, brioche e insumos',
        criadoPor: 'Bruno Tavares', criadoEm: addDaysISO(today, -8),
      },
      {
        id: 'la-5', empresaId: empId, tipo: 'despesa', valorCents: 372000, valorPagoCents: 372000,
        dataCompetencia: addDaysISO(today, -6), dataVencimento: addDaysISO(today, -6),
        dataPagamento: addDaysISO(today, -6), status: 'pago', categoriaId: 'cat-taxa-app',
        centroCustoId: 'cc-apps',
        contaId: 'c-ifood', formaPagamento: 'Transferência', descricao: 'Taxa 27% pedidos aplicativo',
        criadoPor: 'Bruno Tavares', criadoEm: addDaysISO(today, -6),
      },
      {
        id: 'la-6', empresaId: empId, tipo: 'despesa', valorCents: 790000, valorPagoCents: 790000,
        dataCompetencia: buildDateInCurrentMonth(5, today), dataVencimento: buildDateInCurrentMonth(5, today),
        dataPagamento: buildDateInCurrentMonth(5, today), status: 'pago', categoriaId: 'cat-fix-a',
        centroCustoId: 'cc-salao',
        contaId: 'c-nubank', formaPagamento: 'Transferência', descricao: 'Aluguel + equipe cozinha',
        recorrente: true, frequencia: 'mensal', criadoPor: 'Bruno Tavares', criadoEm: buildDateInCurrentMonth(5, today),
      },
      {
        id: 'la-7', empresaId: empId, tipo: 'despesa', valorCents: 240000, valorPagoCents: 240000,
        dataCompetencia: addDaysISO(today, -2), dataVencimento: addDaysISO(today, -2),
        dataPagamento: addDaysISO(today, -2), status: 'pago', categoriaId: 'cat-motoboy',
        centroCustoId: 'cc-salao',
        contaId: 'c-nubank', formaPagamento: 'Pix', descricao: 'Diárias entregadores semana',
        criadoPor: 'Bruno Tavares', criadoEm: addDaysISO(today, -2),
      },
      {
        id: 'la-8', empresaId: empId, tipo: 'despesa', valorCents: 680000,
        dataCompetencia: today, dataVencimento: addDaysISO(today, 3),
        status: 'previsto', categoriaId: 'cat-ins', centroCustoId: 'cc-salao',
        contaId: 'c-nubank', pessoaId: 'pa-1',
        formaPagamento: 'Boleto', descricao: 'Boleto frigorífico vencendo em 3 dias',
        criadoPor: 'Bruno Tavares', criadoEm: today,
      },
      {
        id: 'la-9', empresaId: empId, tipo: 'receita', valorCents: 310000,
        dataCompetencia: today, dataVencimento: addDaysISO(today, 5),
        status: 'previsto', categoriaId: 'cat-app', centroCustoId: 'cc-apps', produtoId: 'pa-app',
        contaId: 'c-ifood', pessoaId: 'pa-2',
        formaPagamento: 'Transferência', descricao: 'Repasse semanal previsto', origem: 'Instagram',
        criadoPor: 'Bruno Tavares', criadoEm: today,
      },
    ],
    meta: {
      mesReferencia: currentMonth,
      faturamentoCents: 4200000,
      lucroCents: 650000,
      limiteDespesaCents: 3400000,
    },
    leads: [
      {
        id: 'lead-a1', empresaId: empId, nome: 'Lucas Andrade', empresaNome: 'Evento Aniversário 40 pessoas',
        telefone: '(11) 97111-8899', email: 'lucas@andrade.com', segmento: 'Eventos',
        planoInteresse: 'Essencial', origem: 'Site LORDES', valorEstimadoCents: 240000,
        servicoSolicitado: 'Combo 50 smash burgers + batata para evento', estagio: 'Orçamento Enviado',
        criadoEm: addDaysISO(today, -1),
      },
    ],
    auditoria: [
      { id: 'aud-a1', usuario: 'Bruno Tavares', acao: 'criou', entidade: 'Lançamento', resumo: 'Lançou boleto frigorífico R$ 6.800,00 com vencimento próximo', timestamp: `${today} 10:05` },
    ],
  };
}

export function createCleanTenantDataset(params: {
  empresaId: string;
  nomeFantasia: string;
  segmento: SegmentKey;
  siteSlug: string;
  siteWebhookKey: string;
  creatorName: string;
}): TenantDataset {
  const today = getTodayISO();
  const currentMonth = getMonthKey(today);
  const template = createSegmentPreset(params.segmento);
  const slugDomain = params.siteSlug.replace(/[^a-z0-9-]/g, '') || 'empresa';

  return {
    empresa: {
      id: params.empresaId,
      nomeFantasia: params.nomeFantasia,
      razaoSocial: params.nomeFantasia,
      documento: 'Não informado',
      segmento: params.segmento,
      regimeTributario: 'Simples Nacional',
      plano: 'Profissional',
      corPrimaria: template.empresa.corPrimaria,
      subdominio: `app.${slugDomain}.com.br`,
      produtoNome: `Painel ${params.nomeFantasia}`,
      siteSlug: params.siteSlug,
      siteWebhookKey: params.siteWebhookKey,
      siteHeadline: `Solicite seu orçamento direto com ${params.nomeFantasia}`,
      siteWhatsapp: '',
      aceiteLgpdEm: today,
    },
    contas: [
      {
        id: `c-principal-${params.empresaId}`,
        empresaId: params.empresaId,
        nome: 'Conta Principal PJ',
        tipo: 'banco',
        saldoInicialCents: 0,
        ativa: true,
      },
      {
        id: `c-caixa-${params.empresaId}`,
        empresaId: params.empresaId,
        nome: 'Caixa Interno',
        tipo: 'caixa',
        saldoInicialCents: 0,
        ativa: true,
      },
    ],
    categorias: template.categorias.map((c, idx) => ({
      ...c,
      id: `cat-${params.empresaId}-${idx + 1}`,
      empresaId: params.empresaId,
      categoriaPaiId: undefined,
    })),
    centrosCusto: [
      {
        id: `cc-geral-${params.empresaId}`,
        empresaId: params.empresaId,
        nome: 'Operação Geral',
        ativo: true,
      },
    ],
    produtos: [],
    pessoas: [],
    lancamentos: [],
    meta: {
      mesReferencia: currentMonth,
      faturamentoCents: 2000000,
      lucroCents: 500000,
      limiteDespesaCents: 1500000,
    },
    leads: [],
    auditoria: [
      {
        id: `aud-init-${Date.now()}`,
        usuario: params.creatorName,
        acao: 'criou',
        entidade: 'Empresa',
        resumo: `Conta isolada criada para ${params.nomeFantasia} (site conectado: ?site=${params.siteSlug})`,
        timestamp: `${today} 00:00`,
      },
    ],
  };
}

