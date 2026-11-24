import { TransactionType } from '../types/finance';
import { getTodayISO } from './formatters';

export interface ParsedStatementRow {
  id: string;
  dataISO: string;
  descricao: string;
  tipo: 'receita' | 'despesa';
  valorCents: number;
  fitId?: string;
}

function normalizeOFXDate(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return getTodayISO();
}

function normalizeCSVDate(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const br = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return getTodayISO();
}

function parseAmountToSignedCents(raw: string): number {
  let s = raw.trim().replace(/[R$\s]/g, '');
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function parseBankStatement(content: string, fileName: string): ParsedStatementRow[] {
  const lower = fileName.toLowerCase();
  const looksLikeOFX = lower.endsWith('.ofx') || content.includes('<STMTTRN>') || content.includes('<OFX>');

  if (looksLikeOFX) {
    const blocks = content.split(/<STMTTRN>/i).slice(1);
    const rows: ParsedStatementRow[] = [];
    blocks.forEach((block, idx) => {
      const endSplit = block.split(/<\/STMTTRN>/i)[0] || block;
      const getTag = (tag: string) => {
        const m = endSplit.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'));
        return m ? m[1].trim() : '';
      };
      const signedCents = parseAmountToSignedCents(getTag('TRNAMT'));
      if (signedCents === 0) return;
      const dt = normalizeOFXDate(getTag('DTPOSTED'));
      const memo = getTag('MEMO') || getTag('NAME') || 'Lançamento extrato OFX';
      const fitId = getTag('FITID') || undefined;
      const tipo: Extract<TransactionType, 'receita' | 'despesa'> = signedCents >= 0 ? 'receita' : 'despesa';
      rows.push({
        id: `ofx-${idx}-${Date.now()}`,
        dataISO: dt,
        descricao: memo,
        tipo,
        valorCents: Math.abs(signedCents),
        fitId,
      });
    });
    return rows;
  }

  // CSV parser (; or , separated, skips header row)
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const sep = lines[0].includes(';') ? ';' : ',';
  const rows: ParsedStatementRow[] = [];

  lines.forEach((line, idx) => {
    const cols = line.split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 3) return;
    // Skip header line if first column isn't a date
    if (idx === 0 && !/\d{2,4}[-/]\d{2}[-/]\d{2,4}/.test(cols[0])) return;

    const dataISO = normalizeCSVDate(cols[0]);
    const descricao = cols[1] || 'Movimento CSV';
    const signedCents = parseAmountToSignedCents(cols[2]);
    if (signedCents === 0) return;

    rows.push({
      id: `csv-${idx}-${Date.now()}`,
      dataISO,
      descricao,
      tipo: signedCents >= 0 ? 'receita' : 'despesa',
      valorCents: Math.abs(signedCents),
    });
  });

  return rows;
}
