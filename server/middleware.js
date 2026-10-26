import { isPinRequired, verifyToken } from './services/auth.js';
import { HttpError } from './services/errors.js';

export function bearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export function requireAuth(req, res, next) {
  if (!isPinRequired() || verifyToken(bearerToken(req))) return next();
  res.status(401).json({ error: 'Acesso não autorizado. Insira o PIN de 6 dígitos.', needsAuth: true });
}

export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido.' });
  }
  console.error('[API] Erro inesperado:', err);
  res.status(500).json({ error: err?.message || 'Erro interno do servidor.' });
}
