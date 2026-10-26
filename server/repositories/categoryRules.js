import { getDb } from '../db/client.js';

export async function listAll() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT merchant_key, category FROM category_rules');
  return new Map(rows.map(r => [r.merchant_key, r.category]));
}

export async function upsert(merchantKey, category) {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO category_rules (merchant_key, category) VALUES (?, ?)
          ON CONFLICT (merchant_key) DO UPDATE SET category = excluded.category`,
    args: [merchantKey, category]
  });
}
