import React, { useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Layers, ShieldCheck } from 'lucide-react';
import { MarketingOrigin, SegmentKey } from '../types/finance';
import { parseBRLInputToCents } from '../utils/formatters';
import { PWAInstallButton } from './PWAInstallButton';

interface LandingPageProps {
  authenticatedEmail?: string | null;
  onOpenDashboard: (segment?: SegmentKey, tab?: string) => void;
  onOpenAuth: () => void;
  onOpenLegal: () => void;
  onSubmitLeadFromSite: (lead: {
    nome: string;
    empresaNome: string;
    telefone: string;
    email: string;
    segmento: string;
    planoInteresse: 'Essencial' | 'Profissional' | 'Premium';
    origem: MarketingOrigin;
    valorEstimadoCents: number;
    servicoSolicitado: string;
  }) => void;
}

const PLANS: {
  nome: 'Essencial' | 'Profissional' | 'Premium';
  audiencia: string;
  preco: string;
  unidades: string;
  usuarios: string;
  destaques: string[];
  featured?: boolean;
}[] = [
  {
    nome: 'Essencial',
    audiencia: 'Para quem está saindo do caderno e da planilha',
    preco: 'R$ 69',
    unidades: '1 empresa / unidade',
    usuarios: 'Até 2 usuários',
    destaques: [
      'Lançamentos ilimitados em 3 toques',
      'Dashboard com os 8 KPIs e semáforo',
      'DRE básico e fluxo de caixa mensal',
      'Metas mensais e alertas por e-mail',
    ],
  },
  {
    nome: 'Profissional',
    audiencia: 'Para empresas em crescimento (3 meses grátis com o site)',
    preco: 'R$ 129',
    unidades: '1 a 3 empresas / unidades',
    usuarios: 'Até 5 usuários',
    featured: true,
    destaques: [
      'Tudo do Essencial + DRE e fluxo projetado completo',
      'Alertas e resumo semanal via WhatsApp',
      'Cobrança por Pix e importação de extrato (OFX)',
      'Acesso somente leitura para o seu contador',
    ],
  },
  {
    nome: 'Premium',
    audiencia: 'Para operações multiunidade com site e CRM integrados',
    preco: 'R$ 249',
    unidades: 'Até 10 empresas / unidades',
    usuarios: 'Até 15 usuários',
    destaques: [
      'Tudo do Profissional + Suporte prioritário',
      'Orçamentos do site entram direto como leads no CRM',
      'Painel White-label com seu logo, domínio e cores',
      'CAC e retorno financeiro por canal de marketing',
    ],
  },
];

const OBJECTIONS = [
  {
    objecao: '"Já uso planilha"',
    resposta:
      'A planilha não avisa vencimentos, não projeta o caixa dos próximos 30 dias e não cabe no bolso do celular. Nós migramos seus dados iniciais no onboarding.',
  },
  {
    objecao: '"Não tenho tempo para preencher sistema"',
    resposta:
      'Lançar uma venda ou despesa leva menos de 10 segundos no lançamento rápido em 3 toques e economiza horas de conferência no fim do mês.',
  },
  {
    objecao: '"Meu contador já faz isso"',
    resposta:
      'O contador olha o passado fiscal e os impostos. O painel da LORDES mostra o presente e o futuro do seu caixa, além de dar acesso organizado para o contador.',
  },
  {
    objecao: '"Não entendo de termos financeiros"',
    resposta:
      'Cada indicador traz a pergunta que ele responde em português simples e um semáforo verde, amarelo ou vermelho explicando sua situação em uma frase.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  authenticatedEmail,
  onOpenDashboard,
  onOpenAuth,
  onOpenLegal,
  onSubmitLeadFromSite,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'Essencial' | 'Profissional' | 'Premium'>('Profissional');
  const [nome, setNome] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [segmentoForm, setSegmentoForm] = useState('Prestação de Serviços');
  const [origem, setOrigem] = useState<MarketingOrigin>(() => {
    try {
      const utm = (new URLSearchParams(window.location.search).get('utm_source') || '').toLowerCase();
      if (utm.includes('google')) return 'Google';
      if (utm.includes('insta') || utm.includes('meta') || utm.includes('facebook')) return 'Instagram';
      if (utm.includes('indic') || utm.includes('ref')) return 'Indicação';
    } catch {
      // ignore
    }
    return 'Site LORDES';
  });
  const [orcamentoStr, setOrcamentoStr] = useState('3.500,00');
  const [servicoSolicitado, setServicoSolicitado] = useState(
    'Pacote Site Institucional + Gestor Financeiro e CRM',
  );
  const [formError, setFormError] = useState('');
  const [submittedLeadName, setSubmittedLeadName] = useState<string | null>(null);

  const handleSelectPlan = (plan: 'Essencial' | 'Profissional' | 'Premium') => {
    setSelectedPlan(plan);
    const el = document.getElementById('orcamento');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nome.trim() || !empresaNome.trim()) {
      setFormError('Informe seu nome e o nome da empresa.');
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) {
      setFormError('Informe um e-mail válido para contato.');
      return;
    }
    if (telefone.replace(/\D/g, '').length < 10) {
      setFormError('Informe um WhatsApp/telefone válido com DDD.');
      return;
    }

    const valorCents = parseBRLInputToCents(orcamentoStr) || 350000;
    onSubmitLeadFromSite({
      nome: nome.trim(),
      empresaNome: empresaNome.trim(),
      telefone: telefone.trim(),
      email: email.trim(),
      segmento: segmentoForm,
      planoInteresse: selectedPlan,
      origem,
      valorEstimadoCents: valorCents,
      servicoSolicitado: servicoSolicitado.trim() || `Pacote Site + Gestor (${selectedPlan})`,
    });

    setSubmittedLeadName(empresaNome.trim());
    setNome('');
    setEmpresaNome('');
    setTelefone('');
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111827]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#FAFAFA]/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#topo"
            className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            LORDES
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#solucao"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Solução
            </a>
            <a
              href="#segmentos"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Segmentos
            </a>
            <a
              href="#planos"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Planos
            </a>
            <a
              href="#orcamento"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Orçamento
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onOpenDashboard('servicos', 'dashboard')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Acessar Painel Demo
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="topo" className="max-w-6xl mx-auto px-6 pt-14 pb-16 lg:pt-20 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <p className="text-xs font-medium text-slate-500">
                LORDES · Pacote Site + CRM &amp; Gestor Financeiro para PMEs
              </p>
              <h1
                className="font-display font-bold tracking-tight text-slate-900 leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.35rem)', textWrap: 'balance' }}
              >
                Seu site traz clientes. Seu painel mostra se você está lucrando com eles.
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Um bom site profissional para captar orçamentos todos os dias, conectado a um gestor financeiro visual e CRM simples. Veja em segundos quanto entrou, quanto sobrou e quanto você terá em caixa nos próximos 30 dias.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => onOpenDashboard('servicos', 'dashboard')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Ver Painel ao Vivo
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onOpenAuth}
                className="text-sm font-semibold text-slate-800 hover:text-[#1E40AF] underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {authenticatedEmail ? `Minha conta (${authenticatedEmail})` : 'Criar conta / Entrar'}
              </button>
              <PWAInstallButton />
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[300px] rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
              <img
                src="/src/assets/images/hero_lordes_studio_1795535682107.jpg"
                alt="Ambiente executivo da LORDES com painel financeiro aberto no computador"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="text-xs text-slate-200">
                  Do visitante ao lucro líquido · Painel pronto em 10 minutos no onboarding
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Strip com os 4 números de prova adjacentes à proposição */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-b border-slate-200 py-6">
          <div>
            <div className="font-mono-num text-2xl font-bold text-slate-900">8 KPIs</div>
            <div className="text-xs text-slate-600 mt-1">Essenciais visíveis na tela inicial com explicação simples</div>
          </div>
          <div>
            <div className="font-mono-num text-2xl font-bold text-slate-900">3 toques</div>
            <div className="text-xs text-slate-600 mt-1">Para lançar uma venda ou despesa pelo celular</div>
          </div>
          <div>
            <div className="font-mono-num text-2xl font-bold text-slate-900">30 dias</div>
            <div className="text-xs text-slate-600 mt-1">De projeção de caixa futura com alertas de vencimento</div>
          </div>
          <div>
            <div className="font-mono-num text-2xl font-bold text-slate-900">3 meses</div>
            <div className="text-xs text-slate-600 mt-1">Do plano Profissional incluídos na contratação do site</div>
          </div>
        </div>
      </section>

      {/* Solução Ponta a Ponta — Bento Assimétrico */}
      <section id="solucao" className="max-w-6xl mx-auto px-6 py-16">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-medium text-[#1E40AF]">Arquitetura da oferta LORDES</p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 mt-2" style={{ textWrap: 'balance' }}>
            Para pequenos empresários que precisam de clareza, não de um ERP complicado.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-num text-slate-500">01. Captação e CRM Integrado</span>
              <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                O formulário do seu site vira orçamento no CRM e receita prevista no caixa
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-xl">
                Cada pedido enviado pelo seu site entra automaticamente na fila comercial com canal de origem (Google, Instagram, Indicação ou Site). Com um clique, um orçamento aprovado gera a conta a receber no financeiro.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                Rastreamento ponta a ponta: CAC, ticket médio e retorno do marketing
              </span>
              <button
                type="button"
                onClick={() => onOpenDashboard('servicos', 'crm')}
                className="text-xs font-semibold text-[#1E40AF] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Abrir CRM de Leads na Demo →
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-num text-slate-500">02. Semáforo de Caixa</span>
              <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                Situação do negócio em 5 segundos
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mt-3">
                Sem jargão contábil: o painel cruza saldo atual, margem líquida, inadimplência e contas dos próximos 30 dias para exibir um semáforo claro com uma frase direta de ação.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500">
              Verde (Saudável) · Amarelo (Atenção) · Vermelho (Crítico)
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-num text-slate-500">03. Rotina Sem Retrabalho</span>
              <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                Parcelamentos, recorrências e baixa parcial
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mt-3">
                Gere parcelas individuais automaticamente, controle despesas fixas recorrentes, faça baixas parciais e calcule juros/multa em recebíveis atrasados.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onOpenDashboard('servicos', 'contas_pr')}
                className="text-xs font-semibold text-[#1E40AF] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Ver Contas a Pagar e Receber →
              </button>
            </div>
          </div>

          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-num text-slate-500">04. White-Label &amp; Acesso do Contador</span>
              <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                Seu cliente enxerga a própria marca no site e no painel financeiro
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-xl">
                Personalize nome do painel, cor primária e subdomínio próprio (como app.suaempresa.com.br). Libere acesso somente leitura para o contador exportar DRE simplificado mensal e planilhas CSV organizadas.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                Perfis dedicados: Proprietário · Financeiro · Somente Leitura (Contador)
              </span>
              <button
                type="button"
                onClick={() => onOpenDashboard('servicos', 'configuracoes')}
                className="text-xs font-semibold text-[#1E40AF] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Testar White-Label →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Segmentos Prioritários com Demos Interativas */}
      <section id="segmentos" className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div className="max-w-xl">
            <p className="text-xs font-medium text-[#1E40AF]">Demos prontas por segmento</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 mt-2">
              Planos de contas pré-configurados para o seu tipo de negócio.
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-sm">
            Escolha um segmento abaixo para abrir o gestor preenchido com lançamentos, leads e indicadores reais do setor.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
              <img
                src="/src/assets/images/segment_servicos_1795535681668.jpg"
                alt="Prestador de serviços em reforma revisando projeto em tablet"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs text-slate-500">Prestadores de Serviço · Gesso, Reformas, Clínicas</p>
                <h3 className="font-display text-lg font-bold text-slate-900 mt-1">
                  Studio Gesso &amp; Reformas
                </h3>
                <p className="text-sm text-slate-600 mt-2">
                  Controle materiais por obra, diárias de equipe, medições parceladas e orçamentos vindos do site.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenDashboard('servicos', 'dashboard')}
                className="mt-5 w-full py-2.5 px-4 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Abrir Demo de Serviços
              </button>
            </div>
          </article>

          <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
              <img
                src="/src/assets/images/segment_comercio_1795535682227.jpg"
                alt="Balcão de cafeteria e comércio local brasileiro"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs text-slate-500">Comércio Local · Lojas, Empórios, Varejo</p>
                <h3 className="font-display text-lg font-bold text-slate-900 mt-1">
                  Café &amp; Empório Paulista
                </h3>
                <p className="text-sm text-slate-600 mt-2">
                  Acompanhe reposição de mercadorias, taxas de maquininha, embalagens e pedidos corporativos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenDashboard('comercio', 'dashboard')}
                className="mt-5 w-full py-2.5 px-4 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Abrir Demo de Comércio
              </button>
            </div>
          </article>

          <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between p-6">
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500">Alimentação &amp; Delivery · Margem sob controle</p>
              <h3 className="font-display text-lg font-bold text-slate-900 mt-1">
                Brava Hamburgueria Artesanal
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Veja como o semáforo amarelo alerta quando as comissões de aplicativos e insumos comprimem a margem líquida, mostrando o impacto de vender direto pelo site próprio.
              </p>
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Categorias inclusas:</span>
                  <span className="font-medium text-slate-800">Insumos, Motoboy, Apps</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado demonstrado:</span>
                  <span className="font-medium text-amber-700">Semáforo Atenção</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenDashboard('alimentacao', 'dashboard')}
              className="mt-6 w-full py-2.5 px-4 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Abrir Demo de Alimentação
            </button>
          </article>
        </div>
      </section>

      {/* Planos e Precificação (Seção 10) */}
      <section id="planos" className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-medium text-[#1E40AF]">Estrutura comercial transparente</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 mt-2">
              Planos do Gestor Financeiro + CRM
            </h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Oferta de entrada LORDES:</span> Na criação do site institucional ou landing page, você ganha 3 meses do plano Profissional sem mensalidade.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.nome}
              className={`rounded-xl p-6 flex flex-col justify-between bg-white border ${
                plan.featured ? 'border-[#1E40AF]' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-xl font-bold text-slate-900">{plan.nome}</h3>
                  <span className="text-xs text-slate-500">{plan.usuarios}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 min-h-[32px]">{plan.audiencia}</p>

                <div className="mt-5 pb-5 border-b border-slate-100 flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-bold font-mono-num text-slate-900">
                    {plan.preco}
                  </span>
                  <span className="text-xs text-slate-500">/mês · {plan.unidades}</span>
                </div>

                <ul className="mt-5 space-y-3 text-sm text-slate-700">
                  {plan.destaques.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#1E40AF] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleSelectPlan(plan.nome)}
                className={`mt-7 w-full py-2.5 px-4 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  plan.featured
                    ? 'bg-[#1E40AF] text-white hover:bg-[#1E3A8A]'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                Solicitar pacote {plan.nome}
              </button>
            </div>
          ))}
        </div>

        {/* Respostas às Objeções */}
        <div className="mt-14 bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
          <h3 className="font-display text-xl font-bold text-slate-900 mb-6">
            Dúvidas frequentes de quem está avaliando o pacote
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {OBJECTIONS.map((item) => (
              <div key={item.objecao} className="border-t border-slate-100 pt-4">
                <div className="text-sm font-semibold text-slate-900">{item.objecao}</div>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{item.resposta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulário de Orçamento Conectado ao CRM (Nível 2 ao vivo) */}
      <section id="orcamento" className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-medium text-[#1E40AF]">Integração real Site → CRM LORDES</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Peça o orçamento do seu Site + Gestor Financeiro.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ao enviar este formulário, além de simular o pedido comercial para a LORDES, o registro entra imediatamente na aba <strong>CRM &amp; Leads do Site</strong> do painel de demonstração para você ver a integração funcionando na prática.
            </p>
            <div className="pt-2 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Dados tratados conforme a LGPD · Sem compromisso inicial</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
              {submittedLeadName ? (
                <div className="py-6 space-y-4">
                  <div className="inline-flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Orçamento recebido e enviado ao CRM!
                  </div>
                  <p className="text-sm text-slate-600">
                    O lead da empresa <strong>{submittedLeadName}</strong> já foi registrado no painel CRM da LORDES com a origem selecionada.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => onOpenDashboard('servicos', 'crm')}
                      className="px-4 py-2.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors cursor-pointer"
                    >
                      Abrir Lead no Painel CRM
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmittedLeadName(null)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Enviar outro orçamento
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Seu nome</label>
                      <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Ex: Marcos Oliveira"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Nome da empresa</label>
                      <input
                        type="text"
                        value={empresaNome}
                        onChange={(e) => setEmpresaNome(e.target.value)}
                        placeholder="Ex: Oliveira Pinturas"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">WhatsApp</label>
                      <input
                        type="tel"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">E-mail</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contato@empresa.com.br"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Segmento</label>
                      <select
                        value={segmentoForm}
                        onChange={(e) => setSegmentoForm(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#1E40AF]"
                      >
                        <option>Prestação de Serviços</option>
                        <option>Comércio Local</option>
                        <option>Alimentação &amp; Delivery</option>
                        <option>Clínica / Consultório</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Plano desejado</label>
                      <select
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value as 'Essencial' | 'Profissional' | 'Premium')}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#1E40AF]"
                      >
                        <option value="Essencial">Essencial (R$ 69/mês)</option>
                        <option value="Profissional">Profissional (R$ 129/mês)</option>
                        <option value="Premium">Premium (R$ 249/mês)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Canal de origem</label>
                      <select
                        value={origem}
                        onChange={(e) => setOrigem(e.target.value as MarketingOrigin)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#1E40AF]"
                      >
                        <option value="Site LORDES">Site LORDES</option>
                        <option value="Google">Google</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Indicação">Indicação</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Escopo / Necessidade</label>
                      <input
                        type="text"
                        value={servicoSolicitado}
                        onChange={(e) => setServicoSolicitado(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#1E40AF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Valor estimado (R$)</label>
                      <input
                        type="text"
                        value={orcamentoStr}
                        onChange={(e) => setOrcamentoStr(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg focus:outline-none focus:border-[#1E40AF]"
                      />
                    </div>
                  </div>

                  {formError && <p className="text-xs font-medium text-rose-700">{formError}</p>}

                  <div className="pt-2 flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500">Resposta comercial em até 1 dia útil.</span>
                    <button
                      type="submit"
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Enviar Orçamento
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-display font-bold text-slate-900">LORDES</span>
            <span className="mx-2">·</span>
            <span>Sites, CRM &amp; Gestão Financeira para PMEs Brasileiras</span>
            <span className="mx-2">·</span>
            <button
              type="button"
              onClick={onOpenLegal}
              className="text-slate-700 hover:text-slate-900 underline cursor-pointer"
            >
              Termos &amp; LGPD
            </button>
          </div>
          <p className="max-w-xl">
            Aviso importante: o Gestor Financeiro LORDES é uma ferramenta de gestão gerencial e fluxo de caixa; não substitui a contabilidade nem emite obrigações fiscais.
          </p>
        </div>
      </footer>
    </div>
  );
};
