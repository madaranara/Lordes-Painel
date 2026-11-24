import assert from 'node:assert/strict';
import test from 'node:test';
import { createSegmentPreset } from '../src/data/presets.ts';
import {
  computeDashboardMetrics,
  computeMonthlyDRE,
  generateDueRecurrences,
} from '../src/utils/kpiEngine.ts';
import { parseBankStatement } from '../src/utils/statementParser.ts';

test('computeDashboardMetrics calculates 8 essential KPIs and Ponto de Equilibrio accurately', () => {
  const dataset = createSegmentPreset('servicos');
  // Substitui lançamentos por conjunto determinístico para validação matemática exata
  const catReceita = dataset.categorias.find((c) => c.tipo === 'receita')!.id;
  const catFixa = dataset.categorias.find((c) => c.grupoDre === 'despesa_fixa')!.id;
  const catVar = dataset.categorias.find((c) => c.grupoDre === 'custo_variavel')!.id;
  const contaId = dataset.contas[0].id;
  const saldoInicialTotal = dataset.contas
    .filter((c) => c.ativa)
    .reduce((acc, c) => acc + c.saldoInicialCents, 0);

  dataset.lancamentos = [
    {
      id: 't1',
      empresaId: dataset.empresa.id,
      tipo: 'receita',
      valorCents: 1000000, // R$ 10.000,00
      valorPagoCents: 1000000,
      dataCompetencia: '2026-05-05',
      dataVencimento: '2026-05-05',
      dataPagamento: '2026-05-06',
      status: 'pago',
      categoriaId: catReceita,
      contaId,
      formaPagamento: 'Pix',
      descricao: 'Contrato A',
      origem: 'Site LORDES',
      criadoPor: 'Teste',
      criadoEm: '2026-05-05',
    },
    {
      id: 't2',
      empresaId: dataset.empresa.id,
      tipo: 'despesa',
      valorCents: 200000, // R$ 2.000,00 custo variável (20% -> MC = 80%)
      valorPagoCents: 200000,
      dataCompetencia: '2026-05-07',
      dataVencimento: '2026-05-07',
      dataPagamento: '2026-05-07',
      status: 'pago',
      categoriaId: catVar,
      contaId,
      formaPagamento: 'Pix',
      descricao: 'Material direto',
      criadoPor: 'Teste',
      criadoEm: '2026-05-07',
    },
    {
      id: 't3',
      empresaId: dataset.empresa.id,
      tipo: 'despesa',
      valorCents: 400000, // R$ 4.000,00 custo fixo
      valorPagoCents: 400000,
      dataCompetencia: '2026-05-08',
      dataVencimento: '2026-05-08',
      dataPagamento: '2026-05-08',
      status: 'pago',
      categoriaId: catFixa,
      contaId,
      formaPagamento: 'Transferência',
      descricao: 'Aluguel e equipe',
      criadoPor: 'Teste',
      criadoEm: '2026-05-08',
    },
    {
      id: 't4',
      empresaId: dataset.empresa.id,
      tipo: 'receita',
      valorCents: 300000, // R$ 3.000,00 previsto nos próximos 30d (fora de 2026-05? competência em junho)
      dataCompetencia: '2026-06-05',
      dataVencimento: '2026-05-25',
      status: 'previsto',
      categoriaId: catReceita,
      contaId,
      formaPagamento: 'Boleto',
      descricao: 'Medição futura',
      criadoPor: 'Teste',
      criadoEm: '2026-05-10',
    },
    {
      id: 't5',
      empresaId: dataset.empresa.id,
      tipo: 'despesa',
      valorCents: 100000, // R$ 1.000,00 a pagar nos próximos 30d
      dataCompetencia: '2026-06-05',
      dataVencimento: '2026-05-22',
      status: 'previsto',
      categoriaId: catFixa,
      contaId,
      formaPagamento: 'Pix',
      descricao: 'Fornecedor previsto',
      criadoPor: 'Teste',
      criadoEm: '2026-05-10',
    },
  ];

  const metrics = computeDashboardMetrics(dataset, 'mes_atual', '2026-05-15');

  assert.equal(metrics.faturamentoCents, 1000000);
  assert.equal(metrics.despesasCents, 600000);
  assert.equal(metrics.resultadoCents, 400000);
  assert.equal(Math.round(metrics.margemLiquidaPct), 40);
  assert.equal(metrics.saldoAtualCents, saldoInicialTotal + 1000000 - 600000);
  assert.equal(metrics.aReceber30dCents, 300000);
  assert.equal(metrics.aPagar30dCents, 100000);
  assert.equal(metrics.saldoProjetado30dCents, metrics.saldoAtualCents + 200000);
  assert.equal(Math.round(metrics.margemContribuicaoPct), 80);
  // Ponto de equilíbrio = 400.000 / 0.8 = 500.000 centavos (R$ 5.000,00)
  assert.equal(metrics.pontoEquilibrioCents, 500000);
  assert.equal(metrics.semaforo.cor, 'verde');
});

test('Semaforo turns vermelho when projected 30d balance is negative or delinquency > 15%', () => {
  const dataset = createSegmentPreset('comercio');
  const catReceita = dataset.categorias.find((c) => c.tipo === 'receita')!.id;
  const catFixa = dataset.categorias.find((c) => c.grupoDre === 'despesa_fixa')!.id;
  const contaId = dataset.contas[0].id;
  dataset.contas = dataset.contas.map((c, idx) =>
    idx === 0 ? { ...c, saldoInicialCents: 100000 } : { ...c, saldoInicialCents: 0 },
  );

  dataset.lancamentos = [
    {
      id: 'v1',
      empresaId: dataset.empresa.id,
      tipo: 'receita',
      valorCents: 500000,
      valorPagoCents: 500000,
      dataCompetencia: '2026-05-05',
      dataVencimento: '2026-05-05',
      dataPagamento: '2026-05-05',
      status: 'pago',
      categoriaId: catReceita,
      contaId,
      formaPagamento: 'Pix',
      descricao: 'Venda',
      criadoPor: 'Teste',
      criadoEm: '2026-05-05',
    },
    {
      id: 'v2',
      empresaId: dataset.empresa.id,
      tipo: 'despesa',
      valorCents: 900000, // vai negativar o saldo projetado
      dataCompetencia: '2026-05-20',
      dataVencimento: '2026-05-20',
      status: 'previsto',
      categoriaId: catFixa,
      contaId,
      formaPagamento: 'Boleto',
      descricao: 'Aluguel alto',
      criadoPor: 'Teste',
      criadoEm: '2026-05-10',
    },
  ];

  const metrics = computeDashboardMetrics(dataset, 'mes_atual', '2026-05-15');
  assert.ok(metrics.saldoProjetado30dCents < 0);
  assert.equal(metrics.semaforo.cor, 'vermelho');
});

test('computeMonthlyDRE groups deductions, variable costs, fixed expenses and marketing', () => {
  const dataset = createSegmentPreset('alimentacao');
  const catRec = dataset.categorias.find((c) => c.tipo === 'receita')!.id;
  const catDed = dataset.categorias.find((c) => c.grupoDre === 'deducao')!.id;
  const catVar = dataset.categorias.find((c) => c.grupoDre === 'custo_variavel')!.id;
  const catFix = dataset.categorias.find((c) => c.grupoDre === 'despesa_fixa')!.id;
  const catMkt = dataset.categorias.find((c) => c.grupoDre === 'marketing')!.id;
  const contaId = dataset.contas[0].id;

  dataset.lancamentos = [
    {
      id: 'd1',
      empresaId: dataset.empresa.id,
      tipo: 'receita',
      valorCents: 2000000,
      dataCompetencia: '2026-05-01',
      dataVencimento: '2026-05-01',
      status: 'pago',
      categoriaId: catRec,
      contaId,
      formaPagamento: 'Pix',
      descricao: 'Vendas balcão',
      criadoPor: 'Teste',
      criadoEm: '2026-05-01',
    },
    {
      id: 'd2',
      empresaId: dataset.empresa.id,
      tipo: 'despesa',
      valorCents: 120000,
      dataCompetencia: '2026-05-02',
      dataVencimento: '2026-05-02',
      status: 'pago',
      categoriaId: catDed,
      contaId,
      formaPagamento: 'Pix',
      descricao: 'DAS Simples',
      criadoPor: 'Teste',
      criadoEm: '2026-05-02',
    },
    {
      id: 'd3',
      empresaId: dataset.empresa.id,
      tipo: 'despesa',
      valorCents: 600000,
      dataCompetencia: '2026-05-03',
      dataVencimento: '2026-05-03',
      status: 'pago',
      categoriaId: catVar,
      contaId,
      formaPagamento: 'Pix',
      descricao: 'Insumos',
      criadoPor: 'Teste',
      criadoEm: '2026-05-03',
    },
    {
      id: 'd4',
      empresaId: dataset.empresa.id,
      tipo: 'despesa',
      valorCents: 500000,
      dataCompetencia: '2026-05-04',
      dataVencimento: '2026-05-04',
      status: 'pago',
      categoriaId: catFix,
      contaId,
      formaPagamento: 'Pix',
      descricao: 'Folha fixa',
      criadoPor: 'Teste',
      criadoEm: '2026-05-04',
    },
    {
      id: 'd5',
      empresaId: dataset.empresa.id,
      tipo: 'despesa',
      valorCents: 80000,
      dataCompetencia: '2026-05-05',
      dataVencimento: '2026-05-05',
      status: 'pago',
      categoriaId: catMkt,
      contaId,
      formaPagamento: 'Cartão de Crédito',
      descricao: 'Tráfego pago',
      criadoPor: 'Teste',
      criadoEm: '2026-05-05',
    },
  ];

  const dre = computeMonthlyDRE(dataset, '2026-05');
  assert.equal(dre.receitaBrutaCents, 2000000);
  assert.equal(dre.deducoesCents, 120000);
  assert.equal(dre.receitaLiquidaCents, 1880000);
  assert.equal(dre.custosVariaveisCents, 600000);
  assert.equal(dre.margemContribuicaoCents, 1280000);
  assert.equal(dre.despesasFixasCents, 500000);
  assert.equal(dre.marketingCents, 80000);
  assert.equal(dre.resultadoLiquidoCents, 700000);
});

test('parseBankStatement parses both OFX and semicolon CSV statements', () => {
  const ofx = `
    <OFX>
    <STMTTRN>
      <TRNTYPE>CREDIT
      <DTPOSTED>20260512
      <TRNAMT>1500.50
      <FITID>FIT-1
      <MEMO>PIX CLIENTE ALFA
    </STMTTRN>
    <STMTTRN>
      <TRNTYPE>DEBIT
      <DTPOSTED>20260513
      <TRNAMT>-420.00
      <FITID>FIT-2
      <MEMO>ENERGIA ELETRICA
    </STMTTRN>
    </OFX>
  `;
  const ofxRows = parseBankStatement(ofx, 'extrato.ofx');
  assert.equal(ofxRows.length, 2);
  assert.equal(ofxRows[0].tipo, 'receita');
  assert.equal(ofxRows[0].valorCents, 150050);
  assert.equal(ofxRows[0].dataISO, '2026-05-12');
  assert.equal(ofxRows[1].tipo, 'despesa');
  assert.equal(ofxRows[1].valorCents, 42000);

  const csv = 'Data;Descricao;Valor\n15/05/2026;Venda Balcao;250,00\n16/05/2026;Internet;-129,90';
  const csvRows = parseBankStatement(csv, 'extrato.csv');
  assert.equal(csvRows.length, 2);
  assert.equal(csvRows[0].dataISO, '2026-05-15');
  assert.equal(csvRows[0].valorCents, 25000);
  assert.equal(csvRows[1].tipo, 'despesa');
  assert.equal(csvRows[1].valorCents, 12990);
});

test('generateDueRecurrences creates monthly entry once and stays idempotent', () => {
  const dataset = createSegmentPreset('servicos');
  const catRec = dataset.categorias.find((c) => c.tipo === 'receita')!.id;
  const contaId = dataset.contas[0].id;

  dataset.lancamentos = [
    {
      id: 'rec-base-1',
      empresaId: dataset.empresa.id,
      tipo: 'receita',
      valorCents: 180000,
      dataCompetencia: '2026-04-10',
      dataVencimento: '2026-04-10',
      dataPagamento: '2026-04-10',
      status: 'pago',
      categoriaId: catRec,
      contaId,
      formaPagamento: 'Boleto',
      descricao: 'Mensalidade Manutenção',
      recorrente: true,
      frequencia: 'mensal',
      criadoPor: 'Teste',
      criadoEm: '2026-04-10',
    },
  ];

  const firstRun = generateDueRecurrences(dataset, '2026-05-15');
  assert.equal(firstRun.generated.length, 1);
  assert.equal(firstRun.generated[0].dataVencimento, '2026-05-10');
  assert.equal(firstRun.generated[0].status, 'atrasado');

  const secondDataset = {
    ...dataset,
    lancamentos: [...firstRun.generated, ...firstRun.updatedOriginals],
  };
  const secondRun = generateDueRecurrences(secondDataset, '2026-05-15');
  assert.equal(secondRun.generated.length, 0);
});

test('generateDueRecurrences supports weekly and annual schedules and applyOverdueTransitions marks late previsto items', async () => {
  const { applyOverdueTransitions } = await import('../src/utils/kpiEngine.ts');
  const dataset = createSegmentPreset('servicos');
  const catRec = dataset.categorias.find((c) => c.tipo === 'receita')!.id;
  const catFix = dataset.categorias.find((c) => c.grupoDre === 'despesa_fixa')!.id;
  const contaId = dataset.contas[0].id;

  dataset.lancamentos = [
    {
      id: 'rec-weekly',
      empresaId: dataset.empresa.id,
      tipo: 'receita',
      valorCents: 50000,
      dataCompetencia: '2026-05-01',
      dataVencimento: '2026-05-01',
      status: 'pago',
      categoriaId: catRec,
      contaId,
      formaPagamento: 'Pix',
      descricao: 'Contrato semanal',
      recorrente: true,
      frequencia: 'semanal',
      criadoPor: 'Teste',
      criadoEm: '2026-05-01',
    },
    {
      id: 'rec-annual',
      empresaId: dataset.empresa.id,
      tipo: 'despesa',
      valorCents: 120000,
      dataCompetencia: '2025-05-10',
      dataVencimento: '2025-05-10',
      status: 'pago',
      categoriaId: catFix,
      contaId,
      formaPagamento: 'Boleto',
      descricao: 'Licença anual',
      recorrente: true,
      frequencia: 'anual',
      criadoPor: 'Teste',
      criadoEm: '2025-05-10',
    },
    {
      id: 'late-previsto',
      empresaId: dataset.empresa.id,
      tipo: 'despesa',
      valorCents: 30000,
      dataCompetencia: '2026-05-02',
      dataVencimento: '2026-05-02',
      status: 'previsto',
      categoriaId: catFix,
      contaId,
      formaPagamento: 'Pix',
      descricao: 'Fatura vencida',
      criadoPor: 'Teste',
      criadoEm: '2026-05-01',
    },
  ];

  const rec = generateDueRecurrences(dataset, '2026-05-16');
  const weeklyDates = rec.generated.filter((g) => g.descricao === 'Contrato semanal').map((g) => g.dataVencimento);
  assert.deepEqual(weeklyDates, ['2026-05-08', '2026-05-15']);

  const annualItems = rec.generated.filter((g) => g.descricao === 'Licença anual');
  assert.equal(annualItems.length, 1);
  assert.equal(annualItems[0].dataVencimento, '2026-05-10');

  const overdue = applyOverdueTransitions(dataset.lancamentos, '2026-05-16');
  assert.equal(overdue.changed, true);
  assert.equal(overdue.transitionedCount, 1);
  assert.equal(overdue.updated.find((l) => l.id === 'late-previsto')?.status, 'atrasado');
});

