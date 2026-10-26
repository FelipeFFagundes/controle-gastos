import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, addMonthsToDate, isValidDate } from './months.js';
import { billingMonth } from './billing.js';
import { buildInstallmentSeries, parseInstallmentFromDescription, stripInstallmentSuffix, summarizeInstallments } from './installments.js';
import { computeMonthSummary } from './summary.js';
import { classifyPluggyTransaction, mapPluggyCategory } from './pluggyMapping.js';

test('addMonths atravessa a virada de ano', () => {
  assert.equal(addMonths('2026-11', 2), '2027-01');
  assert.equal(addMonths('2026-01', -1), '2025-12');
});

test('addMonthsToDate limita ao último dia do mês (sem pular para março)', () => {
  assert.equal(addMonthsToDate('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonthsToDate('2028-01-31', 1), '2028-02-29');
  assert.equal(addMonthsToDate('2026-01-15', 1), '2026-02-15');
});

test('isValidDate rejeita datas impossíveis', () => {
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('2026-02-28'), true);
});

test('billingMonth: compra no dia do fechamento vai para a fatura seguinte', () => {
  const card = { type: 'credit_card', closingDay: 28, monthOffset: 0 };
  assert.equal(billingMonth(card, '2026-09-27'), '2026-09');
  assert.equal(billingMonth(card, '2026-09-28'), '2026-10');
  assert.equal(billingMonth(card, '2026-12-30'), '2027-01');
});

test('billingMonth: offset é sempre aplicado, com ou sem fechamento', () => {
  const card = { type: 'credit_card', closingDay: 28, monthOffset: -1 };
  assert.equal(billingMonth(card, '2026-09-10'), '2026-08');
  assert.equal(billingMonth(card, '2026-09-29'), '2026-09');
});

test('billingMonth: conta corrente ignora dia de fechamento', () => {
  assert.equal(billingMonth({ type: 'bank_account', closingDay: 5 }, '2026-09-20'), '2026-09');
});

test('parseInstallmentFromDescription reconhece só sufixos coerentes', () => {
  assert.deepEqual(parseInstallmentFromDescription('AMAZON MARKETPLACE03/12'), { current: 3, total: 12 });
  assert.deepEqual(parseInstallmentFromDescription('Loja X - Parcela 2/5'), { current: 2, total: 5 });
  assert.equal(parseInstallmentFromDescription('PAG 15/09'), null);
  assert.equal(parseInstallmentFromDescription('BOLETO 12/10 REF'), null);
  assert.equal(stripInstallmentSuffix('AMAZON MARKETPLACE03/12'), 'AMAZON MARKETPLACE');
});

test('buildInstallmentSeries gera as parcelas restantes', () => {
  const series = buildInstallmentSeries({ date: '2026-10-31', month: '2026-11', current: 2, total: 4 });
  assert.deepEqual(series.map(s => [s.current, s.date, s.month]), [
    [2, '2026-10-31', '2026-11'],
    [3, '2026-11-30', '2026-12'],
    [4, '2026-12-31', '2027-01']
  ]);
});

test('summarizeInstallments agrupa e calcula saldo devedor', () => {
  const base = { type: 'expense', description: 'Farol', account: 'Cartão', accountId: 'a1', category: 'Outros', paid: false, amount: 100, installmentGroup: 'g1' };
  const txs = [1, 2, 3, 4].map(n => ({ ...base, id: `t${n}`, month: addMonths('2026-09', n - 1), installment: { current: n, total: 4 } }));
  const [item] = summarizeInstallments(txs, '2026-10');
  assert.equal(item.currentInstallment, 2);
  assert.equal(item.remainingInstallments, 2);
  assert.equal(item.remainingDebt, 200);
  assert.equal(item.amountThisMonth, 100);
  assert.equal(summarizeInstallments(txs, '2027-01').length, 0);
});

test('computeMonthSummary não conta transferências e soma sem erro de arredondamento', () => {
  const accounts = [{ id: 'card', type: 'credit_card' }, { id: 'bank', type: 'bank_account' }];
  const txs = [
    { type: 'income', amount: 1000, accountId: 'bank', account: 'Banco', category: 'Salário & Entradas' },
    { type: 'expense', amount: 0.1, accountId: 'card', account: 'Cartão', category: 'Outros', paid: false },
    { type: 'expense', amount: 0.2, accountId: 'card', account: 'Cartão', category: 'Outros', paid: true },
    { type: 'transfer', amount: 999, accountId: 'bank', account: 'Banco', category: 'Outros' }
  ];
  const s = computeMonthSummary(txs, accounts, 100);
  assert.equal(s.totalExpense, 0.3);
  assert.equal(s.creditCardExpenses, 0.3);
  assert.equal(s.totalTransfers, 999);
  assert.equal(s.availableToSpend, 899.7);
});

test('classifyPluggyTransaction trata pagamento de fatura e aplicação automática como transferência', () => {
  const opts = { isCredit: false };
  assert.equal(classifyPluggyTransaction({ id: '1', amount: -4166, date: '2026-09-30T00:00:00Z', description: 'Pagamento de fatura Fatura Paga Latam Pass I' }, opts).type, 'transfer');
  assert.equal(classifyPluggyTransaction({ id: '2', amount: -2575.4, date: '2026-09-30T00:00:00Z', description: 'Aplicação APL APLIC AUT MAIS' }, opts).type, 'transfer');
  assert.equal(classifyPluggyTransaction({ id: '3', amount: -50, date: '2026-09-30T00:00:00Z', description: 'Pix enviado', category: 'Same person transfer - PIX' }, opts).type, 'transfer');
  assert.equal(classifyPluggyTransaction({ id: '4', amount: -78.9, date: '2026-09-29T00:00:00Z', description: 'Pagamento de boleto ITAU' }, opts).type, 'expense');
  assert.equal(classifyPluggyTransaction({ id: '5', amount: 2575.4, date: '2026-09-28T00:00:00Z', description: 'Salário PAYSMART', type: 'CREDIT' }, opts).type, 'income');
});

test('classifyPluggyTransaction prefere metadados de parcela do cartão', () => {
  const tx = classifyPluggyTransaction({
    id: '1', amount: 181.41, type: 'DEBIT', date: '2027-08-28T00:00:00Z',
    description: 'AMAZON MARKETPLACE', creditCardMetadata: { installmentNumber: 12, totalInstallments: 12 }
  }, { isCredit: true });
  assert.deepEqual(tx.installment, { current: 12, total: 12 });
  assert.equal(tx.type, 'expense');
});

test('mapPluggyCategory reconhece categorias em inglês da Pluggy', () => {
  assert.equal(mapPluggyCategory('Groceries'), 'Alimentação');
  assert.equal(mapPluggyCategory('Pharmacy'), 'Saúde & Farmácia');
  assert.equal(mapPluggyCategory(null), 'Outros');
});
