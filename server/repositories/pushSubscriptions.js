import { getDb } from '../db/client.js';

// Formato usado pela lib web-push: { endpoint, keys: { p256dh, auth } }.
export async function listAll() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT endpoint, p256dh, auth FROM push_subscriptions');
  return rows.map(r => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }));
}

export async function upsert({ endpoint, keys }) {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)
          ON CONFLICT (endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [endpoint, keys.p256dh, keys.auth]
  });
}

export async function remove(endpoint) {
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?', args: [endpoint] });
}
