import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annotateForecasts, NOT_LINKED, proposeLinks } from './forecast.js';
import { computeMonthSummary } from './summary.js';

const account = { id: 'itau', type: 'bank_account' };
const tx = (over) => ({ type: 'income', accountId: 'itau', account: 'Itaú', category: 'Salário & Entradas', month: '2026-10', pluggyId: null, forecastId: null, ...over });

const forecast = tx({ id: 'f1', description: 'Salário', amount: 4900, date: '2026-10-30' });
const parcial = tx({ id: 'd1', description: 'Salário PAYSMART PAGAMENTOS ELETRONICOS LTDA.', amount: 2408.88, date: '2026-10-15', pluggyId: 'p1' });
const resto = tx({ id: 'd2', description: 'Salário PAYSMART PAGAMENTOS ELETRONICOS LTDA.', amount: 2000, date: '2026-10-29', pluggyId: 'p2' });
const pix = tx({ id: 'd3', description: 'Transferência Recebida|Fulano de Tal', amount: 50, date: '2026-10-10', pluggyId: 'p3' });

const link = (list) => {
  const links = new Map(proposeLinks(list).map(l => [l.id, l.forecastId]));
  return list.map(t => (links.has(t.id) ? { ...t, forecastId: links.get(t.id) } : t));
};

test('depósitos de salário são ligados à previsão de salário do mês; Pix de terceiro não', () => {
  const links = proposeLinks([forecast, parcial, resto, pix]);
  assert.deepEqual(links, [{ id: 'd1', forecastId: 'f1' }, { id: 'd2', forecastId: 'f1' }]);
});

test('previsão só conta pelo que falta: parcial do dia 15 não soma por cima do salário', () => {
  const soPrevisao = computeMonthSummary([forecast], [account]);
  assert.equal(soPrevisao.totalIncome, 4900);
  assert.equal(soPrevisao.incomeForecastPending, 4900);

  const comParcial = computeMonthSummary(link([forecast, parcial]), [account]);
  assert.equal(comParcial.totalIncome, 4900);
  assert.equal(comParcial.incomeForecastPending, 2491.12);

  // Recebeu mais que o previsto: vale o que caiu no banco.
  const extra = tx({ id: 'd4', description: 'Salário ADP', amount: 1000, date: '2026-10-30', pluggyId: 'p4' });
  const tudo = computeMonthSummary(link([forecast, parcial, resto, extra, pix]), [account]);
  assert.equal(tudo.totalIncome, 2408.88 + 2000 + 1000 + 50);
  assert.equal(tudo.incomeForecastPending, 0);
});

test('regra aprendida liga a origem à previsão com aquele nome; desligado de propósito fica solto', () => {
  const vale = tx({ id: 'f2', description: 'vale mãe', amount: 800, date: '2026-10-30' });
  const daniela = tx({ id: 'd5', description: 'Transferência Recebida|DANIELA GIULIANO FONSECA', amount: 1139, date: '2026-10-30', pluggyId: 'p5' });
  const rules = new Map([['daniela giuliano fonseca', 'vale mae']]);
  assert.deepEqual(proposeLinks([vale, daniela], rules), [{ id: 'd5', forecastId: 'f2' }]);
  assert.deepEqual(proposeLinks([vale, { ...daniela, forecastId: NOT_LINKED }], rules), []);
});

test('depósito de outro mês não cumpre a previsão; tela mostra recebido e origem', () => {
  assert.deepEqual(proposeLinks([forecast, { ...parcial, month: '2026-11' }]), []);
  const [f, d] = annotateForecasts(link([forecast, parcial]));
  assert.deepEqual(f.forecast, { received: 2408.88, remaining: 2491.12 });
  assert.equal(d.forecastDescription, 'Salário');
});
