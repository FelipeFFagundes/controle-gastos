// Proteção contra envio repetido. O aparelho gera um ID por ação (Idempotency-Key) e o reenvia
// nas novas tentativas. Se a ação já foi processada, o servidor devolve a mesma resposta em vez
// de executar de novo; assim, um reenvio depois de falha de rede não duplica lançamentos.
import * as idempotencyRepo from './repositories/idempotency.js';

const KEY_RE = /^[A-Za-z0-9_-]{8,100}$/;
const METHODS = new Set(['POST', 'PATCH']);

export function idempotency() {
  return async (req, res, next) => {
    const key = req.get('Idempotency-Key');
    if (!key || !METHODS.has(req.method)) return next();
    if (!KEY_RE.test(key)) return res.status(400).json({ error: 'Idempotency-Key inválida.' });

    const scope = `${req.method} ${req.originalUrl}`;
    if (!(await idempotencyRepo.claim(key, scope))) {
      const previous = await idempotencyRepo.get(key);
      if (!previous || previous.scope !== scope) {
        return res.status(422).json({ error: 'Esta chave já foi usada em outra ação.' });
      }
      if (previous.status === null) {
        return res.status(409).json({ error: 'Esta ação ainda está sendo processada.', inProgress: true });
      }
      res.set('Idempotent-Replayed', 'true');
      return res.status(previous.status).json(JSON.parse(previous.body));
    }

    // Guarda a resposta antes de enviá-la; erro do servidor (5xx) libera a chave para nova tentativa.
    const send = res.json.bind(res);
    let recorded = false;
    // Resposta enviada sem res.json (ou conexão encerrada antes): não deixa a chave presa como "em andamento".
    res.on('close', () => {
      if (!recorded) idempotencyRepo.release(key).catch(() => {});
    });
    res.json = (body) => {
      recorded = true;
      const status = res.statusCode;
      const save = status >= 500 ? idempotencyRepo.release(key) : idempotencyRepo.complete(key, status, body);
      save
        .catch(err => console.warn('[Idempotency] falha ao registrar resposta:', err.message))
        .finally(() => send(body));
      return res;
    };
    next();
  };
}
