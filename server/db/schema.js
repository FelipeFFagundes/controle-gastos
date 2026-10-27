import { DEFAULT_CATEGORIES, LEGACY_ACCOUNT_COLORS, LEGACY_CATEGORY_COLORS } from './defaults.js';

// Migrações incrementais. Cada item roda uma única vez, em ordem, e fica registrado
// em schema_version. Para mudar o esquema, adicione um item novo ao fim da lista.
// Use só SQL que funcione no SQLite e no Postgres (os testes rodam nos dois: npm test e npm run test:pg).
const MIGRATIONS = [
  [
    `CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      icon TEXT
    )`,
    `CREATE TABLE accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('credit_card', 'bank_account', 'cash')),
      color TEXT NOT NULL,
      closing_day INTEGER CHECK (closing_day BETWEEN 1 AND 31),
      month_offset INTEGER NOT NULL DEFAULT 0 CHECK (month_offset BETWEEN -1 AND 1),
      pluggy_account_id TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX accounts_name_unique ON accounts (lower(name))`,
    `CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
      type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
      category TEXT NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      date TEXT NOT NULL,
      month TEXT NOT NULL,
      month_locked INTEGER NOT NULL DEFAULT 0,
      paid INTEGER NOT NULL DEFAULT 0,
      installment_current INTEGER,
      installment_total INTEGER,
      installment_group TEXT,
      pluggy_id TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX transactions_month ON transactions (month)`,
    `CREATE INDEX transactions_account ON transactions (account_id)`,
    `CREATE INDEX transactions_group ON transactions (installment_group)`,
    `CREATE TABLE month_settings (
      month TEXT PRIMARY KEY,
      surplus_target_cents INTEGER
    )`,
    // Transações da Pluggy que o usuário excluiu: não devem voltar no próximo sync.
    `CREATE TABLE pluggy_ignored (
      pluggy_id TEXT PRIMARY KEY
    )`,
    // Conexões (items) criadas pelo widget da Pluggy.
    `CREATE TABLE pluggy_items (
      item_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ],
  [
    // Categoria escolhida pelo usuário para cada loja (chave de domain/merchant.js).
    `CREATE TABLE category_rules (
      merchant_key TEXT PRIMARY KEY,
      category TEXT NOT NULL
    )`
  ],
  // Paleta nova: troca as cores padrão antigas pelas equivalentes. Cores escolhidas pelo usuário ficam.
  [
    ...DEFAULT_CATEGORIES.map(c => ({
      sql: 'UPDATE categories SET color = ? WHERE id = ? AND lower(color) = ?',
      args: [c.color, c.id, LEGACY_CATEGORY_COLORS[c.id]]
    })),
    ...Object.entries(LEGACY_ACCOUNT_COLORS).map(([from, to]) => ({
      sql: 'UPDATE accounts SET color = ? WHERE lower(color) = ?',
      args: [to, from]
    }))
  ],
  [
    // Ações já processadas, pela chave enviada pelo aparelho (Idempotency-Key).
    // Um reenvio após falha de rede devolve a mesma resposta em vez de repetir a ação.
    `CREATE TABLE idempotency_keys (
      key TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      status INTEGER,
      body TEXT,
      created_at TEXT NOT NULL
    )`
  ]
];

export async function migrate(client) {
  await client.execute('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const current = await currentVersion(client);

  for (let version = current + 1; version <= MIGRATIONS.length; version++) {
    const statements = MIGRATIONS[version - 1].map(s => (typeof s === 'string' ? { sql: s, args: [] } : s));
    statements.push({ sql: 'INSERT INTO schema_version (version) VALUES (?)', args: [version] });
    if (version === 1) {
      for (const c of DEFAULT_CATEGORIES) {
        statements.push({
          sql: 'INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
          args: [c.id, c.name, c.color, c.icon]
        });
      }
    }
    try {
      await client.batch(statements, 'write');
    } catch (err) {
      // Na Vercel duas instâncias podem subir juntas e tentar migrar ao mesmo tempo.
      // Se a outra já aplicou esta versão, segue; senão o erro é real.
      if (await currentVersion(client) >= version) continue;
      throw err;
    }
  }
}

async function currentVersion(client) {
  const { rows } = await client.execute('SELECT MAX(version) AS v FROM schema_version');
  return Number(rows[0]?.v ?? 0);
}
