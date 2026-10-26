// Sincronização automática das despesas recentes.
//   Local  -> timer no próprio servidor (SYNC_INTERVAL_HOURS).
//   Vercel -> Cron da Vercel chama GET /api/cron/sync (ver vercel.json).
import { config } from '../config.js';
import * as pluggySync from '../services/pluggySync.js';

// Últimos dias relidos a cada rodada: cobre compras que mudam de "pendente" para "lançada".
export const AUTO_SYNC_PERIOD = '7d';
const FIRST_RUN_DELAY_MS = 60 * 1000;

export async function runAutoSync(trigger) {
  if (!pluggySync.isConfigured()) {
    return { skipped: true, message: 'Pluggy não configurada.' };
  }
  const started = Date.now();
  try {
    const result = await pluggySync.sync({ period: AUTO_SYNC_PERIOD });
    console.log(`[Auto Sync] (${trigger}) ${result.message} [${Math.round((Date.now() - started) / 1000)}s]`);
    return result;
  } catch (err) {
    console.warn(`[Auto Sync] (${trigger}) falhou: ${err.message}`);
    throw err;
  }
}

export function startAutoSync() {
  const hours = config.syncIntervalHours;
  if (!hours) return null;
  if (!pluggySync.isConfigured()) {
    console.warn('[Auto Sync] SYNC_INTERVAL_HOURS definido, mas a Pluggy não está configurada. Job desligado.');
    return null;
  }

  const run = () => runAutoSync('agendada').catch(() => {});
  // Uma rodada logo após subir (o PC pode ter ficado desligado) e depois de X em X horas.
  const first = setTimeout(run, FIRST_RUN_DELAY_MS);
  const interval = setInterval(run, hours * 60 * 60 * 1000);
  first.unref();
  interval.unref();
  console.log(` Sincronização automática: a cada ${hours}h (últimos 7 dias)`);
  return { stop: () => { clearTimeout(first); clearInterval(interval); } };
}
