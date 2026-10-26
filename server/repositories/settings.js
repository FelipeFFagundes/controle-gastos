import { getDb } from '../db/client.js';
import { fromCents, toCents } from '../domain/summary.js';

export async function listCategories() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT id, name, color, icon FROM categories ORDER BY id');
  return rows.map(r => ({ id: r.id, name: r.name, color: r.color, icon: r.icon }));
}

export async function getSurplusTarget(month) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT surplus_target_cents FROM month_settings WHERE month = ?', args: [month] });
  const cents = rows[0]?.surplus_target_cents;
  return cents === undefined || cents === null ? null : fromCents(Number(cents));
}

export async function setSurplusTarget(month, target) {
  const db = await getDb();
  if (target === null) {
    await db.execute({ sql: 'DELETE FROM month_settings WHERE month = ?', args: [month] });
    return;
  }
  await db.execute({
    sql: `INSERT INTO month_settings (month, surplus_target_cents) VALUES (?, ?)
          ON CONFLICT (month) DO UPDATE SET surplus_target_cents = excluded.surplus_target_cents`,
    args: [month, toCents(target)]
  });
}

export async function listPluggyItems() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT item_id FROM pluggy_items ORDER BY created_at');
  return rows.map(r => r.item_id);
}

export async function addPluggyItem(itemId) {
  const db = await getDb();
  await db.execute({ sql: 'INSERT INTO pluggy_items (item_id) VALUES (?) ON CONFLICT DO NOTHING', args: [itemId] });
}

// Apaga lançamentos, contas e o histórico de exclusões. Categorias, metas e conexões ficam.
export async function clearFinancialData() {
  const db = await getDb();
  await db.batch([
    'DELETE FROM transactions',
    'DELETE FROM pluggy_ignored',
    'DELETE FROM accounts'
  ], 'write');
}
