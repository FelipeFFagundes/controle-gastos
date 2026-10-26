import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

if (fs.existsSync(ENV_PATH)) {
  try {
    process.loadEnvFile(ENV_PATH);
  } catch (err) {
    console.warn('Aviso: falha ao carregar .env:', err.message);
  }
}

// Lido sob demanda (getters) para que testes possam ajustar process.env.
export const config = {
  get port() { return Number(process.env.PORT) || 5000; },
  get isVercel() { return Boolean(process.env.VERCEL); },
  get appPin() { return (process.env.APP_PIN || '').trim(); },
  get authSecret() { return (process.env.AUTH_SECRET || '').trim(); },
  get databaseUrl() { return (process.env.DATABASE_URL || '').trim(); },
  get databaseAuthToken() { return (process.env.DATABASE_AUTH_TOKEN || '').trim() || undefined; },
  get pluggyClientId() { return (process.env.PLUGGY_CLIENT_ID || '').trim(); },
  get pluggyClientSecret() { return (process.env.PLUGGY_CLIENT_SECRET || '').trim(); },
  // Sincronização automática no servidor local, de X em X horas (0 = desligada).
  get syncIntervalHours() { return Math.max(0, Number(process.env.SYNC_INTERVAL_HOURS) || 0); },
  // Protege a rota chamada pelo Cron da Vercel.
  get cronSecret() { return (process.env.CRON_SECRET || '').trim(); }
};
