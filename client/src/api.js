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

export async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor.');
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
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
  togglePaid: (id) => request(`/transactions/${id}/toggle-paid`, { method: 'PATCH' }),
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
