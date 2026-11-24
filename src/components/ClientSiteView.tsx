import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Globe, MessageCircle, Send } from 'lucide-react';
import { LeadCRM, MarketingOrigin, ProdutoServico, SegmentKey, TenantDataset } from '../types/finance';
import { formatBRL, parseBRLInputToCents } from '../utils/formatters';

interface PublicSiteData {
  siteSlug: string;
  nomeFantasia: string;
  segmento: SegmentKey;
  corPrimaria: string;
  logoDataUrl?: string;
  siteHeadline: string;
  siteWhatsapp: string;
  produtos: Pick<ProdutoServico, 'id' | 'nome' | 'tipo' | 'precoVendaCents'>[];
}

interface ClientSiteViewProps {
  siteSlug: string;
  demoDatasets: Record<SegmentKey, TenantDataset>;
  onBackToLordes: () => void;
  onOpenPanel: () => void;
  onDemoSiteLead?: (
    segment: SegmentKey,
    lead: Omit<LeadCRM, 'id' | 'empresaId' | 'criadoEm' | 'estagio'>,
  ) => void;
}

function detectUtmOrigin(): MarketingOrigin {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = (params.get('utm_source') || '').toLowerCase();
    if (utm.includes('google')) return 'Google';
    if (utm.includes('insta') || utm.includes('facebook') || utm.includes('meta')) return 'Instagram';
    if (utm.includes('indic') || utm.includes('ref')) return 'Indicação';
  } catch {
    // ignore
  }
  return 'Site LORDES';
}

export const ClientSiteView: React.FC<ClientSiteViewProps> = ({
  siteSlug,
  demoDatasets,
  onBackToLordes,
  onOpenPanel,
  onDemoSiteLead,
}) => {
  const [site, setSite] = useState<PublicSiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [nome, setNome] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [servico, setServico] = useState('');
  const [valorStr, setValorStr] = useState('2.500,00');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentLeadId, setSentLeadId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    // Verifica primeiro se corresponde a um dos demos em memória (permite testar imediatamente)
    const demoEntries = Object.entries(demoDatasets) as [SegmentKey, TenantDataset][];
    const demoMatch = demoEntries.find(([, ds]) => ds.empresa.siteSlug === siteSlug);

    fetch(`/api/v1/public/site/${encodeURIComponent(siteSlug)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as PublicSiteData;
          setSite(data);
          if (data.produtos[0] && !servico) {
            setServico(data.produtos[0].nome);
            setValorStr((data.produtos[0].precoVendaCents / 100).toFixed(2).replace('.', ','));
          }
          setLoading(false);
          return;
        }
        if (demoMatch) {
          const ds = demoMatch[1];
          setSite({
            siteSlug,
            nomeFantasia: ds.empresa.nomeFantasia,
            segmento: ds.empresa.segmento,
            corPrimaria: ds.empresa.corPrimaria,
            logoDataUrl: ds.empresa.logoDataUrl,
            siteHeadline: ds.empresa.siteHeadline || `Solicite seu orçamento com ${ds.empresa.nomeFantasia}`,
            siteWhatsapp: ds.empresa.siteWhatsapp || '',
            produtos: (ds.produtos || []).filter((p) => p.ativo),
          });
          setLoading(false);
          return;
        }
        setNotFound(true);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (demoMatch) {
          const ds = demoMatch[1];
          setSite({
            siteSlug,
            nomeFantasia: ds.empresa.nomeFantasia,
            segmento: ds.empresa.segmento,
            corPrimaria: ds.empresa.corPrimaria,
            logoDataUrl: ds.empresa.logoDataUrl,
            siteHeadline: ds.empresa.siteHeadline || `Solicite seu orçamento com ${ds.empresa.nomeFantasia}`,
            siteWhatsapp: ds.empresa.siteWhatsapp || '',
            produtos: (ds.produtos || []).filter((p) => p.ativo),
          });
        } else {
          setNotFound(true);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [siteSlug, demoDatasets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site) return;
    setError('');
    setSending(true);

    const valorEstimadoCents = parseBRLInputToCents(valorStr) || 150000;
    const origem = detectUtmOrigin();
    const utmSource = new URLSearchParams(window.location.search).get('utm_source') || undefined;

    try {
      const res = await fetch(`/api/v1/public/site/${encodeURIComponent(site.siteSlug)}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          empresaNome: empresaNome.trim() || nome.trim(),
          telefone,
          email,
          servicoSolicitado: servico.trim() || `Orçamento — ${site.nomeFantasia}`,
          valorEstimadoCents,
          origem,
          utmSource,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; leadId?: string; error?: string };
      if (!res.ok) {
        setError(data.error || 'Não foi possível enviar o pedido.');
        setSending(false);
        return;
      }

      // Se for demo local, reflete imediatamente no estado local também
      const demoEntries = Object.entries(demoDatasets) as [SegmentKey, TenantDataset][];
      const demoMatch = demoEntries.find(([, ds]) => ds.empresa.siteSlug === site.siteSlug);
      if (demoMatch && onDemoSiteLead) {
        onDemoSiteLead(demoMatch[0], {
          nome: nome.trim(),
          empresaNome: empresaNome.trim() || nome.trim(),
          telefone: telefone.trim() || '—',
          email: email.trim() || '—',
          segmento: site.segmento,
          planoInteresse: 'Profissional',
          origem,
          valorEstimadoCents,
          servicoSolicitado: servico.trim() || `Orçamento — ${site.nomeFantasia}`,
        });
      }

      setSentLeadId(data.leadId || 'ok');
      setNome('');
      setEmpresaNome('');
      setTelefone('');
      setEmail('');
    } catch {
      setError('Falha de conexão ao enviar seu orçamento.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-600">Carregando site conectado...</div>
      </div>
    );
  }

  if (notFound || !site) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Globe className="w-10 h-10 text-slate-400" />
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Site não encontrado ({siteSlug})
        </h1>
        <p className="text-sm text-slate-600 max-w-md">
          Verifique o link configurado na aba &quot;Site &amp; White-Label&quot; do painel da empresa.
        </p>
        <button
          type="button"
          onClick={onBackToLordes}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] rounded-lg cursor-pointer"
        >
          Voltar à LORDES
        </button>
      </div>
    );
  }

  const brandColor = site.corPrimaria || '#1E40AF';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {site.logoDataUrl ? (
              <img
                src={site.logoDataUrl}
                alt={`Logotipo de ${site.nomeFantasia}`}
                className="w-8 h-8 rounded-lg object-contain border border-slate-200 bg-white shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {site.nomeFantasia.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-display text-sm sm:text-base font-bold text-slate-900 truncate">
                {site.nomeFantasia}
              </div>
              <div className="text-[11px] text-slate-500">Atendimento e Orçamentos Online</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenPanel}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Acessar painel da empresa
            </button>
            <button
              type="button"
              onClick={onBackToLordes}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              LORDES
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: brandColor }}>
              Site Conectado · {site.nomeFantasia}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              {site.siteHeadline}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Preencha os dados ao lado para receber sua proposta personalizada. Seu pedido entra diretamente na fila de atendimento de{' '}
              <strong className="text-slate-900">{site.nomeFantasia}</strong>.
            </p>
          </div>

          {site.produtos.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h2 className="font-display text-sm font-bold text-slate-900">
                Catálogo de Produtos e Serviços
              </h2>
              <div className="divide-y divide-slate-100">
                {site.produtos.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      setServico(prod.nome);
                      setValorStr((prod.precoVendaCents / 100).toFixed(2).replace('.', ','));
                    }}
                    className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-50 px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{prod.nome}</div>
                      <div className="text-[11px] text-slate-500 capitalize">{prod.tipo}</div>
                    </div>
                    <div className="text-xs font-mono-num font-bold" style={{ color: brandColor }}>
                      {formatBRL(prod.precoVendaCents)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {site.siteWhatsapp && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <MessageCircle className="w-4 h-4 text-emerald-700" />
              <span>WhatsApp comercial: {site.siteWhatsapp}</span>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
          {sentLeadId ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Orçamento enviado para {site.nomeFantasia}!
              </h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Seu pedido já entrou direto no CRM financeiro exclusivo desta empresa e nossa equipe entrará em contato em breve.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSentLeadId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Enviar outro orçamento
                </button>
                <button
                  type="button"
                  onClick={onOpenPanel}
                  style={{ backgroundColor: brandColor }}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                >
                  Ver no CRM do Painel
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Solicitar orçamento grátis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resposta rápida sem compromisso
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Seu nome</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Mariana Alves"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Sua empresa (opcional)</label>
                  <input
                    type="text"
                    value={empresaNome}
                    onChange={(e) => setEmpresaNome(e.target.value)}
                    placeholder="Ex: Alves Arquitetura"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-0000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@empresa.com.br"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    O que você precisa?
                  </label>
                  <input
                    type="text"
                    required
                    value={servico}
                    onChange={(e) => setServico(e.target.value)}
                    placeholder="Descreva o serviço ou produto"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Valor estimado (R$)
                  </label>
                  <input
                    type="text"
                    value={valorStr}
                    onChange={(e) => setValorStr(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {error && <p className="text-xs font-medium text-rose-700">{error}</p>}

              <button
                type="submit"
                disabled={sending}
                style={{ backgroundColor: brandColor }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white rounded-lg hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? 'Enviando...' : 'Enviar pedido de orçamento'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
