// Migra os dados do formato antigo para o banco novo (SQLite local, Supabase ou Turso, conforme DATABASE_URL).
//
//   node scripts/import-legacy.js caminho/para/database.json
//   node scripts/import-legacy.js --upstash      (lê a chave finance_db do Upstash/Vercel KV)
//
// ATENÇÃO: substitui as contas e lançamentos existentes no banco de destino.
import fs from 'fs';
import { config } from '../server/config.js';
import { importLegacyData } from '../server/services/legacyImport.js';
import { getDb } from '../server/db/client.js';

async function loadFromUpstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Defina UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN.');
  const res = await fetch(`${url}/get/finance_db`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (!body?.result) throw new Error('Chave finance_db não encontrada no Upstash.');
  return JSON.parse(body.result);
}

const source = process.argv[2];
if (!source) {
  console.error('Uso: node scripts/import-legacy.js <arquivo.json> | --upstash');
  process.exit(1);
}

const data = source === '--upstash'
  ? await loadFromUpstash()
  : JSON.parse(fs.readFileSync(source, 'utf-8'));

// Mostra só o servidor, nunca a senha que vem na URL.
console.log(`Destino: ${config.databaseUrl ? new URL(config.databaseUrl).host : 'server/data/gastos.db (local)'}`);
const result = await importLegacyData(data);
console.log(`Importado: ${result.accounts} conta(s), ${result.imported} lançamento(s). Ignorados: ${result.skipped}.`);
(await getDb()).close();
