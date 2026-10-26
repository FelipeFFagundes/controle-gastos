// Adaptador Postgres (Supabase) com a mesma interface do cliente libSQL usada no app:
//   execute(sql | { sql, args }) -> { rows }
//   batch(statements)            -> executa tudo numa transação
//   close()
// As consultas são escritas uma vez, com `?`, e convertidas aqui para `$1, $2...`.

export function toPgPlaceholders(sql) {
  let index = 0;
  let inString = false;
  let out = '';
  for (const ch of sql) {
    if (ch === "'") inString = !inString;
    out += ch === '?' && !inString ? `$${++index}` : ch;
  }
  return out;
}

function normalize(statement) {
  return typeof statement === 'string'
    ? { text: toPgPlaceholders(statement), values: [] }
    : { text: toPgPlaceholders(statement.sql), values: statement.args ?? [] };
}

// `driver` esconde a diferença entre o pg (produção) e o PGlite (testes):
//   query(text, values) -> { rows }
//   transaction(fn)     -> fn recebe um objeto com query(text, values)
function wrap(driver) {
  return {
    dialect: 'postgres',
    async execute(statement) {
      const { text, values } = normalize(statement);
      const { rows } = await driver.query(text, values);
      return { rows };
    },
    async batch(statements) {
      await driver.transaction(async (tx) => {
        for (const statement of statements) {
          const { text, values } = normalize(statement);
          await tx.query(text, values);
        }
      });
    },
    close: () => driver.close()
  };
}

export async function openPostgres(url) {
  const { default: pg } = await import('pg');
  const connection = new URL(url);
  const isLocal = ['localhost', '127.0.0.1'].includes(connection.hostname);
  // O sslmode da URL faria o pg exigir verificação completa do certificado, que o pooler do Supabase não passa.
  connection.searchParams.delete('sslmode');

  const pool = new pg.Pool({
    connectionString: connection.toString(),
    ssl: isLocal ? false : { rejectUnauthorized: false },
    // Na Vercel cada instância atende uma requisição por vez; poucas conexões bastam.
    max: 3,
    idleTimeoutMillis: 10_000
  });

  return wrap({
    query: (text, values) => pool.query(text, values),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await fn({ query: (text, values) => client.query(text, values) });
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end()
  });
}

// Postgres em memória, só para os testes (npm run test:pg).
export async function openPglite() {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  return wrap({
    query: (text, values) => db.query(text, values),
    transaction: (fn) => db.transaction(tx => fn({ query: (text, values) => tx.query(text, values) })),
    close: () => db.close()
  });
}
