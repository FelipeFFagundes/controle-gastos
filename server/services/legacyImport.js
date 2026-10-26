// Importa dados no formato antigo (database.json / Upstash: contas e lançamentos ligados
// pelo NOME da conta) para o banco relacional. Usado pela migração e pelo "Restaurar".
import crypto from 'crypto';
import { getDb } from '../db/client.js';
import * as accountsRepo from '../repositories/accounts.js';
import * as transactionsRepo from '../repositories/transactions.js';
import { billingMonth } from '../domain/billing.js';
import { installmentGroupKey, isValidInstallment } from '../domain/installments.js';
import { isValidDate, isValidMonth } from '../domain/months.js';
import { toCents } from '../domain/summary.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Substitui todos os dados financeiros atuais pelos importados (numa única transação).
export async function importLegacyData(data) {
  const statements = ['DELETE FROM transactions', 'DELETE FROM pluggy_ignored', 'DELETE FROM accounts', 'DELETE FROM month_settings'];

  const accountsByName = new Map();
  const addAccount = (legacy) => {
    const key = legacy.name.trim().toLowerCase();
    if (accountsByName.has(key)) return accountsByName.get(key);
    const pluggyId = String(legacy.id || '').startsWith('acc-pluggy-') ? legacy.id.slice('acc-pluggy-'.length) : null;
    const monthOffset = legacy.monthOffset !== undefined
      ? Number(legacy.monthOffset) || 0
      : legacy.billingCycle === 'previous_month' ? -1 : legacy.billingCycle === 'next_month' ? 1 : 0;
    const type = ['credit_card', 'bank_account', 'cash'].includes(legacy.type) ? legacy.type : 'bank_account';
    const account = {
      id: accountsRepo.newAccountId(),
      name: legacy.name.trim(),
      type,
      color: legacy.color || '#64748b',
      closingDay: type === 'credit_card' && legacy.closingDay ? Number(legacy.closingDay) : null,
      monthOffset: Math.max(-1, Math.min(1, monthOffset)),
      pluggyAccountId: pluggyId
    };
    accountsByName.set(key, account);
    statements.push(accountsRepo.insertStatement(account));
    return account;
  };

  for (const legacy of data.accounts || []) {
    if (legacy?.name?.trim()) addAccount(legacy);
  }

  let imported = 0;
  let skipped = 0;
  const seenPluggyIds = new Set();
  for (const t of data.transactions || []) {
    const amount = Math.abs(Number(t.amount));
    if (!t.description || !isValidDate(t.date) || !Number.isFinite(amount) || !t.account) {
      skipped++;
      continue;
    }
    if (t.pluggyId) {
      if (seenPluggyIds.has(t.pluggyId)) { skipped++; continue; }
      seenPluggyIds.add(t.pluggyId);
    }
    const account = addAccount({ name: t.account, type: 'bank_account' });
    const computed = billingMonth(account, t.date);
    const month = isValidMonth(t.month) ? t.month : computed;
    const installment = t.installment && isValidInstallment(Number(t.installment.current), Number(t.installment.total))
      ? { current: Number(t.installment.current), total: Number(t.installment.total) }
      : null;

    statements.push(transactionsRepo.insertStatement({
      id: `tx-${crypto.randomUUID()}`,
      description: String(t.description).trim(),
      amount: toCents(amount) / 100,
      type: t.type === 'income' ? 'income' : 'expense',
      category: t.category || 'Outros',
      accountId: account.id,
      date: t.date,
      month,
      monthLocked: month !== computed,
      paid: Boolean(t.paid),
      installment,
      installmentGroup: installment ? installmentGroupKey(t.description, account.id, installment.total) : null,
      pluggyId: t.pluggyId || null
    }));
    imported++;
  }

  // A lista antiga misturava ids da Pluggy com "assinaturas" (descrição_valor_data); só os ids servem.
  for (const id of data.deletedPluggyIds || []) {
    if (UUID_RE.test(id)) {
      statements.push({ sql: 'INSERT INTO pluggy_ignored (pluggy_id) VALUES (?) ON CONFLICT DO NOTHING', args: [id] });
    }
  }

  for (const [month, target] of Object.entries(data.customSurplus || {})) {
    if (isValidMonth(month) && Number.isFinite(Number(target))) {
      statements.push({
        sql: `INSERT INTO month_settings (month, surplus_target_cents) VALUES (?, ?)
              ON CONFLICT (month) DO UPDATE SET surplus_target_cents = excluded.surplus_target_cents`,
        args: [month, toCents(target)]
      });
    }
  }

  const db = await getDb();
  await db.batch(statements, 'write');
  return { accounts: accountsByName.size, imported, skipped };
}
