import { getDb } from '../db/client.js';

const TTL_MS = 24 * 60 * 60 * 1000;

// Reserva a chave para esta ação. Devolve true se é a primeira vez que ela aparece.
export async function claim(key, scope) {
  const db = await getDb();
  await db.execute({
    sql: 'DELETE FROM idempotency_keys WHERE created_at < ?',
    args: [new Date(Date.now() - TTL_MS).toISOString()]
  });
  const { rows } = await db.execute({
    sql: `INSERT INTO idempotency_keys (key, scope, created_at) VALUES (?, ?, ?)
          ON CONFLICT (key) DO NOTHING
          RETURNING key`,
    args: [key, scope, new Date().toISOString()]
  });
  return rows.length === 1;
}

export async function get(key) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT scope, status, body FROM idempotency_keys WHERE key = ?', args: [key] });
  if (!rows[0]) return null;
  return {
    scope: rows[0].scope,
    status: rows[0].status === null ? null : Number(rows[0].status),
    body: rows[0].body
  };
}

export async function complete(key, status, body) {
  const db = await getDb();
  await db.execute({
    sql: 'UPDATE idempotency_keys SET status = ?, body = ? WHERE key = ?',
    args: [status, JSON.stringify(body ?? null), key]
  });
}

// Falha do servidor: libera a chave para que uma nova tentativa execute de novo.
export async function release(key) {
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM idempotency_keys WHERE key = ?', args: [key] });
}
