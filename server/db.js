import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initialData } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data', 'database.json');

// Memória local para ambientes serverless (Vercel)
let inMemoryDb = null;

// Verifica se há Upstash Redis / Vercel KV configurado nas variáveis de ambiente
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

/**
 * Lê o banco de dados (suporta Arquivo Local e Upstash/KV em nuvem para Vercel)
 */
export async function getDb() {
  // 1. Se estiver no Upstash / Vercel KV
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/finance_db`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      const data = await res.json();
      if (data && data.result) {
        return JSON.parse(data.result);
      }
      // Se não existir ainda no KV, inicializa com seed
      await saveDb(initialData);
      return JSON.parse(JSON.stringify(initialData));
    } catch (err) {
      console.error('Erro ao ler do Upstash KV:', err);
    }
  }

  // 2. Se estiver em ambiente local com sistema de arquivos
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    } else {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(initialData));
    }
  } catch (err) {
    // Fallback para memória em ambientes serverless sem disco gravável
    if (!inMemoryDb) {
      inMemoryDb = JSON.parse(JSON.stringify(initialData));
    }
    return inMemoryDb;
  }
}

/**
 * Salva o banco de dados de forma segura
 */
export async function saveDb(data) {
  // 1. Se estiver no Upstash / Vercel KV
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await fetch(`${UPSTASH_URL}/set/finance_db`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(JSON.stringify(data))
      });
      return;
    } catch (err) {
      console.error('Erro ao salvar no Upstash KV:', err);
    }
  }

  // 2. Se estiver em ambiente local
  try {
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    inMemoryDb = JSON.parse(JSON.stringify(data));
  }
}
