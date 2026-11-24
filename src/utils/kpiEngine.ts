import {
  CustomPeriodRange,
  Lancamento,
  MarketingOrigin,
  PeriodFilter,
  TenantDataset,
} from '../types/finance';
import { addDaysISO, daysBetweenISO, formatBRL, getMonthKey, getTodayISO } from './formatters';

export interface SemaforoResult {
  cor: 'verde' | 'amarelo' | 'vermelho';
  label: 'Saudável' | 'Atenção' | 'Crítico';
  mensagem: string;
}

export interface AlertaInteligente {
  id: string;
  nivel: 'critico' | 'atencao' | 'info';
  titulo: string;
  descricao: string;
}

export interface DashboardMetrics {
  faturamentoCents: number;
  despesasCents: number;
  resultadoCents: number;
  margemLiquidaPct: number;
  saldoAtualCents: number;
  aReceber30dCents: number;
  aPagar30dCents: number;
  saldoProjetado30dCents: number;

  faturamentoDeltaPct: number;
  despesasDeltaPct: number;
  resultadoDeltaPct: number;

  custosFixosMensaisCents: number;
  custosVariaveisCents: number;
  margemContribuicaoPct: number;
  pontoEquilibrioCents: number;
  runwayMeses: number;
  inadimplenciaPct: number;
  prazoMedioRecebimentoDias: number;
  prazoMedioPagamentoDias: number;
  variacaoMesAMesPct: number;

  ticketMedioCents: number;
  numVendas: number;
  gastoMarketingCents: number;
  cacCents: number;
  retornoMarketingX: number;
  receitaRecorrenteCents: number;
  receitaAvulsaCents: number;

  semaforo: SemaforoResult;
  alertas: AlertaInteligente[];

  despesasPorCategoria: { nome: string; valorCents: number; pct: number }[];
  receitasPorOrigem: { origem: string; valorCents: number; pct: number }[];
  receitasPorProduto: { nome: string; valorCents: number; margemPct: number; qtd: number }[];
  topClientes: { nome: string; valorCents: number; qtd: number }[];
  saldosPorConta: { id: string; nome: string; tipo: string; saldoCents: number }[];
}

export function getPeriodBounds(
  filter: PeriodFilter,
  todayISO = getTodayISO(),
  customRange?: CustomPeriodRange,
): {
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
  label: string;
} {
  const [y, m] = todayISO.split('-').map(Number);

  if (filter === 'personalizado' && customRange?.start && customRange?.end) {
    const start = customRange.start <= customRange.end ? customRange.start : customRange.end;
    const end = customRange.end >= customRange.start ? customRange.end : customRange.start;
    const spanDays = Math.max(1, daysBetweenISO(start, end) + 1);
    return {
      start,
      end,
      prevStart: addDaysISO(start, -spanDays),
      prevEnd: addDaysISO(start, -1),
      label: 'Personalizado',
    };
  }

  if (filter === 'hoje') {
    const prev = addDaysISO(todayISO, -1);
    return { start: todayISO, end: todayISO, prevStart: prev, prevEnd: prev, label: 'Hoje' };
  }
  if (filter === '7d') {
    return {
      start: addDaysISO(todayISO, -6),
      end: todayISO,
      prevStart: addDaysISO(todayISO, -13),
      prevEnd: addDaysISO(todayISO, -7),
      label: 'Últimos 7 dias',
    };
  }
  if (filter === 'mes_anterior') {
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const start = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
    const lastDay = new Date(prevY, prevM, 0).getDate();
    const end = `${prevY}-${String(prevM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const p2M = prevM === 1 ? 12 : prevM - 1;
    const p2Y = prevM === 1 ? prevY - 1 : prevY;
    const p2Last = new Date(p2Y, p2M, 0).getDate();
    return {
      start,
      end,
      prevStart: `${p2Y}-${String(p2M).padStart(2, '0')}-01`,
      prevEnd: `${p2Y}-${String(p2M).padStart(2, '0')}-${String(p2Last).padStart(2, '0')}`,
      label: 'Mês anterior',
    };
  }
  if (filter === 'trimestre') {
    const start = addDaysISO(todayISO, -89);
    return {
      start,
      end: todayISO,
      prevStart: addDaysISO(todayISO, -179),
      prevEnd: addDaysISO(todayISO, -90),
      label: 'Últimos 90 dias',
    };
  }
  if (filter === 'ano') {
    return {
      start: `${y}-01-01`,
      end: todayISO,
      prevStart: `${y - 1}-01-01`,
      prevEnd: `${y - 1}-12-31`,
      label: `Ano ${y}`,
    };
  }

  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  const prevLast = new Date(prevY, prevM, 0).getDate();
  return {
    start,
    end,
    prevStart: `${prevY}-${String(prevM).padStart(2, '0')}-01`,
    prevEnd: `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevLast).padStart(2, '0')}`,
    label: 'Mês atual',
  };
}

function isActive(l: Lancamento): boolean {
  return !l.excluidoEm && l.status !== 'cancelado';
}

function effectiveValue(l: Lancamento): number {
  return (l.valorPagoCents ?? l.valorCents) + (l.jurosMultaCents ?? 0);
}

export function computeDashboardMetrics(
  dataset: TenantDataset,
  period: PeriodFilter,
  todayISO = getTodayISO(),
  customRange?: CustomPeriodRange,
  centroCustoId?: string,
): DashboardMetrics {
  const allActive = dataset.lancamentos.filter(isActive);
  const scopedActive = centroCustoId
    ? allActive.filter((l) => l.centroCustoId === centroCustoId)
    : allActive;

  const bounds = getPeriodBounds(period, todayISO, customRange);
  const next30 = addDaysISO(todayISO, 30);

  const saldosPorConta = dataset.contas
    .filter((c) => c.ativa)
    .map((conta) => {
      let saldo = conta.saldoInicialCents;
      for (const l of allActive) {
        if (l.status !== 'pago') continue;
        const val = effectiveValue(l);
        if (l.tipo === 'receita' && l.contaId === conta.id) saldo += val;
        if (l.tipo === 'despesa' && l.contaId === conta.id) saldo -= val;
        if (l.tipo === 'transferencia') {
          if (l.contaId === conta.id) saldo -= val;
          if (l.contaDestinoId === conta.id) saldo += val;
        }
      }
      return { id: conta.id, nome: conta.nome, tipo: conta.tipo, saldoCents: saldo };
    });

  const saldoAtualCents = saldosPorConta.reduce((acc, c) => acc + c.saldoCents, 0);

  const inPeriod = scopedActive.filter(
    (l) => l.tipo !== 'transferencia' && l.dataCompetencia >= bounds.start && l.dataCompetencia <= bounds.end,
  );
  const inPrev = scopedActive.filter(
    (l) => l.tipo !== 'transferencia' && l.dataCompetencia >= bounds.prevStart && l.dataCompetencia <= bounds.prevEnd,
  );

  const faturamentoCents = inPeriod
    .filter((l) => l.tipo === 'receita')
    .reduce((acc, l) => acc + l.valorCents, 0);

  const despesasCents = inPeriod
    .filter((l) => l.tipo === 'despesa')
    .reduce((acc, l) => acc + l.valorCents, 0);

  const resultadoCents = faturamentoCents - despesasCents;
  const margemLiquidaPct = faturamentoCents > 0 ? (resultadoCents / faturamentoCents) * 100 : 0;

  const prevFat = inPrev.filter((l) => l.tipo === 'receita').reduce((acc, l) => acc + l.valorCents, 0);
  const prevDesp = inPrev.filter((l) => l.tipo === 'despesa').reduce((acc, l) => acc + l.valorCents, 0);
  const prevRes = prevFat - prevDesp;

  const pctDelta = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / Math.abs(prev)) * 100;
  };

  const aReceber30dCents = scopedActive
    .filter(
      (l) =>
        l.tipo === 'receita' &&
        (l.status === 'previsto' || l.status === 'atrasado') &&
        l.dataVencimento <= next30,
    )
    .reduce((acc, l) => acc + Math.max(0, l.valorCents - (l.valorPagoCents ?? 0)), 0);

  const aPagar30dCents = scopedActive
    .filter(
      (l) =>
        l.tipo === 'despesa' &&
        (l.status === 'previsto' || l.status === 'atrasado') &&
        l.dataVencimento <= next30,
    )
    .reduce((acc, l) => acc + Math.max(0, l.valorCents - (l.valorPagoCents ?? 0)), 0);

  const saldoProjetado30dCents = saldoAtualCents + aReceber30dCents - aPagar30dCents;

  const catMap = new Map(dataset.categorias.map((c) => [c.id, c]));
  let custosFixosMensaisCents = 0;
  let custosVariaveisCents = 0;
  let gastoMarketingCents = 0;

  for (const l of inPeriod) {
    if (l.tipo !== 'despesa') continue;
    const cat = catMap.get(l.categoriaId);
    if (cat?.natureza === 'fixa') {
      custosFixosMensaisCents += l.valorCents;
    } else {
      custosVariaveisCents += l.valorCents;
    }
    if (cat?.grupoDre === 'marketing') {
      gastoMarketingCents += l.valorCents;
    }
  }

  const margemContribuicaoPct =
    faturamentoCents > 0 ? ((faturamentoCents - custosVariaveisCents) / faturamentoCents) * 100 : 0;

  const pontoEquilibrioCents =
    margemContribuicaoPct > 0 ? Math.round(custosFixosMensaisCents / (margemContribuicaoPct / 100)) : 0;

  const mediaDespesaMensal = despesasCents > 0 ? despesasCents : prevDesp > 0 ? prevDesp : 1;
  const runwayMeses = saldoAtualCents > 0 ? saldoAtualCents / mediaDespesaMensal : 0;

  const totalAReceberAberto = scopedActive
    .filter((l) => l.tipo === 'receita' && (l.status === 'previsto' || l.status === 'atrasado'))
    .reduce((acc, l) => acc + l.valorCents, 0);
  const atrasadoReceber = scopedActive
    .filter((l) => l.tipo === 'receita' && (l.status === 'atrasado' || (l.status === 'previsto' && l.dataVencimento < todayISO)))
    .reduce((acc, l) => acc + l.valorCents, 0);
  const inadimplenciaPct = totalAReceberAberto > 0 ? (atrasadoReceber / totalAReceberAberto) * 100 : 0;

  const recPagos = scopedActive.filter((l) => l.tipo === 'receita' && l.status === 'pago' && l.dataPagamento);
  const prazoMedioRecebimentoDias =
    recPagos.length > 0
      ? Math.round(
          recPagos.reduce((acc, l) => acc + Math.max(0, daysBetweenISO(l.dataCompetencia, l.dataPagamento!)), 0) /
            recPagos.length,
        )
      : 0;

  const despPagas = scopedActive.filter((l) => l.tipo === 'despesa' && l.status === 'pago' && l.dataPagamento);
  const prazoMedioPagamentoDias =
    despPagas.length > 0
      ? Math.round(
          despPagas.reduce((acc, l) => acc + Math.max(0, daysBetweenISO(l.dataCompetencia, l.dataPagamento!)), 0) /
            despPagas.length,
        )
      : 0;

  const curMonth = getMonthKey(todayISO);
  const prevMonthBounds = getPeriodBounds('mes_anterior', todayISO);
  const fatMesAtual = scopedActive
    .filter((l) => l.tipo === 'receita' && getMonthKey(l.dataCompetencia) === curMonth)
    .reduce((acc, l) => acc + l.valorCents, 0);
  const fatMesAnt = scopedActive
    .filter((l) => l.tipo === 'receita' && l.dataCompetencia >= prevMonthBounds.start && l.dataCompetencia <= prevMonthBounds.end)
    .reduce((acc, l) => acc + l.valorCents, 0);
  const variacaoMesAMesPct = pctDelta(fatMesAtual, fatMesAnt);

  const vendas = inPeriod.filter((l) => l.tipo === 'receita');
  const numVendas = vendas.length;
  const ticketMedioCents = numVendas > 0 ? Math.round(faturamentoCents / numVendas) : 0;

  const vendasViaSite = vendas.filter((l) => l.origem === 'Site LORDES' || l.origem === 'Google' || l.origem === 'Instagram');
  const receitaAtribuidaMarketing = vendasViaSite.reduce((acc, l) => acc + l.valorCents, 0);
  const novosClientesMkt = Math.max(1, new Set(vendasViaSite.map((v) => v.pessoaId || v.id)).size);
  const cacCents = gastoMarketingCents > 0 ? Math.round(gastoMarketingCents / novosClientesMkt) : 0;
  const retornoMarketingX = gastoMarketingCents > 0 ? receitaAtribuidaMarketing / gastoMarketingCents : 0;

  const receitaRecorrenteCents = vendas.filter((l) => l.recorrente).reduce((acc, l) => acc + l.valorCents, 0);
  const receitaAvulsaCents = faturamentoCents - receitaRecorrenteCents;

  const despByCat = new Map<string, number>();
  for (const l of inPeriod) {
    if (l.tipo !== 'despesa') continue;
    const nome = catMap.get(l.categoriaId)?.nome || 'Outras despesas';
    despByCat.set(nome, (despByCat.get(nome) ?? 0) + l.valorCents);
  }
  const despesasPorCategoria = Array.from(despByCat.entries())
    .map(([nome, valorCents]) => ({
      nome,
      valorCents,
      pct: despesasCents > 0 ? (valorCents / despesasCents) * 100 : 0,
    }))
    .sort((a, b) => b.valorCents - a.valorCents);

  const recByOrig = new Map<string, number>();
  for (const l of vendas) {
    const orig: MarketingOrigin = l.origem || 'Balcão / Direto';
    recByOrig.set(orig, (recByOrig.get(orig) ?? 0) + l.valorCents);
  }
  const receitasPorOrigem = Array.from(recByOrig.entries())
    .map(([origem, valorCents]) => ({
      origem,
      valorCents,
      pct: faturamentoCents > 0 ? (valorCents / faturamentoCents) * 100 : 0,
    }))
    .sort((a, b) => b.valorCents - a.valorCents);

  // Receita e margem por produto/serviço (Seção 5.3)
  const prodMap = new Map((dataset.produtos || []).map((p) => [p.id, p]));
  const recByProd = new Map<string, { nome: string; valorCents: number; margemPct: number; qtd: number }>();
  for (const l of vendas) {
    if (!l.produtoId) continue;
    const prod = prodMap.get(l.produtoId);
    if (!prod) continue;
    const margem = prod.precoVendaCents > 0 ? ((prod.precoVendaCents - prod.custoUnitarioCents) / prod.precoVendaCents) * 100 : 0;
    const cur = recByProd.get(prod.id) ?? { nome: prod.nome, valorCents: 0, margemPct: margem, qtd: 0 };
    recByProd.set(prod.id, { ...cur, valorCents: cur.valorCents + l.valorCents, qtd: cur.qtd + 1 });
  }
  const receitasPorProduto = Array.from(recByProd.values()).sort((a, b) => b.valorCents - a.valorCents);

  const pessoaMap = new Map(dataset.pessoas.map((p) => [p.id, p.nome]));
  const cliMap = new Map<string, { valorCents: number; qtd: number }>();
  for (const l of vendas) {
    const nome = (l.pessoaId && pessoaMap.get(l.pessoaId)) || 'Cliente Avulso';
    const cur = cliMap.get(nome) ?? { valorCents: 0, qtd: 0 };
    cliMap.set(nome, { valorCents: cur.valorCents + l.valorCents, qtd: cur.qtd + 1 });
  }
  const topClientes = Array.from(cliMap.entries())
    .map(([nome, data]) => ({ nome, ...data }))
    .sort((a, b) => b.valorCents - a.valorCents)
    .slice(0, 6);

  // Semáforo de saúde financeira (Seção 5.5)
  let semaforo: SemaforoResult;
  if (saldoProjetado30dCents < 0 || margemLiquidaPct < 0 || inadimplenciaPct > 15) {
    const motivo =
      saldoProjetado30dCents < 0
        ? `Atenção: o saldo projetado nos próximos 30 dias fica negativo em ${formatBRL(Math.abs(saldoProjetado30dCents))}.`
        : inadimplenciaPct > 15
          ? `Alerta: sua inadimplência atingiu ${inadimplenciaPct.toFixed(1).replace('.', ',')}% do total a receber.`
          : 'Alerta: suas despesas estão superando as receitas neste período.';
    semaforo = { cor: 'vermelho', label: 'Crítico', mensagem: motivo };
  } else if (margemLiquidaPct <= 10 || inadimplenciaPct >= 5) {
    const motivo =
      margemLiquidaPct <= 10
        ? `Margem líquida apertada em ${margemLiquidaPct.toFixed(1).replace('.', ',')}%. Vale revisar custos variáveis ou taxas.`
        : `Saldo positivo, mas há ${inadimplenciaPct.toFixed(1).replace('.', ',')}% em recebíveis em atraso que exigem cobrança.`;
    semaforo = { cor: 'amarelo', label: 'Atenção', mensagem: motivo };
  } else {
    semaforo = {
      cor: 'verde',
      label: 'Saudável',
      mensagem: `Caixa firme: sobra ${margemLiquidaPct.toFixed(1).replace('.', ',')}% de margem líquida e o saldo projetado fecha em ${formatBRL(saldoProjetado30dCents)}.`,
    };
  }

  // Alertas inteligentes (Seção 5.6)
  const alertas: AlertaInteligente[] = [];
  const next3 = addDaysISO(todayISO, 3);
  const vencendo3d = scopedActive
    .filter((l) => l.tipo === 'despesa' && l.status === 'previsto' && l.dataVencimento >= todayISO && l.dataVencimento <= next3)
    .reduce((acc, l) => acc + l.valorCents, 0);

  if (vencendo3d > 0) {
    alertas.push({
      id: 'al-venc-3d',
      nivel: vencendo3d > saldoAtualCents ? 'critico' : 'atencao',
      titulo: vencendo3d > saldoAtualCents ? 'Saldo insuficiente para vencimentos em 3 dias' : 'Contas vencendo nos próximos 3 dias',
      descricao: `${formatBRL(vencendo3d)} em contas a pagar vencem até ${next3.split('-').reverse().join('/')}.`,
    });
  }

  const atrasados15 = scopedActive.filter(
    (l) => l.tipo === 'receita' && (l.status === 'atrasado' || (l.status === 'previsto' && l.dataVencimento < todayISO)) && daysBetweenISO(l.dataVencimento, todayISO) >= 15,
  );
  if (atrasados15.length > 0) {
    const totalAtr15 = atrasados15.reduce((acc, l) => acc + l.valorCents, 0);
    alertas.push({
      id: 'al-atr-15',
      nivel: 'critico',
      titulo: `${atrasados15.length} recebimento(s) com mais de 15 dias de atraso`,
      descricao: `${formatBRL(totalAtr15)} em aberto há mais de 15 dias. Acione a cobrança pelo WhatsApp.`,
    });
  }

  if (saldoProjetado30dCents < 0) {
    alertas.push({
      id: 'al-proj-neg',
      nivel: 'critico',
      titulo: 'Projeção de caixa negativa em 30 dias',
      descricao: `Faltam ${formatBRL(Math.abs(saldoProjetado30dCents))} para cobrir os compromissos previstos.`,
    });
  }

  // Alerta de categoria 30% acima da média dos últimos 3 meses (Seção 5.6)
  const threeMonthsAgo = addDaysISO(todayISO, -90);
  const curMonthStart = `${curMonth}-01`;
  const histByCat = new Map<string, Map<string, number>>();
  const curCatSpend = new Map<string, number>();

  for (const l of scopedActive) {
    if (l.tipo !== 'despesa') continue;
    const mk = getMonthKey(l.dataCompetencia);
    if (mk === curMonth) {
      curCatSpend.set(l.categoriaId, (curCatSpend.get(l.categoriaId) ?? 0) + l.valorCents);
    } else if (l.dataCompetencia >= threeMonthsAgo && l.dataCompetencia < curMonthStart) {
      const mMap = histByCat.get(l.categoriaId) ?? new Map<string, number>();
      mMap.set(mk, (mMap.get(mk) ?? 0) + l.valorCents);
      histByCat.set(l.categoriaId, mMap);
    }
  }
  for (const [catId, curVal] of curCatSpend.entries()) {
    const mMap = histByCat.get(catId);
    if (!mMap || mMap.size === 0) continue;
    const avg = Array.from(mMap.values()).reduce((a, b) => a + b, 0) / mMap.size;
    if (avg > 0 && curVal > avg * 1.3) {
      const catNome = catMap.get(catId)?.nome || 'Categoria';
      const pctAbove = Math.round(((curVal - avg) / avg) * 100);
      alertas.push({
        id: `al-cat30-${catId}`,
        nivel: 'atencao',
        titulo: `${catNome} está ${pctAbove}% acima da média`,
        descricao: `Gasto atual de ${formatBRL(curVal)} contra média recente de ${formatBRL(Math.round(avg))}.`,
      });
      break;
    }
  }

  const metaPct = dataset.meta.faturamentoCents > 0 ? (fatMesAtual / dataset.meta.faturamentoCents) * 100 : 100;
  const diaHoje = Number(todayISO.split('-')[2]);
  if (diaHoje >= 14 && metaPct < 70 * (diaHoje / 30)) {
    alertas.push({
      id: 'al-meta',
      nivel: 'atencao',
      titulo: 'Meta mensal abaixo do ritmo esperado',
      descricao: `Você atingiu ${metaPct.toFixed(0)}% da meta de faturamento até o dia ${diaHoje}.`,
    });
  }

  return {
    faturamentoCents,
    despesasCents,
    resultadoCents,
    margemLiquidaPct,
    saldoAtualCents,
    aReceber30dCents,
    aPagar30dCents,
    saldoProjetado30dCents,
    faturamentoDeltaPct: pctDelta(faturamentoCents, prevFat),
    despesasDeltaPct: pctDelta(despesasCents, prevDesp),
    resultadoDeltaPct: pctDelta(resultadoCents, prevRes),
    custosFixosMensaisCents,
    custosVariaveisCents,
    margemContribuicaoPct,
    pontoEquilibrioCents,
    runwayMeses,
    inadimplenciaPct,
    prazoMedioRecebimentoDias,
    prazoMedioPagamentoDias,
    variacaoMesAMesPct,
    ticketMedioCents,
    numVendas,
    gastoMarketingCents,
    cacCents,
    retornoMarketingX,
    receitaRecorrenteCents,
    receitaAvulsaCents,
    semaforo,
    alertas,
    despesasPorCategoria,
    receitasPorOrigem,
    receitasPorProduto,
    topClientes,
    saldosPorConta,
  };
}

export interface CashFlowPoint {
  label: string;
  isoDate: string;
  entradasCents: number;
  saidasCents: number;
  saldoAcumuladoCents: number;
  tipo: 'realizado' | 'projetado';
}

export function buildCashFlowSeries(dataset: TenantDataset, todayISO = getTodayISO()): CashFlowPoint[] {
  const active = dataset.lancamentos.filter(isActive).filter((l) => l.tipo !== 'transferencia');
  const saldoInicialTotal = dataset.contas.filter((c) => c.ativa).reduce((acc, c) => acc + c.saldoInicialCents, 0);

  const offsets = [-24, -18, -12, -6, 0, 7, 15, 22, 30];
  let running = saldoInicialTotal;

  const firstDate = addDaysISO(todayISO, offsets[0]);
  for (const l of active) {
    if (l.status === 'pago') {
      const dt = l.dataPagamento || l.dataVencimento;
      if (dt < firstDate) {
        running += l.tipo === 'receita' ? effectiveValue(l) : -effectiveValue(l);
      }
    }
  }

  const points: CashFlowPoint[] = [];
  for (let i = 0; i < offsets.length; i++) {
    const endDt = addDaysISO(todayISO, offsets[i]);
    const prevDt = i === 0 ? firstDate : addDaysISO(todayISO, offsets[i - 1] + 1);
    const isProjected = offsets[i] > 0;

    let entradasCents = 0;
    let saidasCents = 0;

    for (const l of active) {
      if (!isProjected && l.status === 'pago') {
        const dt = l.dataPagamento || l.dataVencimento;
        if (dt >= prevDt && dt <= endDt) {
          if (l.tipo === 'receita') entradasCents += effectiveValue(l);
          else saidasCents += effectiveValue(l);
        }
      } else if (isProjected && (l.status === 'previsto' || l.status === 'atrasado')) {
        const dt = l.dataVencimento < todayISO ? addDaysISO(todayISO, 1) : l.dataVencimento;
        if (dt >= prevDt && dt <= endDt) {
          const rest = Math.max(0, l.valorCents - (l.valorPagoCents ?? 0));
          if (l.tipo === 'receita') entradasCents += rest;
          else saidasCents += rest;
        }
      }
    }

    running += entradasCents - saidasCents;
    const [, mm, dd] = endDt.split('-');
    points.push({
      label: offsets[i] === 0 ? 'Hoje' : `${dd}/${mm}`,
      isoDate: endDt,
      entradasCents,
      saidasCents,
      saldoAcumuladoCents: running,
      tipo: isProjected ? 'projetado' : 'realizado',
    });
  }

  return points;
}

export interface DRESummary {
  mes: string;
  receitaBrutaCents: number;
  deducoesCents: number;
  receitaLiquidaCents: number;
  custosVariaveisCents: number;
  margemContribuicaoCents: number;
  despesasFixasCents: number;
  marketingCents: number;
  resultadoLiquidoCents: number;
}

export function computeMonthlyDRE(
  dataset: TenantDataset,
  mesISO: string,
  centroCustoId?: string,
): DRESummary {
  const catMap = new Map(dataset.categorias.map((c) => [c.id, c]));
  const active = dataset.lancamentos.filter(
    (l) =>
      isActive(l) &&
      l.tipo !== 'transferencia' &&
      getMonthKey(l.dataCompetencia) === mesISO &&
      (!centroCustoId || l.centroCustoId === centroCustoId),
  );

  let receitaBrutaCents = 0;
  let deducoesCents = 0;
  let custosVariaveisCents = 0;
  let despesasFixasCents = 0;
  let marketingCents = 0;

  for (const l of active) {
    const cat = catMap.get(l.categoriaId);
    if (l.tipo === 'receita') {
      receitaBrutaCents += l.valorCents;
    } else {
      if (cat?.grupoDre === 'deducao') deducoesCents += l.valorCents;
      else if (cat?.grupoDre === 'custo_variavel') custosVariaveisCents += l.valorCents;
      else if (cat?.grupoDre === 'marketing') marketingCents += l.valorCents;
      else despesasFixasCents += l.valorCents;
    }
  }

  const receitaLiquidaCents = receitaBrutaCents - deducoesCents;
  const margemContribuicaoCents = receitaLiquidaCents - custosVariaveisCents;
  const resultadoLiquidoCents = margemContribuicaoCents - despesasFixasCents - marketingCents;

  return {
    mes: mesISO,
    receitaBrutaCents,
    deducoesCents,
    receitaLiquidaCents,
    custosVariaveisCents,
    margemContribuicaoCents,
    despesasFixasCents,
    marketingCents,
    resultadoLiquidoCents,
  };
}

function clampDayOfMonth(year: number, month1To12: number, desiredDay: number): string {
  const maxDay = new Date(year, month1To12, 0).getDate();
  const safeDay = Math.min(desiredDay, maxDay);
  return `${year}-${String(month1To12).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

function advanceRecurrenceDate(baseISO: string, frequencia: 'semanal' | 'mensal' | 'anual'): string {
  if (frequencia === 'semanal') {
    return addDaysISO(baseISO, 7);
  }
  const [y, m, d] = baseISO.split('-').map(Number);
  if (frequencia === 'anual') {
    return clampDayOfMonth(y + 1, m, d);
  }
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  return clampDayOfMonth(nextY, nextM, d);
}

export function generateDueRecurrences(dataset: TenantDataset, todayISO = getTodayISO()): {
  generated: Lancamento[];
  updatedOriginals: Lancamento[];
} {
  const generated: Lancamento[] = [];
  const existingIds = new Set(dataset.lancamentos.map((x) => x.id));

  const updatedOriginals: Lancamento[] = dataset.lancamentos.map((l) => {
    if (l.excluidoEm || !l.recorrente || l.tipo === 'transferencia') return l;
    const freq: 'semanal' | 'mensal' | 'anual' = l.frequencia || 'mensal';
    const anchorBase = l.ultimaGeracaoRecorrencia || l.dataVencimento || l.dataCompetencia;
    let cursor = advanceRecurrenceDate(anchorBase, freq);
    let lastGeneratedDate = l.ultimaGeracaoRecorrencia;
    let guard = 0;

    while (cursor <= todayISO && guard < 24) {
      guard += 1;
      const newId = `l-recgen-${l.id}-${cursor}`;
      if (!existingIds.has(newId)) {
        existingIds.add(newId);
        generated.push({
          ...l,
          id: newId,
          dataCompetencia: cursor,
          dataVencimento: cursor,
          dataPagamento: undefined,
          valorPagoCents: undefined,
          jurosMultaCents: undefined,
          status: cursor < todayISO ? 'atrasado' : 'previsto',
          recorrente: false,
          criadoPor: 'Motor de Recorrência',
          criadoEm: todayISO,
        });
      }
      lastGeneratedDate = cursor;
      cursor = advanceRecurrenceDate(cursor, freq);
    }

    if (lastGeneratedDate && lastGeneratedDate !== l.ultimaGeracaoRecorrencia) {
      return { ...l, ultimaGeracaoRecorrencia: lastGeneratedDate };
    }
    return l;
  });

  return { generated, updatedOriginals };
}

export function applyOverdueTransitions(lancamentos: Lancamento[], todayISO = getTodayISO()): {
  changed: boolean;
  updated: Lancamento[];
  transitionedCount: number;
} {
  let transitionedCount = 0;
  const updated = lancamentos.map((l) => {
    if (!l.excluidoEm && l.status === 'previsto' && l.dataVencimento < todayISO) {
      transitionedCount += 1;
      return { ...l, status: 'atrasado' as const };
    }
    return l;
  });
  return {
    changed: transitionedCount > 0,
    updated,
    transitionedCount,
  };
}
