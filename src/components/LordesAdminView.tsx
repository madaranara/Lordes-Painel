import React, { useState } from 'react';
import { Check, Copy, FileText, Printer, Users } from 'lucide-react';
import { SaasClientRecord } from '../types/finance';
import { formatBRL, formatDateBR, formatPercent, parseBRLInputToCents } from '../utils/formatters';

interface LordesAdminViewProps {
  clients: SaasClientRecord[];
  onUpdateClientStatus: (id: string, status: SaasClientRecord['status']) => void;
}

const WHATSAPP_SCRIPTS = [
  {
    titulo: '1. Abordagem Direta (Prospecção Local)',
    texto: `Olá! Aqui é da LORDES. Vi o trabalho da sua empresa e notei uma oportunidade: além de estruturar um site profissional para gerar novos orçamentos no Google e WhatsApp, nós entregamos junto um painel financeiro simples para você saber em 5 segundos quanto entrou, quanto saiu e quanto sobrou de lucro no mês.\n\nSe eu te perguntar o lucro exato da empresa no mês passado, você tem esse número na mão hoje? Posso te mostrar um exemplo do painel funcionando em 5 minutos?`,
  },
  {
    titulo: '2. Fechamento da Oferta (Site + 3 Meses Grátis)',
    texto: `Fechando a criação do seu site com a LORDES, você já ganha 3 meses do Gestor Financeiro Profissional sem mensalidade para testar na prática com os seus números. Nós configuramos as categorias do seu segmento junto com você na entrega do site. Após os 90 dias, a assinatura fica R$ 129/mês sem fidelidade.`,
  },
  {
    titulo: '3. Resposta rápida: "Já uso planilha / Meu contador faz"',
    texto: `A planilha não avisa boleto vencendo no celular nem projeta o caixa dos próximos 30 dias, e o contador olha o passado fiscal para impostos. O painel da LORDES mostra o presente e o futuro do seu caixa em segundos, e ainda gera tudo organizado para o seu contador com acesso somente leitura.`,
  },
];

export const LordesAdminView: React.FC<LordesAdminViewProps> = ({
  clients,
  onUpdateClientStatus,
}) => {
  const [subTab, setSubTab] = useState<'metricas' | 'scripts' | 'proposta'>('metricas');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Estado do Gerador de Proposta Comercial (1 página PDF)
  const [propEmpresa, setPropEmpresa] = useState('Studio Gesso & Reformas');
  const [propResponsavel, setPropResponsavel] = useState('Rafael Mendes');
  const [propEscopoSite, setPropEscopoSite] = useState(
    'Site institucional de alta conversão + Formulário de orçamento integrado ao CRM',
  );
  const [propValorSiteStr, setPropValorSiteStr] = useState('2.800,00');
  const [propPlano, setPropPlano] = useState<'Essencial' | 'Profissional' | 'Premium'>('Profissional');

  // Cálculos das métricas do próprio SaaS LORDES (Seção 15)
  const ativos = clients.filter((c) => c.status === 'ativa');
  const trials = clients.filter((c) => c.status === 'trial_3m');
  const cancelados = clients.filter((c) => c.status === 'cancelada');
  const mrrCents = ativos.reduce((acc, c) => acc + c.valorMensalCents, 0);
  const churnPct = clients.length > 0 ? (cancelados.length / clients.length) * 100 : 0;
  const comSite = clients.filter((c) => c.siteContratado).length;
  const taxaAnexoPct = clients.length > 0 ? (comSite / clients.length) * 100 : 0;
  const ativados = clients.filter((c) => c.lancamentosSemana >= 10).length;
  const ativacaoPct = clients.length > 0 ? (ativados / clients.length) * 100 : 0;

  const mensalidadePlano = propPlano === 'Essencial' ? 6900 : propPlano === 'Profissional' ? 12900 : 24900;
  const valorSiteCents = parseBRLInputToCents(propValorSiteStr) || 280000;

  const copyScript = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Operação LORDES — Backoffice SaaS &amp; Kit Comercial
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe MRR, ativação dos clientes e gere propostas em PDF com roteiro de vendas
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('metricas')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              subTab === 'metricas' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Métricas LORDES
          </button>
          <button
            type="button"
            onClick={() => setSubTab('scripts')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              subTab === 'scripts' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Scripts WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setSubTab('proposta')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              subTab === 'proposta' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Proposta PDF
          </button>
        </div>
      </div>

      {subTab === 'metricas' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">MRR Ativo (Recorrência Mensal)</div>
              <div className="text-2xl font-bold font-mono-num text-emerald-700 mt-2">
                {formatBRL(mrrCents)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">{ativos.length} assinante(s) pagante(s)</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">Em Trial (3 meses grátis c/ site)</div>
              <div className="text-2xl font-bold font-mono-num text-[#1E40AF] mt-2">
                {trials.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Potencial adicional: {formatBRL(trials.reduce((a, b) => a + b.valorMensalCents, 0))}/mês</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">Taxa de anexo (Site + Gestor)</div>
              <div className="text-2xl font-bold font-mono-num text-slate-900 mt-2">
                {formatPercent(taxaAnexoPct, 0)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Meta ano 1: 30% a 50%</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">Ativação (≥10 lanç./sem) · Churn</div>
              <div className="text-2xl font-bold font-mono-num text-slate-900 mt-2">
                {formatPercent(ativacaoPct, 0)} · {formatPercent(churnPct, 1)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Meta de churn mensal &lt; 3%</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              <h3 className="font-display text-sm font-bold text-slate-900">
                Base de clientes LORDES (Pacote Site + Gestor)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="py-3 px-4 font-medium">Empresa / Responsável</th>
                    <th className="py-3 px-4 font-medium">Plano / Pacote</th>
                    <th className="py-3 px-4 font-medium text-right">Mensalidade</th>
                    <th className="py-3 px-4 font-medium text-right">Uso/sem.</th>
                    <th className="py-3 px-4 font-medium">Início</th>
                    <th className="py-3 px-4 font-medium">Status assinatura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map((cli) => (
                    <tr key={cli.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{cli.empresaNome}</div>
                        <div className="text-[11px] text-slate-500">
                          {cli.responsavel} · {cli.segmento}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {cli.plano} · {cli.siteContratado ? 'Site + Gestor' : 'Somente Gestor'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900">
                        {formatBRL(cli.valorMensalCents)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num text-slate-600">
                        {cli.lancamentosSemana} lanç.
                      </td>
                      <td className="py-3 px-4 font-mono-num text-slate-500">
                        {formatDateBR(cli.inicioEm)}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={cli.status}
                          onChange={(e) =>
                            onUpdateClientStatus(cli.id, e.target.value as SaasClientRecord['status'])
                          }
                          className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-md bg-white"
                        >
                          <option value="trial_3m">Trial 3 meses grátis</option>
                          <option value="ativa">Ativa (Pagante)</option>
                          <option value="inadimplente">Inadimplente</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'scripts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {WHATSAPP_SCRIPTS.map((sc, idx) => (
            <div key={sc.titulo} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 mb-3">{sc.titulo}</h3>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 border border-slate-100 rounded-lg p-3.5">
                  {sc.texto}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyScript(idx, sc.texto)}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedIdx === idx ? 'Copiado!' : 'Copiar script para WhatsApp'}
              </button>
            </div>
          ))}
        </div>
      )}

      {subTab === 'proposta' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3 no-print h-fit">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FileText className="w-4 h-4 text-[#1E40AF]" />
              Dados da proposta (1 página)
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Empresa cliente</label>
              <input
                type="text"
                value={propEmpresa}
                onChange={(e) => setPropEmpresa(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
              <input
                type="text"
                value={propResponsavel}
                onChange={(e) => setPropResponsavel(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Escopo do site</label>
              <textarea
                rows={3}
                value={propEscopoSite}
                onChange={(e) => setPropEscopoSite(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valor do Site (R$)</label>
                <input
                  type="text"
                  value={propValorSiteStr}
                  onChange={(e) => setPropValorSiteStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-num border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Plano Gestor</label>
                <select
                  value={propPlano}
                  onChange={(e) => setPropPlano(e.target.value as 'Essencial' | 'Profissional' | 'Premium')}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Essencial">Essencial (R$ 69)</option>
                  <option value="Profissional">Profissional (R$ 129)</option>
                  <option value="Premium">Premium (R$ 249)</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar Proposta em PDF
            </button>
          </div>

          {/* Folha da Proposta Imprimível */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-8 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <div className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
                  LORDES
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Proposta Comercial · Pacote Site + CRM &amp; Gestor Financeiro
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Para: <strong className="text-slate-900">{propEmpresa}</strong></div>
                <div>A/C: {propResponsavel}</div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                &quot;Seu site traz clientes. Seu painel mostra se você está lucrando com eles.&quot;
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                Esta proposta reúne em uma única entrega a criação da presença digital da <strong>{propEmpresa}</strong> e a implantação do painel financeiro com CRM integrado, substituindo planilhas soltas por visão clara de lucro, contas a pagar/receber e projeção de caixa de 30 dias.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
                <div className="font-bold text-slate-900">1. Criação do Site (Entrega Única)</div>
                <p className="text-slate-600">{propEscopoSite}</p>
                <div className="pt-2 font-mono-num text-base font-bold text-slate-900">
                  {formatBRL(valorSiteCents)}
                </div>
                <div className="text-[11px] text-slate-500">Condição: 50% na aprovação + 50% na entrega</div>
              </div>

              <div className="p-4 border border-[#1E40AF] rounded-lg space-y-1.5">
                <div className="font-bold text-slate-900">2. Gestor Financeiro + CRM ({propPlano})</div>
                <p className="text-slate-600">
                  Onboarding guiado incluído, DRE simplificado, fluxo de caixa 30d e acesso para o contador.
                </p>
                <div className="pt-2 font-mono-num text-base font-bold text-[#1E40AF]">
                  3 meses grátis (bônus)
                </div>
                <div className="text-[11px] text-slate-500">
                  Após os 90 dias: {formatBRL(mensalidadePlano)}/mês · Sem fidelidade
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
              <span>Validade da proposta: 10 dias corridos.</span>
              <span>LORDES · Sites, CRM &amp; Gestão Financeira para PMEs</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
