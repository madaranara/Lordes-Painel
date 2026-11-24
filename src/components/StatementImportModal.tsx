import React, { useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { Categoria, ContaFinanceira, Lancamento } from '../types/finance';
import { formatBRL, formatDateBR, getTodayISO } from '../utils/formatters';
import { parseBankStatement, ParsedStatementRow } from '../utils/statementParser';

interface StatementImportModalProps {
  empresaId: string;
  contas: ContaFinanceira[];
  categorias: Categoria[];
  accentColor: string;
  onClose: () => void;
  onImportRows: (entries: Omit<Lancamento, 'id' | 'criadoEm'>[]) => void;
}

interface ReviewRow extends ParsedStatementRow {
  selected: boolean;
  categoriaId: string;
}

const SAMPLE_OFX = `<OFX>
<BANKMSGSRSV1>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261120
<TRNAMT>3450.00
<FITID>1001
<MEMO>PIX RECEBIDO CLIENTE REFORMA
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261121
<TRNAMT>-890.50
<FITID>1002
<MEMO>BOLETO FORNECEDOR MATERIAIS
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261122
<TRNAMT>-195.00
<FITID>1003
<MEMO>PAGAMENTO ANUNCIOS GOOGLE
</STMTTRN>
</BANKMSGSRSV1>
</OFX>`;

export const StatementImportModal: React.FC<StatementImportModalProps> = ({
  empresaId,
  contas,
  categorias,
  accentColor,
  onClose,
  onImportRows,
}) => {
  const [contaId, setContaId] = useState(contas[0]?.id || '');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const defaultCatFor = (tipo: 'receita' | 'despesa') =>
    categorias.find((c) => c.tipo === tipo)?.id || categorias[0]?.id || '';

  const loadContent = (text: string, name: string) => {
    setError('');
    const parsed = parseBankStatement(text, name);
    if (parsed.length === 0) {
      setError('Nenhuma movimentação encontrada no arquivo. Use OFX ou CSV (Data;Descrição;Valor).');
      return;
    }
    setFileName(name);
    setRows(
      parsed.map((r) => ({
        ...r,
        selected: true,
        categoriaId: defaultCatFor(r.tipo),
      })),
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadContent(String(reader.result || ''), file.name);
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    const chosen = rows.filter((r) => r.selected);
    if (chosen.length === 0) return;

    const today = getTodayISO();
    const entries: Omit<Lancamento, 'id' | 'criadoEm'>[] = chosen.map((r) => ({
      empresaId,
      tipo: r.tipo,
      valorCents: r.valorCents,
      valorPagoCents: r.valorCents,
      dataCompetencia: r.dataISO || today,
      dataVencimento: r.dataISO || today,
      dataPagamento: r.dataISO || today,
      status: 'pago',
      categoriaId: r.categoriaId,
      contaId,
      formaPagamento: 'Transferência',
      descricao: r.descricao,
      origem: r.tipo === 'receita' ? 'Balcão / Direto' : undefined,
      criadoPor: 'Conciliação OFX/CSV',
    }));

    onImportRows(entries);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileUp className="w-4 h-4 text-[#1E40AF]" />
            <h2 className="font-display text-base font-bold text-slate-900">
              Importar extrato bancário (OFX / CSV)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Conta bancária de destino
              </label>
              <select
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1 text-center px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
                Escolher arquivo OFX / CSV
                <input
                  type="file"
                  accept=".ofx,.csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => loadContent(SAMPLE_OFX, 'extrato-exemplo.ofx')}
                className="px-3 py-2 text-xs font-semibold text-[#1E40AF] bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer whitespace-nowrap"
              >
                Usar OFX exemplo
              </button>
            </div>
          </div>

          {error && <p className="text-xs font-medium text-rose-700">{error}</p>}

          {rows.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 flex justify-between">
                <span>Arquivo: {fileName}</span>
                <span className="font-mono-num">
                  {rows.filter((r) => r.selected).length} de {rows.length} selecionado(s)
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {rows.map((r) => (
                  <div key={r.id} className="p-3 flex flex-wrap sm:flex-nowrap items-center gap-3 text-xs">
                    <input
                      type="checkbox"
                      checked={r.selected}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, selected: e.target.checked } : x)),
                        )
                      }
                      className="rounded border-slate-300"
                    />
                    <span className="font-mono-num text-slate-500 w-20 shrink-0">
                      {formatDateBR(r.dataISO)}
                    </span>
                    <span className="flex-1 min-w-[140px] font-medium text-slate-900 truncate">
                      {r.descricao}
                    </span>
                    <select
                      value={r.categoriaId}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, categoriaId: e.target.value } : x)),
                        )
                      }
                      className="px-2 py-1 text-xs border border-slate-200 rounded bg-white max-w-[160px]"
                    >
                      {categorias
                        .filter((c) => c.tipo === r.tipo)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                    </select>
                    <span
                      className={`font-mono-num font-semibold w-24 text-right shrink-0 ${
                        r.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {r.tipo === 'receita' ? '+' : '-'}
                      {formatBRL(r.valorCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={rows.filter((r) => r.selected).length === 0}
            onClick={handleConfirm}
            style={{ backgroundColor: accentColor }}
            className="px-5 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-40 cursor-pointer"
          >
            Conciliar e importar ({rows.filter((r) => r.selected).length})
          </button>
        </div>
      </div>
    </div>
  );
};
