// Notificações no celular via Web Push (padrão dos navegadores, sem serviço de terceiros além
// do servidor de push do próprio navegador: Google, Apple ou Mozilla).
//   1. O app pede permissão e registra o aparelho (POST /api/push/subscribe).
//   2. Depois da sincronização automática, o servidor manda o resumo do mês a todos os aparelhos.
//   3. O Service Worker (client/public/sw.js) mostra a notificação, mesmo com o app fechado.
import { sendNotification } from 'web-push';
import { config } from '../config.js';
import * as subscriptionsRepo from '../repositories/pushSubscriptions.js';
import * as transactions from './transactions.js';
import { buildSyncNotification } from '../domain/notification.js';
import { currentMonth } from '../domain/months.js';
import { badRequest } from './errors.js';

// Quanto tempo o servidor de push guarda a mensagem se o celular estiver sem sinal.
const TTL_SECONDS = 12 * 60 * 60;

let send = (subscription, payload, options) => sendNotification(subscription, payload, options);

// Para testes: troca o envio real por um falso.
export function setSender(fn) {
  send = fn;
}

export function isConfigured() {
  return Boolean(config.vapidPublicKey && config.vapidPrivateKey);
}

export function publicKey() {
  return isConfigured() ? config.vapidPublicKey : null;
}

export async function subscribe(subscription) {
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')
    || typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string') {
    throw badRequest('Inscrição de notificação inválida.');
  }
  await subscriptionsRepo.upsert({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
}

export async function unsubscribe(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint) throw badRequest('Informe o endpoint.');
  await subscriptionsRepo.remove(endpoint);
}

// Envia para todos os aparelhos. Os que o navegador já descartou (404/410) saem da lista.
export async function sendToAll(notification) {
  if (!isConfigured()) return { sent: 0, failed: 0, skipped: true };
  const subscriptions = await subscriptionsRepo.listAll();
  const payload = JSON.stringify(notification);
  const options = {
    TTL: TTL_SECONDS,
    vapidDetails: { subject: config.vapidSubject, publicKey: config.vapidPublicKey, privateKey: config.vapidPrivateKey }
  };

  let sent = 0;
  let failed = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await send(subscription, payload, options);
      sent++;
    } catch (err) {
      failed++;
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await subscriptionsRepo.remove(subscription.endpoint);
      } else {
        console.warn(`[Push] falha ao enviar: ${err?.statusCode || ''} ${err?.body || err?.message}`);
      }
    }
  }));
  return { sent, failed, skipped: false };
}

// Resumo do mês atual depois de uma sincronização: quanto ainda dá para gastar e o que mudou.
export async function notifySyncResult(syncResult, now = new Date()) {
  if (!isConfigured()) return { sent: 0, failed: 0, skipped: true };
  const month = currentMonth(now);
  const { summary } = await transactions.getMonth(month);
  return sendToAll(buildSyncNotification(syncResult, summary.availableToSpend, month));
}
