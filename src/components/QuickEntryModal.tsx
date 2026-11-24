import React, { useState } from 'react';
import { Paperclip, Repeat, ArrowLeftRight, X, Zap } from 'lucide-react';
import {
  Categoria,
  CentroCusto,
  ContaFinanceira,
  Lancamento,
  MarketingOrigin,
  PaymentMethod,
  Pessoa,
  ProdutoServico,
  TransactionStatus,
  TransactionType,
} from '../types/finance';
import { addDaysISO, formatBRL, getTodayISO, parseBRLInputToCents } from '../utils/formatters';

interface QuickEntryModalProps {
  mode: 'quick' | 'full';
  initialEdit?: Lancamento | null;
  empresaId: string;
  contas: ContaFinanceira[];
  categorias: Categoria[];
  centrosCusto: CentroCusto[];
  produtos: ProdutoServico[];
  pessoas: Pessoa[];
  accentColor: string;
  onClose: () => void;
  onSaveEntries: (entries: Omit<Lancamento, 'id' | 'criadoEm'>[], editId?: string) => void;
}

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({
  mode: initialMode,
  initialEdit,
  empresaId,
  contas,
  categorias,
  centrosCusto,
  produtos,
  pessoas,
  accentColor,
  onClose,
  onSaveEntries,
}) => {
  const today = getTodayISO();
  const [mode, setMode] = useState<'quick' | 'full'>(initialEdit ? 'full' : initialMode);
  const [tipo, setTipo] = useState<TransactionType>(initialEdit?.tipo ?? 'receita');
  const [valorStr, setValorStr] = useState(
    initialEdit ? (initialEdit.valorCents / 100).toFixed(2).replace('.', ',') : '',
  );
  const [categoriaId, setCategoriaId] = useState(
    initialEdit?.categoriaId ||
      categorias.find((c) => c.tipo === (initialEdit?.tipo === 'despesa' ? 'despesa' : 'receita'))?.id ||
      '',
  );
  const [centroCustoId, setCentroCustoId] = useState(initialEdit?.centroCustoId || '');
  const [produtoId, setProdutoId] = useState(initialEdit?.produtoId || '');
  const [contaId, setContaId] = useState(initialEdit?.contaId || contas[0]?.id || '');
  const [contaDestinoId, setContaDestinoId] = useState(
    initialEdit?.contaDestinoId || contas[1]?.id || contas[0]?.id || '',
  );
  const [pessoaId, setPessoaId] = useState(initialEdit?.pessoaId || '');
  const [dataCompetencia, setDataCompetencia] = useState(initialEdit?.dataCompetencia || today);
  const [dataVencimento, setDataVencimento] = useState(initialEdit?.dataVencimento || today);
  const [status, setStatus] = useState<TransactionStatus>(initialEdit?.status || 'pago');
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>(
    initialEdit?.formaPagamento || 'Pix',
  );
  const [origem, setOrigem] = useState<MarketingOrigin>(initialEdit?.origem || 'Balcão / Direto');
  const [descricao, setDescricao] = useState(initialEdit?.descricao || '');
  const [observacao, setObservacao] = useState(initialEdit?.observacao || '');
  const [anexoNome, setAnexoNome] = useState(initialEdit?.anexoNome || '');
  const [anexoDataUrl, setAnexoDataUrl] = useState(initialEdit?.anexoDataUrl || '');
  const [parcelas, setParcelas] = useState(1);
  const [recorrente, setRecorrente] = useState(initialEdit?.recorrente || false);
  const [frequencia, setFrequencia] = useState<'semanal' | 'mensal' | 'anual'>(
    initialEdit?.frequencia || 'mensal',
  );
  const [error, setError] = useState('');

  const filteredCategorias = categorias.filter((c) =>
    tipo === 'transferencia' ? true : c.tipo === tipo,
  );

  const handleTypeChange = (nextTipo: TransactionType) => {
    setTipo(nextTipo);
    if (nextTipo !== 'transferencia') {
      const firstCat = categorias.find((c) => c.tipo === nextTipo);
      if (firstCat) setCategoriaId(firstCat.id);
    }
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setError('O anexo deve ter no máximo 1,5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      if (
        result.startsWith('data:image/png;base64,') ||
        result.startsWith('data:image/jpeg;base64,') ||
        result.startsWith('data:application/pdf;base64,')
      ) {
        setAnexoNome(file.name);
        setAnexoDataUrl(result);
        setError('');
      } else {
        setError('Formato de anexo permitido: PNG, JPG ou PDF.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const totalCents = parseBRLInputToCents(valorStr);
    if (totalCents <= 0) {
      setError('Digite um valor maior que R$ 0,00.');
      return;
    }

    if (tipo === 'transferencia' && contaId === contaDestinoId) {
      setError('Escolha uma conta de destino diferente da conta de origem.');
      return;
    }

    const catObj = categorias.find((c) => c.id === categoriaId);
    const finalDesc =
      descricao.trim() ||
      (tipo === 'transferencia'
        ? 'Transferência entre contas'
        : catObj?.nome || (tipo === 'receita' ? 'Receita rápida' : 'Despesa rápida'));

    if (initialEdit) {
      onSaveEntries(
        [
          {
            empresaId,
            tipo,
            valorCents: totalCents,
            valorPagoCents: status === 'pago' ? totalCents : undefined,
            dataCompetencia,
            dataVencimento,
            dataPagamento: status === 'pago' ? dataVencimento : undefined,
            status,
            categoriaId: categoriaId || filteredCategorias[0]?.id || '',
            centroCustoId: centroCustoId || undefined,
            produtoId: tipo === 'receita' && produtoId ? produtoId : undefined,
            contaId,
            contaDestinoId: tipo === 'transferencia' ? contaDestinoId : undefined,
            pessoaId: pessoaId || undefined,
            formaPagamento,
            descricao: finalDesc,
            observacao: observacao.trim() || undefined,
            anexoNome: anexoNome || undefined,
            anexoDataUrl: anexoDataUrl || undefined,
            origem: tipo === 'receita' ? origem : undefined,
            recorrente,
            frequencia: recorrente ? frequencia : undefined,
            criadoPor: 'Usuário Painel',
          },
        ],
        initialEdit.id,
      );
      return;
    }

    const numParcelas = mode === 'full' && tipo !== 'transferencia' ? Math.max(1, Math.min(12, parcelas)) : 1;
    const baseParcela = Math.floor(totalCents / numParcelas);
    const resto = totalCents - baseParcela * numParcelas;

    const entries: Omit<Lancamento, 'id' | 'criadoEm'>[] = [];
    for (let i = 0; i < numParcelas; i++) {
      const parcelaCents = i === 0 ? baseParcela + resto : baseParcela;
      const venc = i === 0 ? dataVencimento : addDaysISO(dataVencimento, i * 30);
      const isPaid = i === 0 && status === 'pago';
      entries.push({
        empresaId,
        tipo,
        valorCents: parcelaCents,
        valorPagoCents: isPaid ? parcelaCents : undefined,
        dataCompetencia: i === 0 ? dataCompetencia : venc,
        dataVencimento: venc,
        dataPagamento: isPaid ? venc : undefined,
        status: isPaid ? 'pago' : i === 0 ? status : 'previsto',
        categoriaId: categoriaId || filteredCategorias[0]?.id || '',
        centroCustoId: centroCustoId || undefined,
        produtoId: tipo === 'receita' && produtoId ? produtoId : undefined,
        contaId,
        contaDestinoId: tipo === 'transferencia' ? contaDestinoId : undefined,
        pessoaId: pessoaId || undefined,
        formaPagamento,
        descricao: numParcelas > 1 ? `${finalDesc} (${i + 1}/${numParcelas})` : finalDesc,
        observacao: observacao.trim() || undefined,
        anexoNome: anexoNome || undefined,
        anexoDataUrl: anexoDataUrl || undefined,
        origem: tipo === 'receita' ? origem : undefined,
        recorrente: mode === 'full' ? recorrente : false,
        frequencia: mode === 'full' && recorrente ? frequencia : undefined,
        parcelaNumero: numParcelas > 1 ? i + 1 : undefined,
        parcelaTotal: numParcelas > 1 ? numParcelas : undefined,
        criadoPor: 'Usuário Painel',
      });
    }

    onSaveEntries(entries);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {mode === 'quick' ? <Zap className="w-4 h-4 text-amber-600" /> : null}
            <h2 className="font-display text-base font-bold text-slate-900">
              {initialEdit
                ? 'Editar lançamento'
                : mode === 'quick'
                  ? 'Lançamento rápido (3 toques)'
                  : 'Novo lançamento completo'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!initialEdit && (
              <button
                type="button"
                onClick={() => setMode((m) => (m === 'quick' ? 'full' : 'quick'))}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md bg-slate-100 cursor-pointer"
              >
                {mode === 'quick' ? 'Modo completo' : 'Modo 3 toques'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => handleTypeChange('receita')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                tipo === 'receita' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Receita (Entrada)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('despesa')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                tipo === 'despesa' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Despesa (Saída)
            </button>
            {mode === 'full' && (
              <button
                type="button"
                onClick={() => handleTypeChange('transferencia')}
                className={`py-2 text-xs font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-1 cursor-pointer ${
                  tipo === 'transferencia' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Transferência
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              1. Valor em R$
            </label>
            <input
              type="text"
              autoFocus
              value={valorStr}
              onChange={(e) => setValorStr(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-3 text-2xl font-bold font-mono-num border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>

          {tipo !== 'transferencia' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                2. Categoria
              </label>
              {mode === 'quick' ? (
                <div className="grid grid-cols-2 gap-2">
                  {filteredCategorias.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoriaId(cat.id)}
                      className={`text-left px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors truncate cursor-pointer ${
                        categoriaId === cat.id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {cat.nome}
                    </button>
                  ))}
                </div>
              ) : (
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {filteredCategorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome} ({cat.natureza === 'fixa' ? 'Fixa' : 'Variável'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {mode === 'quick' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Descrição curta (opcional)
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Venda balcão / Material"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Conta</label>
                <select
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {mode === 'full' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Medição obra, boleto fornecedor..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {tipo === 'transferencia' ? 'Conta de origem' : 'Conta financeira'}
                  </label>
                  <select
                    value={contaId}
                    onChange={(e) => setContaId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {tipo === 'transferencia' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Conta de destino
                    </label>
                    <select
                      value={contaDestinoId}
                      onChange={(e) => setContaDestinoId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Cliente / Fornecedor
                    </label>
                    <select
                      value={pessoaId}
                      onChange={(e) => setPessoaId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Não informado</option>
                      {pessoas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.tipo})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {tipo !== 'transferencia' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Centro de custo / Unidade
                    </label>
                    <select
                      value={centroCustoId}
                      onChange={(e) => setCentroCustoId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Geral</option>
                      {centrosCusto.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  {tipo === 'receita' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Produto / Serviço
                      </label>
                      <select
                        value={produtoId}
                        onChange={(e) => setProdutoId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">Nenhum</option>
                        {produtos.map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            {pr.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Competência</label>
                  <input
                    type="date"
                    value={dataCompetencia}
                    onChange={(e) => setDataCompetencia(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono-num border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono-num border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Situação</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="pago">{tipo === 'receita' ? 'Recebido' : 'Pago'}</option>
                    <option value="previsto">Previsto</option>
                    <option value="atrasado">Atrasado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Forma de pagamento
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option>Pix</option>
                    <option>Cartão de Crédito</option>
                    <option>Cartão de Débito</option>
                    <option>Boleto</option>
                    <option>Transferência</option>
                    <option>Dinheiro</option>
                  </select>
                </div>

                {tipo === 'receita' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Origem da venda
                    </label>
                    <select
                      value={origem}
                      onChange={(e) => setOrigem(e.target.value as MarketingOrigin)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Site LORDES">Site LORDES</option>
                      <option value="Google">Google</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Balcão / Direto">Balcão / Direto</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Parcelas
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      disabled={!!initialEdit}
                      value={parcelas}
                      onChange={(e) => setParcelas(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {tipo === 'receita' && !initialEdit && (
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Parcelas (gera parcelas individuais)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={parcelas}
                      onChange={(e) => setParcelas(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="pt-4">
                    <span className="text-xs text-slate-500 font-mono-num">
                      {parcelas > 1 && parseBRLInputToCents(valorStr) > 0
                        ? `${parcelas}x de ${formatBRL(Math.round(parseBRLInputToCents(valorStr) / parcelas))}`
                        : 'Pagamento à vista'}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Observação (opcional)
                  </label>
                  <input
                    type="text"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Detalhes internos"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Anexo / Comprovante (PNG, JPG, PDF)
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 text-xs border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate text-slate-600">
                      {anexoNome || 'Anexar arquivo'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={handleAttachment}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {tipo !== 'transferencia' && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recorrente}
                      onChange={(e) => setRecorrente(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <Repeat className="w-3.5 h-3.5 text-slate-500" />
                    Lançamento recorrente
                  </label>
                  {recorrente && (
                    <select
                      value={frequencia}
                      onChange={(e) => setFrequencia(e.target.value as 'semanal' | 'mensal' | 'anual')}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white"
                    >
                      <option value="semanal">Semanal</option>
                      <option value="mensal">Mensal</option>
                      <option value="anual">Anual</option>
                    </select>
                  )}
                </div>
              )}
            </>
          )}

          {error && <p className="text-xs font-medium text-rose-700">{error}</p>}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ backgroundColor: accentColor }}
              className="px-5 py-2.5 text-xs font-semibold text-white rounded-lg hover:opacity-95 transition-opacity cursor-pointer"
            >
              {initialEdit ? 'Salvar alterações' : '3. Salvar lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
