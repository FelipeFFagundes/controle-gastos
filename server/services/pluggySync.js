import * as pluggy from '../integrations/pluggy.js';
import * as accountsRepo from '../repositories/accounts.js';
import * as transactionsRepo from '../repositories/transactions.js';
import * as settingsRepo from '../repositories/settings.js';
import * as categoryRulesRepo from '../repositories/categoryRules.js';
import { getDb } from '../db/client.js';
import { config } from '../config.js';
import { billingMonth } from '../domain/billing.js';
import { installmentGroupKey } from '../domain/installments.js';
import { merchantKey } from '../domain/merchant.js';
import { daysAgo } from '../domain/months.js';
import { classifyPluggyTransaction, defaultAccountFromPluggy, isCreditAccount } from '../domain/pluggyMapping.js';
import { badRequest, HttpError } from './errors.js';

const PERIOD_DAYS = { '24h': 2, '7d': 8, '30d': 35 };
const ITEM_POLL_ATTEMPTS = 4;
const ITEM_POLL_INTERVAL_MS = 2000;

export function isConfigured() {
  return Boolean(config.pluggyClientId && config.pluggyClientSecret);
}

async function apiKey() {
  if (!isConfigured()) {
    throw badRequest('Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET nas variáveis de ambiente do servidor.');
  }
  return pluggy.getApiKey(config.pluggyClientId, config.pluggyClientSecret);
}

export async function createConnectToken(itemId) {
  return pluggy.createConnectToken(await apiKey(), itemId || null);
}

export async function registerItem(itemId) {
  if (!itemId || typeof itemId !== 'string') throw badRequest('itemId inválido.');
  await settingsRepo.addPluggyItem(itemId.trim());
}

export function listItems() {
  return settingsRepo.listPluggyItems();
}

// Uma sincronização por vez: a manual e a automática nunca rodam juntas (evita lançamentos duplicados).
let queue = Promise.resolve();

export function sync(options) {
  const run = queue.then(() => runSync(options));
  queue = run.catch(() => {});
  return run;
}

async function runSync({ period = 'all', clearExisting = false, itemIds = [] } = {}) {
  const key = await apiKey();

  const targetItemIds = new Set(await settingsRepo.listPluggyItems());
  for (const id of Array.isArray(itemIds) ? itemIds : []) {
    if (typeof id === 'string' && id.trim()) {
      targetItemIds.add(id.trim());
      await settingsRepo.addPluggyItem(id.trim());
    }
  }
  for (const item of await pluggy.listItems(key)) targetItemIds.add(item.id);

  if (targetItemIds.size === 0) {
    throw new HttpError(400, 'Nenhuma conexão bancária encontrada. Use "Conectar Banco" para vincular sua instituição pelo widget da Pluggy.', { needsConnect: true });
  }

  // 1. Busca TUDO na Pluggy antes de tocar no banco local.
  const warnings = [];
  const fromDate = PERIOD_DAYS[period] ? daysAgo(PERIOD_DAYS[period]) : null;
  const fetched = [];
  const fetchedAccountIds = new Set();

  for (const itemId of targetItemIds) {
    const item = await refreshItem(key, itemId);
    const label = item?.connector?.name || itemId;
    if (item?.status === 'LOGIN_ERROR') warnings.push(`A conexão "${label}" precisa de atualização de senha no widget.`);
    if (item?.status === 'WAITING_USER_INPUT') warnings.push(`A conexão "${label}" aguarda validação (SMS/token) no app do banco.`);

    let accounts = [];
    try {
      accounts = await pluggy.listAccounts(key, itemId);
    } catch (err) {
      warnings.push(`Não foi possível ler as contas da conexão "${label}".`);
      console.warn(`[Pluggy Sync] ${err.message}`);
      continue;
    }
    for (const account of accounts) {
      // Conexões repetidas do mesmo banco (ex.: via MeuPluggy) devolvem as mesmas contas.
      if (fetchedAccountIds.has(account.id)) continue;
      fetchedAccountIds.add(account.id);
      try {
        fetched.push({ account, transactions: await pluggy.listTransactions(key, account.id, fromDate) });
      } catch (err) {
        warnings.push(`Falha ao ler transações de "${account.name}".`);
        console.warn(`[Pluggy Sync] ${err.message}`);
      }
    }
  }

  if (fetched.length === 0) {
    return { message: 'Nenhuma conta encontrada nas conexões.', importedCount: 0, updatedCount: 0, accountsCount: 0, warnings };
  }

  // 2. Só agora, com os dados em mãos, aplica a limpeza pedida.
  if (clearExisting) await settingsRepo.clearFinancialData();

  // 3. Importa.
  const ignored = await transactionsRepo.listIgnoredPluggyIds();
  const categoryRules = await categoryRulesRepo.listAll();
  const seen = new Set();
  const statements = [];
  let importedCount = 0;
  let updatedCount = 0;

  for (const { account: pluggyAccount, transactions } of fetched) {
    const account = await findOrCreateAccount(pluggyAccount);
    const existing = await transactionsRepo.listForAccount(account.id);
    const byPluggyId = new Map(existing.filter(t => t.pluggyId).map(t => [t.pluggyId, t]));
    const unlinked = existing.filter(t => !t.pluggyId);
    const isCredit = isCreditAccount(pluggyAccount);

    for (const ptx of transactions) {
      if (!ptx.id || ignored.has(ptx.id) || seen.has(ptx.id)) continue;
      seen.add(ptx.id);
      const incoming = classifyPluggyTransaction(ptx, { isCredit });
      const month = billingMonth(account, incoming.date);
      const group = incoming.installment
        ? installmentGroupKey(incoming.description, account.id, incoming.installment.total)
        : null;

      const current = byPluggyId.get(ptx.id) || takeTwin(unlinked, incoming);
      if (current) {
        // Atualiza o que vem do banco; mantém o que o usuário editou (descrição, categoria, tipo, pago).
        statements.push(transactionsRepo.updateStatement({
          ...current,
          amount: incoming.amount,
          date: incoming.date,
          month: current.monthLocked ? current.month : month,
          installment: incoming.installment || current.installment,
          installmentGroup: current.installmentGroup || group,
          pluggyId: ptx.id
        }));
        updatedCount++;
      } else {
        // Categoria que o usuário já escolheu para esta loja vence o mapeamento automático.
        const learned = incoming.type === 'expense' ? categoryRules.get(merchantKey(incoming.description)) : null;
        statements.push(transactionsRepo.insertStatement({
          ...incoming,
          category: learned || incoming.category,
          accountId: account.id,
          month,
          paid: false,
          installmentGroup: group
        }));
        importedCount++;
      }
    }
  }

  if (statements.length) {
    const db = await getDb();
    await db.batch(statements, 'write');
  }

  let message = `Sincronização concluída: ${importedCount} lançamento(s) novo(s) e ${updatedCount} atualizado(s) em ${fetched.length} conta(s)/cartão(ões).`;
  if (warnings.length) message += ` Atenção: ${warnings.join(' ')}`;
  return { message, importedCount, updatedCount, accountsCount: fetched.length, warnings };
}

async function refreshItem(key, itemId) {
  await pluggy.triggerItemUpdate(key, itemId);
  let item = await pluggy.getItem(key, itemId);
  for (let i = 0; i < ITEM_POLL_ATTEMPTS && isUpdating(item); i++) {
    await new Promise(r => setTimeout(r, ITEM_POLL_INTERVAL_MS));
    item = await pluggy.getItem(key, itemId);
  }
  return item;
}

function isUpdating(item) {
  return item && (item.status === 'UPDATING' || item.executionStatus === 'UPDATING');
}

// Lançamento manual idêntico ao que veio do banco: vincula em vez de duplicar.
function takeTwin(unlinked, incoming) {
  const description = incoming.description.trim().toLowerCase();
  const index = unlinked.findIndex(t =>
    t.date === incoming.date
    && Math.abs(t.amount - incoming.amount) < 0.005
    && t.description.trim().toLowerCase() === description
  );
  return index === -1 ? null : unlinked.splice(index, 1)[0];
}

async function findOrCreateAccount(pluggyAccount) {
  const linked = await accountsRepo.getByPluggyId(pluggyAccount.id);
  if (linked) return linked;

  const defaults = defaultAccountFromPluggy(pluggyAccount);

  // Conta criada manualmente (ou por versões antigas) com o mesmo nome e tipo: vincula.
  const sameName = await accountsRepo.getByName(defaults.name);
  if (sameName && sameName.type === defaults.type && !sameName.pluggyAccountId) {
    return accountsRepo.update({ ...sameName, pluggyAccountId: pluggyAccount.id });
  }

  let name = defaults.name;
  for (let n = 2; await accountsRepo.getByName(name); n++) {
    name = `${defaults.name} (${n})`;
  }
  return accountsRepo.insert({ ...defaults, name });
}
