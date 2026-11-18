import crypto from 'crypto';
import * as transactionsRepo from '../repositories/transactions.js';
import * as accountsRepo from '../repositories/accounts.js';
import * as settingsRepo from '../repositories/settings.js';
import * as categoryRulesRepo from '../repositories/categoryRules.js';
import * as forecastRulesRepo from '../repositories/forecastRules.js';
import { billingMonth } from '../domain/billing.js';
import { buildInstallmentSeries, isValidInstallment, summarizeInstallments } from '../domain/installments.js';
import { currentMonth, isValidDate, isValidMonth } from '../domain/months.js';
import { computeMonthSummary } from '../domain/summary.js';
import { merchantKey } from '../domain/merchant.js';
import { annotateForecasts, isForecast, NOT_LINKED, proposeLinks } from '../domain/forecast.js';
import { badRequest, notFound } from './errors.js';

const TYPES = ['expense', 'income', 'transfer'];
const UNCATEGORIZED = 'Outros';

export async function getMonth(month) {
  assertMonth(month);
  const [transactions, accounts, surplusTarget] = await Promise.all([
    transactionsRepo.listByMonth(month),
    accountsRepo.list(),
    settingsRepo.getSurplusTarget(month)
  ]);
  return {
    month,
    transactions: annotateForecasts(transactions),
    customSurplusTarget: surplusTarget,
    summary: computeMonthSummary(transactions, accounts, surplusTarget)
  };
}

export async function listMonths() {
  const months = new Set(await transactionsRepo.listMonths());
  months.add(currentMonth());
  return Array.from(months).sort();
}

export async function getInstallments(month) {
  assertMonth(month);
  return summarizeInstallments(await transactionsRepo.listInstallments(), month);
}

export async function setSurplusTarget(month, target) {
  assertMonth(month);
  const value = target === null || target === undefined || target === '' ? null : Number(target);
  if (value !== null && !Number.isFinite(value)) throw badRequest('Meta de sobra inválida.');
  await settingsRepo.setSurplusTarget(month, value);
  return value;
}

export async function create(input) {
  const data = await parseInput(input);
  const computedMonth = billingMonth(data.account, data.date);
  const month = data.month || computedMonth;
  const monthLocked = month !== computedMonth;

  const base = {
    description: data.description,
    amount: data.amount,
    type: data.type,
    category: data.category,
    accountId: data.account.id,
    paid: data.paid
  };

  let records;
  if (data.installment && data.generateFutureMonths) {
    const group = `grp-${crypto.randomUUID()}`;
    records = buildInstallmentSeries({ date: data.date, month, ...data.installment }).map((part, i) => ({
      ...base,
      id: transactionsRepo.newTransactionId(),
      date: part.date,
      month: part.month,
      monthLocked,
      paid: i === 0 ? data.paid : false,
      installment: { current: part.current, total: part.total },
      installmentGroup: group
    }));
  } else {
    records = [{
      ...base,
      id: transactionsRepo.newTransactionId(),
      date: data.date,
      month,
      monthLocked,
      installment: data.installment,
      installmentGroup: data.installment ? `grp-${crypto.randomUUID()}` : null
    }];
  }

  await transactionsRepo.insertMany(records);
  if (data.type === 'income') await reconcileForecasts([...new Set(records.map(r => r.month))]);
  return Promise.all(records.map(r => transactionsRepo.getById(r.id)));
}

export async function update(id, input) {
  const existing = await transactionsRepo.getById(id);
  if (!existing) throw notFound('Lançamento não encontrado.');

  const merged = {
    description: existing.description,
    amount: existing.amount,
    type: existing.type,
    category: existing.category,
    accountId: existing.accountId,
    date: existing.date,
    paid: existing.paid,
    isInstallment: Boolean(existing.installment),
    currentInstallment: existing.installment?.current,
    totalInstallments: existing.installment?.total,
    ...stripUndefined(input),
    generateFutureMonths: false
  };
  const data = await parseInput(merged);

  const computedMonth = billingMonth(data.account, data.date);
  let month;
  let monthLocked;
  if (data.month) {
    month = data.month;
    monthLocked = month !== computedMonth;
  } else if (existing.monthLocked && data.date === existing.date && data.account.id === existing.accountId) {
    month = existing.month;
    monthLocked = true;
  } else {
    month = computedMonth;
    monthLocked = false;
  }

  const updated = {
    ...existing,
    description: data.description,
    amount: data.amount,
    type: data.type,
    category: data.category,
    accountId: data.account.id,
    date: data.date,
    month,
    monthLocked,
    paid: data.paid,
    installment: data.installment,
    installmentGroup: data.installment ? (existing.installmentGroup || `grp-${crypto.randomUUID()}`) : null
  };
  await transactionsRepo.update(updated);

  const recategorized = updated.type === 'expense' && updated.category !== existing.category
    ? await learnCategory(updated)
    : 0;
  if (existing.type === 'income' || updated.type === 'income') {
    // Mudou de mês, valor ou deixou de ser entrada: os vínculos com previsões são refeitos.
    if (existing.forecastId && (updated.type !== 'income' || updated.month !== existing.month)) {
      await transactionsRepo.setForecastLinks([{ id, forecastId: null }]);
    }
    await reconcileForecasts([...new Set([existing.month, updated.month])]);
  }
  return { transaction: await transactionsRepo.getById(id), recategorized };
}

// Lembra a categoria escolhida para a loja: vale para os próximos lançamentos da sincronização
// e corrige agora os da mesma loja que ainda estão em "Outros". Devolve quantos foram corrigidos.
async function learnCategory(tx) {
  const key = merchantKey(tx.description);
  if (!key) return 0;
  await categoryRulesRepo.upsert(key, tx.category);
  if (tx.category === UNCATEGORIZED) return 0;
  const sameMerchant = (await transactionsRepo.listByCategory(UNCATEGORIZED))
    .filter(t => t.id !== tx.id && merchantKey(t.description) === key)
    .map(t => t.id);
  await transactionsRepo.setCategory(sameMerchant, tx.category);
  return sameMerchant.length;
}

// Liga os depósitos soltos dos meses às previsões (salário etc.). Chamado após sync e edições.
export async function reconcileForecasts(months) {
  const rules = await forecastRulesRepo.listAll();
  for (const month of months) {
    const links = proposeLinks(await transactionsRepo.listByMonth(month), rules);
    await transactionsRepo.setForecastLinks(links);
  }
}

// O usuário diz de qual previsão um depósito faz parte (ou que não faz parte de nenhuma).
// A escolha vira regra: os próximos depósitos da mesma origem vão para a previsão de mesmo nome.
export async function setForecast(id, forecastId) {
  const deposit = await transactionsRepo.getById(id);
  if (!deposit) throw notFound('Lançamento não encontrado.');
  if (deposit.type !== 'income' || !deposit.pluggyId) {
    throw badRequest('Só entradas que vieram do banco podem ser ligadas a uma previsão.');
  }
  const key = merchantKey(deposit.description);

  if (!forecastId) {
    await transactionsRepo.setForecastLinks([{ id, forecastId: NOT_LINKED }]);
    if (key) await forecastRulesRepo.remove(key);
    return transactionsRepo.getById(id);
  }

  const forecast = await transactionsRepo.getById(forecastId);
  if (!forecast || !isForecast(forecast)) throw badRequest('Escolha uma entrada lançada à mão (a previsão).');
  if (forecast.month !== deposit.month) throw badRequest('A previsão precisa ser do mesmo mês do depósito.');

  await transactionsRepo.setForecastLinks([{ id, forecastId }]);
  const forecastKey = merchantKey(forecast.description);
  if (key && forecastKey) await forecastRulesRepo.upsert(key, forecastKey);
  return transactionsRepo.getById(id);
}

export async function setPaid(id, paid) {
  if (typeof paid !== 'boolean') throw badRequest('Informe paid como true ou false.');
  const existing = await transactionsRepo.getById(id);
  if (!existing) throw notFound('Lançamento não encontrado.');
  await transactionsRepo.setPaid(id, paid);
  return transactionsRepo.getById(id);
}

export async function remove(id) {
  const existing = await transactionsRepo.getById(id);
  if (!existing) throw notFound('Lançamento não encontrado.');
  await transactionsRepo.remove(existing);
}

async function parseInput(input) {
  const description = String(input.description ?? '').trim();
  if (!description) throw badRequest('Informe a descrição.');

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw badRequest('Informe um valor maior que zero.');

  const type = input.type || 'expense';
  if (!TYPES.includes(type)) throw badRequest('Tipo de lançamento inválido.');

  if (!isValidDate(input.date)) throw badRequest('Data inválida (use AAAA-MM-DD).');

  const month = input.month ? String(input.month).trim() : '';
  if (month && !isValidMonth(month)) throw badRequest('Mês da fatura inválido (use AAAA-MM).');

  const account = input.accountId ? await accountsRepo.getById(input.accountId) : null;
  if (!account) throw badRequest('Selecione uma conta ou cartão válido.');

  const category = type === 'income'
    ? 'Salário & Entradas'
    : (String(input.category ?? '').trim() || 'Outros');

  let installment = null;
  if (type === 'expense' && input.isInstallment) {
    const current = Number(input.currentInstallment);
    const total = Number(input.totalInstallments);
    if (!isValidInstallment(current, total)) {
      throw badRequest('Parcelamento inválido: a parcela atual deve estar entre 1 e o total (2 a 48).');
    }
    installment = { current, total };
  }

  return {
    description,
    amount,
    type,
    date: input.date,
    month,
    account,
    category,
    paid: Boolean(input.paid),
    installment,
    generateFutureMonths: input.generateFutureMonths !== false
  };
}

function assertMonth(month) {
  if (!isValidMonth(month)) throw badRequest('Mês inválido (use AAAA-MM).');
}

function stripUndefined(obj) {
  return Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== undefined));
}
