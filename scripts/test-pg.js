// Roda a mesma suíte de testes contra um Postgres em memória (PGlite), para garantir
// que o SQL funciona tanto no SQLite (local) quanto no Supabase (produção).
import { spawnSync } from 'child_process';

const result = spawnSync(process.execPath, ['--test', 'server/**/*.test.js'], {
  stdio: 'inherit',
  env: { ...process.env, TEST_DATABASE_URL: 'pglite:memory' }
});
process.exit(result.status ?? 1);
