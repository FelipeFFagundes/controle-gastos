import { test } from 'node:test';
import assert from 'node:assert/strict';
import { open } from './client.js';
import { migrate } from './schema.js';

test('migração da paleta troca só as cores padrão antigas', async () => {
  const db = await open(process.env.TEST_DATABASE_URL || ':memory:');
  // Simula um banco criado antes da paleta nova.
  await db.batch([
    { sql: "UPDATE categories SET color = '#f59e0b' WHERE id = 'cat-1'", args: [] },
    { sql: "UPDATE categories SET color = '#123456' WHERE id = 'cat-2'", args: [] },
    { sql: "INSERT INTO accounts (id, name, type, color) VALUES ('a1', 'Nubank', 'credit_card', '#820AD1')", args: [] },
    { sql: "INSERT INTO accounts (id, name, type, color) VALUES ('a2', 'Minha', 'bank_account', '#abcdef')", args: [] },
    { sql: 'DELETE FROM schema_version WHERE version >= 3', args: [] },
    // As migrações depois da 3 são refeitas junto.
    { sql: 'DROP TABLE idempotency_keys', args: [] }
  ]);

  await migrate(db);

  const color = async (sql) => (await db.execute(sql)).rows[0].color;
  assert.equal(await color("SELECT color FROM categories WHERE id = 'cat-1'"), '#BF8418');
  assert.equal(await color("SELECT color FROM categories WHERE id = 'cat-2'"), '#123456');
  assert.equal(await color("SELECT color FROM accounts WHERE id = 'a1'"), '#9E6AD3');
  assert.equal(await color("SELECT color FROM accounts WHERE id = 'a2'"), '#abcdef');
  await db.close();
});
