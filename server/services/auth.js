import crypto from 'crypto';
import { config } from '../config.js';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const failures = new Map();
let warnedAboutSecret = false;

export function isPinRequired() {
  return Boolean(config.appPin);
}

// Com AUTH_SECRET, quem obtiver um token não consegue descobrir o PIN testando
// as 1 milhão de combinações offline. Sem ele, a chave deriva só do PIN.
function signingKey() {
  if (config.authSecret) return config.authSecret;
  if (!warnedAboutSecret) {
    console.warn('[Auth] AUTH_SECRET não definido: defina um valor aleatório longo para proteger os tokens.');
    warnedAboutSecret = true;
  }
  return `controle-gastos:${config.appPin}`;
}

function sign(expiresAt) {
  // O hash do PIN entra na assinatura: trocar o PIN invalida todos os tokens.
  const pinHash = crypto.createHash('sha256').update(config.appPin).digest('hex');
  return crypto.createHmac('sha256', signingKey()).update(`v1:${expiresAt}:${pinHash}`).digest('hex');
}

export function issueToken() {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  return { token: `${expiresAt}.${sign(expiresAt)}`, expiresAt };
}

export function verifyToken(token) {
  if (typeof token !== 'string') return false;
  const [expiresStr, signature] = token.split('.');
  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || !signature || Date.now() > expiresAt) return false;
  return safeEqual(signature, sign(expiresAt));
}

export function checkPin(pin, clientKey) {
  const now = Date.now();
  const entry = failures.get(clientKey);
  if (entry && entry.lockedUntil > now) {
    const minutes = Math.ceil((entry.lockedUntil - now) / 60000);
    return { ok: false, locked: true, error: `Muitas tentativas. Tente novamente em ${minutes} min.` };
  }

  if (safeEqual(String(pin ?? '').trim(), config.appPin)) {
    failures.delete(clientKey);
    return { ok: true };
  }

  const lockExpired = entry?.lockedUntil && entry.lockedUntil <= now;
  const count = (entry && !lockExpired ? entry.count : 0) + 1;
  failures.set(clientKey, { count, lockedUntil: count >= MAX_FAILURES ? now + LOCKOUT_MS : 0 });
  return { ok: false, error: 'PIN incorreto. Tente novamente.' };
}

export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// Só para testes.
export function resetFailures() {
  failures.clear();
}
