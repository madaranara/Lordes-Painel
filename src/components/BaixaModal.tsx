import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ContaFinanceira, Lancamento } from '../types/finance';
import {
  daysBetweenISO,
  formatBRL,
  getTodayISO,
  parseBRLInputToCents,
} from '../utils/formatters';

interface BaixaModalProps {
  lancamento: Lancamento;
  contas: ContaFinanceira[];
  accentColor: string;
  onClose: () => void;
  onConfirmBaixa: (
    id: string,
    contaId: string,
    dataPagamento: string,
    valorPagoCents: number,
    jurosMultaCents: number,
    baixaParcial: boolean,
  ) => void;
}

export const BaixaModal: React.FC<BaixaModalProps> = ({
  lancamento,
  contas,
  accentColor,
  onClose,
  onConfirmBaixa,
}) => {
  const today = getTodayISO();
  const restanteCents = Math.max(0, lancamento.valorCents - (lancamento.valorPagoCents ?? 0));
  const diasAtraso = Math.max(0, daysBetweenISO(lancamento.dataVencimento, today));
  const isReceberAtrasado = lancamento.tipo === 'receita' && diasAtraso > 0;

  const [contaId, setContaId] = useState(lancamento.contaId || contas[0]?.id || '');
  const [dataPagamento, setDataPagamento] = useState(today);
  const [valorStr, setValorStr] = useState((restanteCents / 100).toFixed(2).replace('.', ','));
  const [aplicarJuros, setAplicarJuros] = useState(false);

  // Multa 2% + Juros 0,033%/dia (1% ao mês) conforme prática padrão brasileira
  const jurosSugeridoCents = isReceberAtrasado
    ? Math.round(restanteCents * (0.02 + diasAtraso * 0.00033))
    : 0;
  const jurosCents = aplicarJuros ? jurosSugeridoCents : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pagoNowCents = parseBRLInputToCents(valorStr);
    if (pagoNowCents <= 0) return;

    const totalPagoAcumulado = (lancamento.valorPagoCents ?? 0) + pagoNowCents;
    const baixaParcial = totalPagoAcumulado < lancamento.valorCents;

    onConfirmBaixa(
      lancamento.id,
      contaId,
      dataPagamento,
      totalPagoAcumulado,
      (lancamento.jurosMultaCents ?? 0) + jurosCents,
      baixaParcial,
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-slate-900">
            {lancamento.tipo === 'receita' ? 'Confirmar recebimento' : 'Confirmar pagamento'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
            <div className="font-semibold text-slate-900">{lancamento.descricao}</div>
            <div className="text-slate-600 font-mono-num">
              Saldo em aberto: {formatBRL(restanteCents)}
              {diasAtraso > 0 ? ` · ${diasAtraso} dia(s) de atraso` : ''}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Conta de baixa</label>
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
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data</label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Valor recebido/pago (altere para baixa parcial)
            </label>
            <input
              type="text"
              value={valorStr}
              onChange={(e) => setValorStr(e.target.value)}
              className="w-full px-3 py-2 text-lg font-bold font-mono-num border border-slate-300 rounded-lg"
            />
          </div>

          {isReceberAtrasado && jurosSugeridoCents > 0 && (
            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-xs text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={aplicarJuros}
                onChange={(e) => setAplicarJuros(e.target.checked)}
                className="mt-0.5 rounded border-amber-400"
              />
              <span>
                Incluir multa (2%) + juros ({diasAtraso}d):{' '}
                <strong className="font-mono-num">+{formatBRL(jurosSugeridoCents)}</strong>
              </span>
            </label>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ backgroundColor: accentColor }}
              className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
            >
              Confirmar baixa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
