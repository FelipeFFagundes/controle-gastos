import crypto from 'crypto';
import { getDb } from '../db/client.js';
import { offsetToBillingCycle } from '../domain/billing.js';

function toAccount(row) {
  const monthOffset = Number(row.month_offset);
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    closingDay: row.closing_day === null ? null : Number(row.closing_day),
    monthOffset,
    billingCycle: offsetToBillingCycle(monthOffset),
    pluggyAccountId: row.pluggy_account_id
  };
}

export function newAccountId() {
  return `acc-${crypto.randomUUID()}`;
}

export async function list() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT * FROM accounts ORDER BY created_at, name');
  return rows.map(toAccount);
}

export async function getById(id) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT * FROM accounts WHERE id = ?', args: [id] });
  return rows[0] ? toAccount(rows[0]) : null;
}

export async function getByName(name) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT * FROM accounts WHERE lower(name) = lower(?)', args: [name] });
  return rows[0] ? toAccount(rows[0]) : null;
}

export async function getByPluggyId(pluggyAccountId) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT * FROM accounts WHERE pluggy_account_id = ?', args: [pluggyAccountId] });
  return rows[0] ? toAccount(rows[0]) : null;
}

export function insertStatement(account) {
  return {
    sql: `INSERT INTO accounts (id, name, type, color, closing_day, month_offset, pluggy_account_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      account.id,
      account.name,
      account.type,
      account.color,
      account.closingDay ?? null,
      account.monthOffset ?? 0,
      account.pluggyAccountId ?? null
    ]
  };
}

export async function insert(account) {
  const db = await getDb();
  const record = { ...account, id: account.id || newAccountId() };
  await db.execute(insertStatement(record));
  return getById(record.id);
}

export async function update(account) {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE accounts SET name = ?, type = ?, color = ?, closing_day = ?, month_offset = ?, pluggy_account_id = ?
          WHERE id = ?`,
    args: [
      account.name,
      account.type,
      account.color,
      account.closingDay ?? null,
      account.monthOffset ?? 0,
      account.pluggyAccountId ?? null,
      account.id
    ]
  });
  return getById(account.id);
}

export async function remove(id, { withTransactions = false } = {}) {
  const db = await getDb();
  const statements = [];
  if (withTransactions) {
    statements.push({ sql: 'DELETE FROM transactions WHERE account_id = ?', args: [id] });
  }
  statements.push({ sql: 'DELETE FROM accounts WHERE id = ?', args: [id] });
  await db.batch(statements, 'write');
}
