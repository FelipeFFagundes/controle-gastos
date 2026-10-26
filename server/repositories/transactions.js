import crypto from 'crypto';
import { getDb } from '../db/client.js';
import { fromCents, toCents } from '../domain/summary.js';

const SELECT = `
  SELECT t.*, a.name AS account_name
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id`;

export function newTransactionId() {
  return `tx-${crypto.randomUUID()}`;
}

// Formato exposto pela API. `account` (nome) é mantido para a interface exibir e filtrar.
function toTransaction(row) {
  return {
    id: row.id,
    description: row.description,
    amount: fromCents(Number(row.amount_cents)),
    type: row.type,
    category: row.category,
    accountId: row.account_id,
    account: row.account_name,
    date: row.date,
    month: row.month,
    monthLocked: Boolean(row.month_locked),
    paid: Boolean(row.paid),
    installment: row.installment_total
      ? { current: Number(row.installment_current), total: Number(row.installment_total) }
      : null,
    installmentGroup: row.installment_group,
    pluggyId: row.pluggy_id
  };
}

export async function listByMonth(month) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: `${SELECT} WHERE t.month = ? ORDER BY t.date DESC, t.created_at DESC`, args: [month] });
  return rows.map(toTransaction);
}

export async function listInstallments() {
  const db = await getDb();
  const { rows } = await db.execute(`${SELECT} WHERE t.type = 'expense' AND t.installment_total >= 2`);
  return rows.map(toTransaction);
}

export async function listMonths() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT DISTINCT month FROM transactions ORDER BY month');
  return rows.map(r => r.month);
}

export async function getById(id) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: `${SELECT} WHERE t.id = ?`, args: [id] });
  return rows[0] ? toTransaction(rows[0]) : null;
}

export async function listForAccount(accountId) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: `${SELECT} WHERE t.account_id = ?`, args: [accountId] });
  return rows.map(toTransaction);
}

export async function countByAccount(accountId) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM transactions WHERE account_id = ?', args: [accountId] });
  return Number(rows[0].n);
}

export async function findByPluggyId(pluggyId) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: `${SELECT} WHERE t.pluggy_id = ?`, args: [pluggyId] });
  return rows[0] ? toTransaction(rows[0]) : null;
}

// Lançamento manual idêntico (mesma conta, data, valor e descrição) ainda sem vínculo com a Pluggy.
export async function findUnlinkedTwin({ accountId, date, amount, description }) {
  const db = await getDb();
  const { rows } = await db.execute({
    sql: `${SELECT}
      WHERE t.pluggy_id IS NULL AND t.account_id = ? AND t.date = ? AND t.amount_cents = ?
        AND lower(trim(t.description)) = lower(trim(?))
      LIMIT 1`,
    args: [accountId, date, toCents(amount), description]
  });
  return rows[0] ? toTransaction(rows[0]) : null;
}

export function insertStatement(tx) {
  return {
    sql: `INSERT INTO transactions
      (id, description, amount_cents, type, category, account_id, date, month, month_locked, paid,
       installment_current, installment_total, installment_group, pluggy_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      tx.id || newTransactionId(),
      tx.description,
      toCents(tx.amount),
      tx.type,
      tx.category,
      tx.accountId,
      tx.date,
      tx.month,
      tx.monthLocked ? 1 : 0,
      tx.paid ? 1 : 0,
      tx.installment?.current ?? null,
      tx.installment?.total ?? null,
      tx.installmentGroup ?? null,
      tx.pluggyId ?? null
    ]
  };
}

export function updateStatement(tx) {
  return {
    sql: `UPDATE transactions SET
      description = ?, amount_cents = ?, type = ?, category = ?, account_id = ?, date = ?, month = ?,
      month_locked = ?, paid = ?, installment_current = ?, installment_total = ?, installment_group = ?,
      pluggy_id = ?
      WHERE id = ?`,
    args: [
      tx.description,
      toCents(tx.amount),
      tx.type,
      tx.category,
      tx.accountId,
      tx.date,
      tx.month,
      tx.monthLocked ? 1 : 0,
      tx.paid ? 1 : 0,
      tx.installment?.current ?? null,
      tx.installment?.total ?? null,
      tx.installmentGroup ?? null,
      tx.pluggyId ?? null,
      tx.id
    ]
  };
}

export async function insertMany(transactions) {
  if (!transactions.length) return;
  const db = await getDb();
  await db.batch(transactions.map(insertStatement), 'write');
}

export async function update(tx) {
  const db = await getDb();
  await db.execute(updateStatement(tx));
}

export async function setMonths(updates) {
  if (!updates.length) return;
  const db = await getDb();
  await db.batch(updates.map(u => ({ sql: 'UPDATE transactions SET month = ? WHERE id = ?', args: [u.month, u.id] })), 'write');
}

export async function listByCategory(category) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: `${SELECT} WHERE t.type = 'expense' AND t.category = ?`, args: [category] });
  return rows.map(toTransaction);
}

export async function setCategory(ids, category) {
  if (!ids.length) return;
  const db = await getDb();
  await db.batch(ids.map(id => ({ sql: 'UPDATE transactions SET category = ? WHERE id = ?', args: [category, id] })), 'write');
}

export async function togglePaid(id) {
  const db = await getDb();
  await db.execute({ sql: 'UPDATE transactions SET paid = 1 - paid WHERE id = ?', args: [id] });
}

export async function remove(tx) {
  const db = await getDb();
  const statements = [{ sql: 'DELETE FROM transactions WHERE id = ?', args: [tx.id] }];
  if (tx.pluggyId) {
    statements.push({ sql: 'INSERT INTO pluggy_ignored (pluggy_id) VALUES (?) ON CONFLICT DO NOTHING', args: [tx.pluggyId] });
  }
  await db.batch(statements, 'write');
}

export async function listIgnoredPluggyIds() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT pluggy_id FROM pluggy_ignored');
  return new Set(rows.map(r => r.pluggy_id));
}
