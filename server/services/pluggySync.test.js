// Sincronização com a API da Pluggy simulada (fetch interceptado).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { open, setDb } from '../db/client.js';
import * as pluggySync from './pluggySync.js';
import * as transactionsService from './transactions.js';
import * as accountsService from './accounts.js';

const realFetch = globalThis.fetch;

const PLUGGY = {
  'POST /auth': { apiKey: 'k' },
  'GET /items': { results: [{ id: 'item-1' }] },
  'PATCH /items/item-1': {},
  'GET /items/item-1': { id: 'item-1', status: 'UPDATED', connector: { name: 'Itaú' } },
  'GET /accounts?itemId=item-1': {
    results: [
      { id: 'pa-card', type: 'CREDIT', subtype: 'CREDIT_CARD', name: 'Itaú Múltiplo' },
      { id: 'pa-bank', type: 'BANK', subtype: 'CHECKING_ACCOUNT', name: 'Itaú Conta' }
    ]
  },
  'GET /v2/transactions?accountId=pa-card': {
    results: [
      { id: 'c1', amount: 50, type: 'DEBIT', date: '2026-10-10T03:00:00Z', description: 'PADARIA', category: 'Bakery' },
      { id: 'c2', amount: 120, type: 'DEBIT', date: '2026-10-29T03:00:00Z', description: 'LOJA 02/03' },
      { id: 'c3', amount: -170, type: 'CREDIT', date: '2026-10-05T03:00:00Z', description: 'Pagamento recebido' }
    ]
  },
  'GET /v2/transactions?accountId=pa-bank': {
    results: [
      { id: 'b1', amount: 3000, type: 'CREDIT', date: '2026-10-01T03:00:00Z', description: 'Salário EMPRESA' }
    ],
    // A Pluggy devolve em `next` a query string completa da próxima página.
    next: '?accountId=pa-bank&after=cursor-2'
  },
  'GET /v2/transactions?accountId=pa-bank&after=cursor-2': {
    results: [
      { id: 'b2', amount: -170, type: 'DEBIT', date: '2026-10-05T03:00:00Z', description: 'Pagamento de fatura Itau' }
    ]
  }
};

before(async () => {
  process.env.PLUGGY_CLIENT_ID = 'id';
  process.env.PLUGGY_CLIENT_SECRET = 'secret';
  setDb(await open(process.env.TEST_DATABASE_URL || ':memory:'));
  globalThis.fetch = async (url, options = {}) => {
    const u = new URL(url);
    const key = `${options.method || 'GET'} ${u.pathname}${u.search}`;
    if (!(key in PLUGGY)) return new Response('not found', { status: 404 });
    return Response.json(PLUGGY[key]);
  };
});

after(() => {
  globalThis.fetch = realFetch;
});

test('primeiro sync cria contas e lançamentos com fatura e transferências corretas', async () => {
  const result = await pluggySync.sync({ period: 'all' });
  assert.equal(result.importedCount, 5);

  const accounts = await accountsService.list();
  const card = accounts.find(a => a.pluggyAccountId === 'pa-card');
  assert.equal(card.name, 'Cartão Itaú Múltiplo');
  assert.equal(card.closingDay, 29);

  const oct = await transactionsService.getMonth('2026-10');
  // Padaria (50) entra em outubro; LOJA 02/03 do dia 29 vai para novembro.
  assert.equal(oct.summary.totalExpense, 50);
  assert.equal(oct.summary.totalIncome, 3000);
  // Pagamento da fatura (dos dois lados) não conta como gasto nem receita.
  assert.equal(oct.summary.totalTransfers, 340);

  const nov = await transactionsService.getMonth('2026-11');
  assert.deepEqual(nov.transactions.map(t => t.installment), [{ current: 2, total: 3 }]);
});

test('sync repetido é idempotente e respeita edições e exclusões do usuário', async () => {
  const accounts = await accountsService.list();
  const card = accounts.find(a => a.pluggyAccountId === 'pa-card');
  await accountsService.update(card.id, { name: 'Meu Itaú' });

  const oct = await transactionsService.getMonth('2026-10');
  const padaria = oct.transactions.find(t => t.description === 'PADARIA');
  const salario = oct.transactions.find(t => t.description === 'Salário EMPRESA');
  await transactionsService.update(padaria.id, { category: 'Alimentação' });
  await transactionsService.remove(salario.id);

  const result = await pluggySync.sync({ period: 'all' });
  assert.equal(result.importedCount, 0);

  const after = await transactionsService.getMonth('2026-10');
  assert.equal(after.transactions.find(t => t.description === 'PADARIA').category, 'Alimentação');
  assert.equal(after.transactions.find(t => t.description === 'PADARIA').account, 'Meu Itaú');
  assert.equal(after.transactions.some(t => t.description === 'Salário EMPRESA'), false);
});

test('clearExisting só apaga depois de buscar os dados', async () => {
  const result = await pluggySync.sync({ period: 'all', clearExisting: true });
  assert.equal(result.importedCount, 5);
  assert.equal((await accountsService.list()).length, 2);
});

test('sincronizações simultâneas rodam uma de cada vez, sem duplicar', async () => {
  const results = await Promise.all([
    pluggySync.sync({ period: 'all', clearExisting: true }),
    pluggySync.sync({ period: 'all' })
  ]);
  assert.equal(results[0].importedCount, 5);
  assert.equal(results[1].importedCount, 0);
  assert.equal(results[1].updatedCount, 5);
});
