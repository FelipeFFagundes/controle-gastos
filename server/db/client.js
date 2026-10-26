import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import { createClient } from '@libsql/client';
import { config } from '../config.js';
import { migrate } from './schema.js';
import { openPostgres, openPglite } from './postgres.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.join(__dirname, '..', 'data', 'gastos.db');

let clientPromise = null;

// Mesmo código para todos os ambientes, escolhido pelo DATABASE_URL:
//   vazio          -> arquivo SQLite local (server/data/gastos.db)
//   postgresql://  -> Supabase (ou qualquer Postgres)
//   libsql://      -> Turso (+ DATABASE_AUTH_TOKEN)
export function getDb() {
  if (!clientPromise) {
    clientPromise = open(config.databaseUrl, config.databaseAuthToken);
  }
  return clientPromise;
}

export async function open(url, authToken) {
  if (/^postgres(ql)?:\/\//.test(url || '')) {
    const client = await openPostgres(url);
    await migrate(client);
    return client;
  }
  if (url === 'pglite:memory') {
    const client = await openPglite();
    await migrate(client);
    return client;
  }
  if (!url) {
    if (config.isVercel) {
      throw new Error('DATABASE_URL não configurada. Na Vercel é obrigatório usar um banco externo (Supabase: postgresql://...).');
    }
    fs.mkdirSync(path.dirname(DEFAULT_FILE), { recursive: true });
    url = pathToFileURL(DEFAULT_FILE).href;
  } else if (url.startsWith('file:') && !url.startsWith('file://')) {
    // Aceita "file:caminho/relativo.db" ou "file:C:/..." (formato que o libSQL não entende no Windows).
    url = pathToFileURL(path.resolve(url.slice('file:'.length))).href;
  }
  const client = createClient({ url, authToken });
  if (url.startsWith('file:')) {
    await client.execute('PRAGMA foreign_keys = ON');
    await client.execute('PRAGMA journal_mode = WAL');
  }
  await migrate(client);
  return client;
}

// Para testes: troca o banco por outro (ex.: em memória).
export function setDb(client) {
  clientPromise = Promise.resolve(client);
}
