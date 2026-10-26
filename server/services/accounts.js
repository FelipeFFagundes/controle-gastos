import * as accountsRepo from '../repositories/accounts.js';
import * as transactionsRepo from '../repositories/transactions.js';
import { BILLING_CYCLE_OFFSETS, billingMonth } from '../domain/billing.js';
import { badRequest, conflict, notFound } from './errors.js';

const TYPES = ['credit_card', 'bank_account', 'cash'];

export function list() {
  return accountsRepo.list();
}

export async function create(input) {
  const data = parseInput(input);
  await assertNameAvailable(data.name);
  return accountsRepo.insert(data);
}

export async function update(id, input) {
  const existing = await accountsRepo.getById(id);
  if (!existing) throw notFound('Conta não encontrada.');

  const merged = { ...existing, ...stripUndefined(input) };
  if (input.billingCycle !== undefined && input.monthOffset === undefined) {
    merged.monthOffset = BILLING_CYCLE_OFFSETS[input.billingCycle] ?? 0;
  }
  const data = parseInput(merged);
  if (data.name.toLowerCase() !== existing.name.toLowerCase()) {
    await assertNameAvailable(data.name);
  }

  const updated = await accountsRepo.update({ ...existing, ...data });

  // Se a regra de fatura mudou, recalcula o mês de todos os lançamentos da conta
  // a partir da data (exceto os que o usuário fixou manualmente).
  const billingChanged = updated.type !== existing.type
    || updated.closingDay !== existing.closingDay
    || updated.monthOffset !== existing.monthOffset;
  if (billingChanged) {
    await realignMonths(updated);
  }
  return updated;
}

export async function remove(id, { withTransactions = false } = {}) {
  const existing = await accountsRepo.getById(id);
  if (!existing) throw notFound('Conta não encontrada.');
  const count = await transactionsRepo.countByAccount(id);
  if (count > 0 && !withTransactions) {
    throw conflict(
      `A conta "${existing.name}" possui ${count} lançamento(s). Exclua-os junto ou mova-os para outra conta antes.`,
      { transactionCount: count }
    );
  }
  await accountsRepo.remove(id, { withTransactions });
  return existing;
}

async function realignMonths(account) {
  const transactions = await transactionsRepo.listForAccount(account.id);
  const updates = transactions
    .filter(t => !t.monthLocked)
    .map(t => ({ id: t.id, month: billingMonth(account, t.date), previous: t.month }))
    .filter(u => u.month !== u.previous);
  await transactionsRepo.setMonths(updates);
}

function parseInput(input) {
  const name = String(input.name ?? '').trim();
  if (!name) throw badRequest('Nome da conta/cartão é obrigatório.');

  const type = input.type || 'credit_card';
  if (!TYPES.includes(type)) throw badRequest('Tipo de conta inválido.');

  let closingDay = null;
  if (type === 'credit_card' && input.closingDay !== null && input.closingDay !== undefined && input.closingDay !== '') {
    closingDay = Number(input.closingDay);
    if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) {
      throw badRequest('Dia de fechamento deve estar entre 1 e 31.');
    }
  }

  let monthOffset = 0;
  if (input.monthOffset !== undefined && input.monthOffset !== null) {
    monthOffset = Number(input.monthOffset);
  } else if (input.billingCycle) {
    monthOffset = BILLING_CYCLE_OFFSETS[input.billingCycle] ?? 0;
  }
  if (![-1, 0, 1].includes(monthOffset)) throw badRequest('Ciclo de fatura inválido.');

  return {
    name,
    type,
    color: input.color || '#3b82f6',
    closingDay,
    monthOffset,
    pluggyAccountId: input.pluggyAccountId ?? null
  };
}

async function assertNameAvailable(name) {
  if (await accountsRepo.getByName(name)) {
    throw badRequest('Já existe uma conta com este nome.');
  }
}

function stripUndefined(obj) {
  return Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== undefined));
}
