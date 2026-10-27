// Única porta de entrada para o servidor. O servidor é a fonte de verdade: nada de cópia local dos dados.
const TOKEN_KEY = 'app_auth_token';
const EXPIRY_KEY = 'app_auth_expiry';

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function getToken() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = Number(localStorage.getItem(EXPIRY_KEY) || 0);
    if (token && Date.now() < expiry) return token;
  } catch {
    // localStorage indisponível (modo privado): segue sem token.
  }
  return null;
}

export function saveToken(token, expiresAt) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, String(expiresAt));
  } catch {
    // ignora
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  } catch {
    // ignora
  }
}

// Avisado quando o servidor responde 401 (token expirado ou PIN trocado).
let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Escritas que falham por rede são reenviadas sozinhas. POST/PATCH levam uma Idempotency-Key gerada
// aqui e repetida nas novas tentativas: o servidor reconhece a repetição e não executa a ação de novo.
const RETRY_DELAYS_MS = [600, 2000];
const KEYED_METHODS = new Set(['POST', 'PATCH']);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function newIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (KEYED_METHODS.has(method)) headers['Idempotency-Key'] = newIdempotencyKey();
  const canRetry = method !== 'GET'; // leituras: o React Query já tenta de novo

  let response;
  let data = null;
  let attempt = 0;
  for (;;) {
    try {
      response = await fetch(`/api${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch {
      if (canRetry && attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt++]);
        continue;
      }
      throw new ApiError(0, 'Sem conexão com o servidor.');
    }

    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    // A tentativa anterior ainda está sendo processada no servidor: espera e pergunta de novo.
    if (response.status === 409 && data?.inProgress && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt++]);
      continue;
    }
    break;
  }

  if (!response.ok) {
    // Exclusão reenviada depois de falha de rede: a primeira tentativa já tinha apagado.
    if (method === 'DELETE' && response.status === 404 && attempt > 0) return null;
    if (response.status === 401 && data?.needsAuth) {
      clearToken();
      onUnauthorized();
    }
    throw new ApiError(response.status, data?.error || `Erro ${response.status} no servidor.`, data);
  }
  return data;
}

export const api = {
  authStatus: () => request('/auth/status'),
  login: (pin) => request('/auth/login', { method: 'POST', body: { pin } }),

  categories: () => request('/categories').then(d => d.categories),
  accounts: () => request('/accounts').then(d => d.accounts),
  months: () => request('/months').then(d => d.months),
  month: (month) => request(`/months/${month}`),
  installments: (month) => request(`/installments?month=${month}`).then(d => d.installments),
  setSurplus: (month, target) => request(`/months/${month}/surplus`, { method: 'PUT', body: { target } }),

  createTransaction: (data) => request('/transactions', { method: 'POST', body: data }),
  updateTransaction: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: data }),
  setPaid: (id, paid) => request(`/transactions/${id}/paid`, { method: 'PATCH', body: { paid } }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  createAccount: (data) => request('/accounts', { method: 'POST', body: data }),
  updateAccount: (id, data) => request(`/accounts/${id}`, { method: 'PUT', body: data }),
  deleteAccount: (id, withTransactions = false) =>
    request(`/accounts/${id}${withTransactions ? '?withTransactions=true' : ''}`, { method: 'DELETE' }),

  clearAll: () => request('/admin/clear', { method: 'POST' }),
  resetSeed: () => request('/admin/reset-seed', { method: 'POST' }),

  pluggyStatus: () => request('/pluggy/status'),
  pluggyConnectToken: (itemId) => request('/pluggy/connect-token', { method: 'POST', body: { itemId } }),
  pluggyRegisterItem: (itemId) => request('/pluggy/items', { method: 'POST', body: { itemId } }),
  pluggySync: (options) => request('/pluggy/sync', { method: 'POST', body: options })
};
