// Testes de ponta a ponta da API com banco em memória.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { open, setDb } from './db/client.js';
import { createApp } from './app.js';
import { resetFailures } from './services/auth.js';

let server;
let baseUrl;
let token;

before(async () => {
  process.env.APP_PIN = '123456';
  process.env.AUTH_SECRET = 'segredo-de-teste';
  // Nunca chamar a Pluggy real a partir dos testes (o .env local pode ter credenciais).
  process.env.PLUGGY_CLIENT_ID = '';
  process.env.PLUGGY_CLIENT_SECRET = '';
  setDb(await open(process.env.TEST_DATABASE_URL || ':memory:'));
  server = createApp({ serveClient: false }).listen(0);
  baseUrl = `http://localhost:${server.address().port}/api`;
});

after(() => server.close());

async function api(path, { method = 'GET', body, auth = true, key } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (key) headers['Idempotency-Key'] = key;
  const res = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, replayed: res.headers.get('Idempotent-Replayed') === 'true' };
}

test('rotas exigem PIN e o login bloqueia após 5 erros', async () => {
  assert.equal((await api('/months', { auth: false })).status, 401);
  for (let i = 0; i < 5; i++) {
    assert.equal((await api('/auth/login', { method: 'POST', body: { pin: '000000' }, auth: false })).status, 401);
  }
  assert.equal((await api('/auth/login', { method: 'POST', body: { pin: '123456' }, auth: false })).status, 429);
  resetFailures();

  const login = await api('/auth/login', { method: 'POST', body: { pin: '123456' }, auth: false });
  assert.equal(login.status, 200);
  token = login.body.token;
  assert.equal((await api('/auth/status')).body.authenticated, true);
  assert.equal((await api('/months', { auth: true })).status, 200);
});

test('fluxo de conta, compra parcelada, fechamento e exclusão', async () => {
  const { body: { account } } = await api('/accounts', {
    method: 'POST',
    body: { name: 'Cartão Teste', type: 'credit_card', closingDay: 28, color: '#000' }
  });

  // Compra no dia 30: entra na fatura de novembro, parcelas seguem nos meses seguintes.
  const created = await api('/transactions', {
    method: 'POST',
    body: {
      description: 'Notebook', amount: 300, accountId: account.id, category: 'Compras & Vestuário',
      date: '2026-10-30', isInstallment: true, currentInstallment: 1, totalInstallments: 3
    }
  });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.created.map(t => t.month), ['2026-11', '2026-12', '2027-01']);
  assert.equal(created.body.created[0].account, 'Cartão Teste');

  const nov = await api('/months/2026-11');
  assert.equal(nov.body.summary.totalExpense, 300);
  assert.equal(nov.body.summary.creditCardExpenses, 300);

  const inst = await api('/installments?month=2026-12');
  assert.equal(inst.body.installments.length, 1);
  assert.equal(inst.body.installments[0].remainingDebt, 300);

  // Mudar o fechamento para o dia 31 traz a compra de volta para outubro.
  await api(`/accounts/${account.id}`, { method: 'PUT', body: { closingDay: 31 } });
  const oct = await api('/months/2026-10');
  assert.equal(oct.body.transactions.length, 1);

  // Renomear não exige atualizar lançamentos (referência por id).
  await api(`/accounts/${account.id}`, { method: 'PUT', body: { name: 'Cartão Renomeado' } });
  assert.equal((await api('/months/2026-10')).body.transactions[0].account, 'Cartão Renomeado');

  // Conta com lançamentos não é removida sem confirmação explícita.
  const blocked = await api(`/accounts/${account.id}`, { method: 'DELETE' });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.transactionCount, 3);
  assert.equal((await api(`/accounts/${account.id}?withTransactions=true`, { method: 'DELETE' })).status, 204);
  assert.equal((await api('/months/2026-10')).body.transactions.length, 0);
});

test('validação devolve 400 com mensagem', async () => {
  const res = await api('/transactions', { method: 'POST', body: { description: 'x', amount: -1, date: '2026-10-01' } });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /valor/);
});

test('meta de sobra e marcar como pago', async () => {
  const { body: { account } } = await api('/accounts', { method: 'POST', body: { name: 'Conta', type: 'bank_account' } });
  await api('/transactions', { method: 'POST', body: { description: 'Salário', amount: 1000, type: 'income', accountId: account.id, date: '2026-10-05' } });
  const { body: { created: [tx] } } = await api('/transactions', { method: 'POST', body: { description: 'Mercado', amount: 200, accountId: account.id, date: '2026-10-06' } });

  await api('/months/2026-10/surplus', { method: 'PUT', body: { target: 300 } });
  // Repetir o pedido não desfaz: o estado é definido, não invertido.
  await api(`/transactions/${tx.id}/paid`, { method: 'PATCH', body: { paid: true } });
  await api(`/transactions/${tx.id}/paid`, { method: 'PATCH', body: { paid: true } });
  const { body } = await api('/months/2026-10');
  assert.equal(body.summary.availableToSpend, 500);
  assert.equal(body.summary.totalPaid, 200);
});

test('restaurar dados de exemplo importa o formato antigo', async () => {
  assert.equal((await api('/admin/reset-seed', { method: 'POST' })).status, 200);
  const { body } = await api('/months/2026-10');
  assert.ok(body.transactions.length > 10);
  assert.ok(body.summary.totalIncome > 0);
});

test('rota do cron exige o CRON_SECRET, não o PIN', async () => {
  delete process.env.CRON_SECRET;
  assert.equal((await api('/cron/sync', { auth: false })).status, 401);

  process.env.CRON_SECRET = 'segredo-do-cron';
  const call = (secret) => fetch(`${baseUrl}/cron/sync`, { headers: { Authorization: `Bearer ${secret}` } });
  assert.equal((await call('errado')).status, 401);
  assert.equal((await call(token)).status, 401);

  const ok = await call('segredo-do-cron');
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).skipped, true); // Pluggy não configurada neste teste
  delete process.env.CRON_SECRET;
});

test('reenvio com a mesma Idempotency-Key não duplica o lançamento', async () => {
  const { body: { account } } = await api('/accounts', { method: 'POST', body: { name: 'Idem', type: 'bank_account' } });
  const payload = { description: 'Padaria idempotente', amount: 12.5, accountId: account.id, date: '2026-10-07' };
  const key = 'teste-idem-0001';

  const first = await api('/transactions', { method: 'POST', body: payload, key });
  const retry = await api('/transactions', { method: 'POST', body: payload, key });
  assert.equal(first.status, 201);
  assert.equal(retry.status, 201);
  assert.equal(retry.replayed, true);
  assert.equal(retry.body.created[0].id, first.body.created[0].id);

  const { body } = await api('/months/2026-10');
  assert.equal(body.transactions.filter(t => t.description === 'Padaria idempotente').length, 1);

  // A mesma chave em outra ação é recusada.
  assert.equal((await api('/accounts', { method: 'POST', body: { name: 'Outra' }, key })).status, 422);
  // Erro de validação também é guardado: o reenvio recebe o mesmo 400.
  assert.equal((await api('/transactions', { method: 'POST', body: {}, key: 'teste-idem-0002' })).status, 400);
  assert.equal((await api('/transactions', { method: 'POST', body: {}, key: 'teste-idem-0002' })).replayed, true);
});
