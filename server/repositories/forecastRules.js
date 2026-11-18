import { getDb } from '../db/client.js';

export async function listAll() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT merchant_key, forecast_key FROM forecast_rules');
  return new Map(rows.map(r => [r.merchant_key, r.forecast_key]));
}

export async function upsert(merchantKey, forecastKey) {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO forecast_rules (merchant_key, forecast_key) VALUES (?, ?)
          ON CONFLICT (merchant_key) DO UPDATE SET forecast_key = excluded.forecast_key`,
    args: [merchantKey, forecastKey]
  });
}

export async function remove(merchantKey) {
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM forecast_rules WHERE merchant_key = ?', args: [merchantKey] });
}
