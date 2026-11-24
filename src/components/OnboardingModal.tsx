import React, { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  FileUp,
  Globe,
  Plus,
  Target,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { createSegmentPreset } from '../data/presets';
import { SEGMENT_OPTIONS, getSegmentLabel } from '../data/segments';
import { SegmentKey, TenantDataset } from '../types/finance';
import { formatBRL, getTodayISO, parseBRLInputToCents } from '../utils/formatters';
import { parseBankStatement } from '../utils/statementParser';

export interface OnboardingInitialEntry {
  tipo: 'receita' | 'despesa';
  descricao: string;
  valorCents: number;
  dataISO: string;
  categoriaNome?: string;
}

export interface OnboardingWizardResult {
  nomeFantasia: string;
  documento: string;
  regimeTributario: string;
  segmento: SegmentKey;
  contaPrincipalNome: string;
  saldoPrincipalCents: number;
  contaSecundariaNome?: string;
  saldoSecundarioCents: number;
  metaFaturamentoCents: number;
  metaLucroCents: number;
  limiteDespesaCents: number;
  siteSlug: string;
  siteHeadline: string;
  siteWhatsapp: string;
  entradasIniciais: OnboardingInitialEntry[];
}

interface OnboardingModalProps {
  dataset: TenantDataset;
  onClose: () => void;
  onComplete: (result: OnboardingWizardResult) => void;
}

const STEPS = [
  { id: 1, label: 'Empresa', icon: Building2 },
  { id: 2, label: 'Contas', icon: Wallet },
  { id: 3, label: 'Movimentos', icon: FileUp },
  { id: 4, label: 'Metas & Site', icon: Target },
  { id: 5, label: 'Concluir', icon: CheckCircle2 },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  dataset,
  onClose,
  onComplete,
}) => {
  const today = getTodayISO();
  const [step, setStep] = useState(1);

  // Passo 1: Empresa & Segmento
  const [nomeFantasia, setNomeFantasia] = useState(dataset.empresa.nomeFantasia);
  const [documento, setDocumento] = useState(
    dataset.empresa.documento === 'Não informado' ? '' : dataset.empresa.documento,
  );
  const [regimeTributario, setRegimeTributario] = useState(
    dataset.empresa.regimeTributario || 'Simples Nacional',
  );
  const [segmento, setSegmento] = useState<SegmentKey>(dataset.empresa.segmento);

  // Passo 2: Contas financeiras e saldo inicial
  const [contaNome, setContaNome] = useState(dataset.contas[0]?.nome || 'Conta Principal PJ');
  const [saldoStr, setSaldoStr] = useState(
    ((dataset.contas[0]?.saldoInicialCents ?? 0) / 100).toFixed(2).replace('.', ','),
  );
  const [contaSecNome, setContaSecNome] = useState(dataset.contas[1]?.nome || 'Caixa Interno');
  const [saldoSecStr, setSaldoSecStr] = useState(
    ((dataset.contas[1]?.saldoInicialCents ?? 0) / 100).toFixed(2).replace('.', ','),
  );

  // Passo 3: Primeiras movimentações (até 5 manuais ou importação OFX/CSV)
  const [movTipo, setMovTipo] = useState<'receita' | 'despesa'>('receita');
  const [movDesc, setMovDesc] = useState('');
  const [movValorStr, setMovValorStr] = useState('');
  const [movData, setMovData] = useState(today);
  const [entradasIniciais, setEntradasIniciais] = useState<OnboardingInitialEntry[]>([]);
  const [importFeedback, setImportFeedback] = useState('');

  // Passo 4: Metas mensais & Site conectado
  const [metaFatStr, setMetaFatStr] = useState(
    (dataset.meta.faturamentoCents / 100).toFixed(2).replace('.', ','),
  );
  const [metaLucroStr, setMetaLucroStr] = useState(
    (dataset.meta.lucroCents / 100).toFixed(2).replace('.', ','),
  );
  const [limiteDespStr, setLimiteDespStr] = useState(
    (dataset.meta.limiteDespesaCents / 100).toFixed(2).replace('.', ','),
  );
  const [siteSlug, setSiteSlug] = useState(
    dataset.empresa.siteSlug ||
      dataset.empresa.nomeFantasia
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      'minha-loja',
  );
  const [siteHeadline, setSiteHeadline] = useState(
    dataset.empresa.siteHeadline ||
      `Solicite seu orçamento direto com ${dataset.empresa.nomeFantasia}`,
  );
  const [siteWhatsapp, setSiteWhatsapp] = useState(dataset.empresa.siteWhatsapp || '');
  const [copiedLink, setCopiedLink] = useState(false);

  const segmentCategorias = useMemo(() => createSegmentPreset(segmento).categorias, [segmento]);

  const saldoTotalCents =
    parseBRLInputToCents(saldoStr) + (contaSecNome.trim() ? parseBRLInputToCents(saldoSecStr) : 0);

  const normalizedSlug =
    siteSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'minha-loja';

  const sitePreviewUrl = `${
    typeof window !== 'undefined' ? window.location.origin : ''
  }/?site=${normalizedSlug}`;

  const handleAddInitialMovement = () => {
    const val = parseBRLInputToCents(movValorStr);
    if (!movDesc.trim() || val <= 0) return;
    setEntradasIniciais((prev) => [
      ...prev,
      {
        tipo: movTipo,
        descricao: movDesc.trim(),
        valorCents: val,
        dataISO: movData || today,
      },
    ]);
    setMovDesc('');
    setMovValorStr('');
    setImportFeedback('');
  };

  const handleUploadStatement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseBankStatement(content, file.name).slice(0, 25);
      if (parsed.length === 0) {
        setImportFeedback('Nenhuma movimentação encontrada no arquivo. Confira o formato OFX ou CSV.');
        return;
      }
      setEntradasIniciais((prev) => [
        ...prev,
        ...parsed.map((p) => ({
          tipo: p.tipo,
          descricao: p.descricao,
          valorCents: p.valorCents,
          dataISO: p.dataISO,
        })),
      ]);
      setImportFeedback(`${parsed.length} movimentação(ões) carregada(s) do extrato ${file.name}.`);
    };
    reader.readAsText(file);
  };

  const finishOnboarding = () => {
    // Inclui rascunho preenchido no passo 3 caso o usuário não tenha clicado em "+ Adicionar"
    const draftVal = parseBRLInputToCents(movValorStr);
    const finalEntries =
      movDesc.trim() && draftVal > 0
        ? [
            ...entradasIniciais,
            {
              tipo: movTipo,
              descricao: movDesc.trim(),
              valorCents: draftVal,
              dataISO: movData || today,
            },
          ]
        : entradasIniciais;

    onComplete({
      nomeFantasia: nomeFantasia.trim() || dataset.empresa.nomeFantasia,
      documento: documento.trim() || 'Não informado',
      regimeTributario,
      segmento,
      contaPrincipalNome: contaNome.trim() || 'Conta Principal PJ',
      saldoPrincipalCents: parseBRLInputToCents(saldoStr),
      contaSecundariaNome: contaSecNome.trim() || undefined,
      saldoSecundarioCents: parseBRLInputToCents(saldoSecStr),
      metaFaturamentoCents: parseBRLInputToCents(metaFatStr) || dataset.meta.faturamentoCents,
      metaLucroCents: parseBRLInputToCents(metaLucroStr) || dataset.meta.lucroCents,
      limiteDespesaCents: parseBRLInputToCents(limiteDespStr) || dataset.meta.limiteDespesaCents,
      siteSlug: normalizedSlug,
      siteHeadline: siteHeadline.trim() || `Solicite seu orçamento direto com ${nomeFantasia}`,
      siteWhatsapp: siteWhatsapp.trim(),
      entradasIniciais: finalEntries,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              OnboardWizard LORDES — Configure sua loja em minutos
            </h2>
            <p className="text-xs text-slate-500 font-mono-num">
              Passo {step} de {STEPS.length} · Ambiente isolado ({dataset.empresa.id})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper visual clicável */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-5 gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const active = s.id === step;
            const done = s.id < step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#1E40AF] text-white'
                    : done
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] font-semibold truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo rolável */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  1. Identidade da empresa e plano de contas por segmento
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  O segmento aplica automaticamente as categorias financeiras certas para o seu tipo de negócio.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nome fantasia</label>
                  <input
                    type="text"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    CNPJ ou CPF (opcional)
                  </label>
                  <input
                    type="text"
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Regime tributário</label>
                  <select
                    value={regimeTributario}
                    onChange={(e) => setRegimeTributario(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="MEI">MEI</option>
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Autônomo / CPF">Autônomo / CPF</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Segmento</label>
                  <select
                    value={segmento}
                    onChange={(e) => setSegmento(e.target.value as SegmentKey)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {SEGMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-slate-800">
                  Categorias incluídas para este segmento ({segmentCategorias.length}):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                  {segmentCategorias.map((c) => (
                    <div key={c.id} className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          c.tipo === 'receita' ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                      <span className="truncate">{c.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  2. Contas financeiras e saldo inicial real
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Informe o saldo de hoje no banco e no caixa interno para o cálculo do saldo projetado de 30 dias.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-900">Conta Principal (Banco / Pix)</div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Nome da conta</label>
                    <input
                      type="text"
                      value={contaNome}
                      onChange={(e) => setContaNome(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Saldo hoje (R$)</label>
                    <input
                      type="text"
                      value={saldoStr}
                      onChange={(e) => setSaldoStr(e.target.value)}
                      className="w-full px-3 py-2 text-base font-bold font-mono-num border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-900">Caixa Interno / Carteira</div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Nome (opcional)
                    </label>
                    <input
                      type="text"
                      value={contaSecNome}
                      onChange={(e) => setContaSecNome(e.target.value)}
                      placeholder="Ex: Caixa Loja"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Saldo hoje (R$)</label>
                    <input
                      type="text"
                      value={saldoSecStr}
                      onChange={(e) => setSaldoSecStr(e.target.value)}
                      className="w-full px-3 py-2 text-base font-bold font-mono-num border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Saldo total inicial consolidado:</span>
                <span className="font-mono-num font-bold text-sm text-slate-900">
                  {formatBRL(saldoTotalCents)}
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    3. Últimas movimentações ou extrato OFX/CSV
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Lance até 5 movimentações recentes ou importe seu extrato bancário para já abrir o painel preenchido.
                  </p>
                </div>

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E40AF] bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer shrink-0">
                  <FileUp className="w-3.5 h-3.5" />
                  Importar OFX/CSV
                  <input
                    type="file"
                    accept=".ofx,.csv,.txt"
                    onChange={handleUploadStatement}
                    className="hidden"
                  />
                </label>
              </div>

              {importFeedback && (
                <div className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  {importFeedback}
                </div>
              )}

              <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovTipo('receita')}
                    className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                      movTipo === 'receita'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Venda / Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovTipo('despesa')}
                    className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                      movTipo === 'despesa'
                        ? 'border-rose-700 bg-rose-50 text-rose-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Despesa / Saída
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <input
                    type="text"
                    value={movDesc}
                    onChange={(e) => setMovDesc(e.target.value)}
                    placeholder="Descrição (ex: Venda Pix ou Aluguel)"
                    className="sm:col-span-5 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={movValorStr}
                    onChange={(e) => setMovValorStr(e.target.value)}
                    placeholder="Valor R$"
                    className="sm:col-span-3 px-3 py-2 text-xs font-mono-num border border-slate-300 rounded-lg"
                  />
                  <input
                    type="date"
                    value={movData}
                    onChange={(e) => setMovData(e.target.value)}
                    className="sm:col-span-2 px-2 py-2 text-xs font-mono-num border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddInitialMovement}
                    className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Incluir
                  </button>
                </div>
              </div>

              {entradasIniciais.length > 0 && (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {entradasIniciais.map((item, idx) => (
                    <div
                      key={`${item.descricao}-${idx}`}
                      className="px-3.5 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 truncate block">
                          {item.descricao}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono-num">
                          {item.dataISO.split('-').reverse().join('/')} ·{' '}
                          {item.tipo === 'receita' ? 'Entrada' : 'Saída'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`font-mono-num font-bold ${
                            item.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {item.tipo === 'receita' ? '+' : '-'}
                          {formatBRL(item.valorCents)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEntradasIniciais((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Remover"
                          className="text-slate-400 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    4. Metas do mês e ligação direta com o site da loja
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Defina quanto quer faturar e lucrar este mês, além do link exclusivo para captar orçamentos direto neste painel.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Meta de faturamento (R$)
                    </label>
                    <input
                      type="text"
                      value={metaFatStr}
                      onChange={(e) => setMetaFatStr(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Meta de lucro (R$)
                    </label>
                    <input
                      type="text"
                      value={metaLucroStr}
                      onChange={(e) => setMetaLucroStr(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Teto de despesas (R$)
                    </label>
                    <input
                      type="text"
                      value={limiteDespStr}
                      onChange={(e) => setLimiteDespStr(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Globe className="w-4 h-4 text-[#1E40AF]" />
                  Link exclusivo do site conectado a esta empresa
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Identificador do site (slug)
                    </label>
                    <input
                      type="text"
                      value={siteSlug}
                      onChange={(e) => setSiteSlug(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-num border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      WhatsApp comercial (opcional)
                    </label>
                    <input
                      type="text"
                      value={siteWhatsapp}
                      onChange={(e) => setSiteWhatsapp(e.target.value)}
                      placeholder="(11) 99999-0000"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Chamada principal da página de orçamento
                    </label>
                    <input
                      type="text"
                      value={siteHeadline}
                      onChange={(e) => setSiteHeadline(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div className="text-[11px] font-mono-num text-slate-500 truncate">
                  URL: {sitePreviewUrl}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 py-1">
              <div className="inline-flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Tudo configurado e isolado para {nomeFantasia}!
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-slate-700">
                  <div className="font-bold text-slate-900">Financeiro</div>
                  <div>
                    <strong>Segmento:</strong>{' '}
                    {getSegmentLabel(segmento)}
                  </div>
                  <div>
                    <strong>Saldo inicial total:</strong>{' '}
                    <span className="font-mono-num font-semibold">{formatBRL(saldoTotalCents)}</span>
                  </div>
                  <div>
                    <strong>Movimentações prontas:</strong>{' '}
                    <span className="font-mono-num font-semibold">{entradasIniciais.length}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-slate-700">
                  <div className="font-bold text-slate-900">Metas &amp; Site Conectado</div>
                  <div>
                    <strong>Meta de vendas:</strong>{' '}
                    <span className="font-mono-num font-semibold">
                      {formatBRL(parseBRLInputToCents(metaFatStr))}
                    </span>
                  </div>
                  <div>
                    <strong>Meta de lucro:</strong>{' '}
                    <span className="font-mono-num font-semibold">
                      {formatBRL(parseBRLInputToCents(metaLucroStr))}
                    </span>
                  </div>
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="font-mono-num text-[11px] text-slate-500 truncate">
                      ?site={normalizedSlug}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(sitePreviewUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E40AF] shrink-0 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedLink ? 'Copiado!' : 'Copiar link'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de navegação */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            {step > 1 ? 'Voltar' : 'Configurar depois'}
          </button>

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg cursor-pointer"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              onClick={finishOnboarding}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              Concluir e abrir Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
