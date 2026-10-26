// Cliente HTTP da API da Pluggy (Open Finance Brasil). Só faz chamadas; nenhuma regra do app aqui.
const PLUGGY_API_URL = 'https://api.pluggy.ai';

async function request(path, { apiKey, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-KEY'] = apiKey;
  return fetch(`${PLUGGY_API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function requestJson(path, options, errorLabel) {
  const response = await request(path, options);
  if (!response.ok) {
    throw new Error(`${errorLabel} (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

export async function getApiKey(clientId, clientSecret) {
  const data = await requestJson('/auth', { method: 'POST', body: { clientId, clientSecret } }, 'Falha na autenticação da Pluggy');
  return data.apiKey;
}

export async function createConnectToken(apiKey, itemId = null) {
  const data = await requestJson(
    '/connect_token',
    { apiKey, method: 'POST', body: itemId ? { itemId } : {} },
    'Erro ao gerar connect token na Pluggy'
  );
  return data.accessToken;
}

// A listagem de items nem sempre está habilitada no plano; falha silenciosa.
export async function listItems(apiKey) {
  try {
    const response = await request('/items', { apiKey });
    if (response.ok) return (await response.json()).results || [];
  } catch (err) {
    console.warn('[Pluggy] Listagem de items indisponível:', err.message);
  }
  return [];
}

export async function getItem(apiKey, itemId) {
  try {
    const response = await request(`/items/${encodeURIComponent(itemId)}`, { apiKey });
    if (response.ok) return response.json();
  } catch (err) {
    console.warn(`[Pluggy] Falha ao obter item ${itemId}:`, err.message);
  }
  return null;
}

// Pede à Pluggy para buscar dados novos no banco.
export async function triggerItemUpdate(apiKey, itemId) {
  try {
    await request(`/items/${encodeURIComponent(itemId)}`, { apiKey, method: 'PATCH', body: {} });
  } catch (err) {
    console.warn(`[Pluggy] Falha ao solicitar atualização do item ${itemId}:`, err.message);
  }
}

export async function listAccounts(apiKey, itemId) {
  const data = await requestJson(
    `/accounts?itemId=${encodeURIComponent(itemId)}`,
    { apiKey },
    'Erro ao buscar contas na Pluggy'
  );
  return data.results || [];
}

// API v2: paginação por cursor. 404/410 = conta desativada, ignorada.
// O `next` da resposta já é a query string completa da próxima página ("?accountId=...&after=..."),
// e deve ser anexado ao caminho como veio.
export async function listTransactions(apiKey, accountId, fromDate) {
  const results = [];
  const MAX_PAGES = 50;
  const params = new URLSearchParams({ accountId });
  if (fromDate) params.set('dateFrom', fromDate);
  let path = `/v2/transactions?${params}`;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await request(path, { apiKey });
    if (response.status === 404 || response.status === 410) break;
    if (!response.ok) {
      throw new Error(`Erro ao buscar transações da conta ${accountId} (${response.status}): ${await response.text()}`);
    }
    const data = await response.json();
    const pageResults = data.results || [];
    results.push(...pageResults);
    if (!data.next || pageResults.length === 0) break;
    path = nextPagePath(data.next, params);
  }
  return results;
}

function nextPagePath(next, params) {
  if (next.startsWith('?')) return `/v2/transactions${next}`;
  if (next.startsWith('/')) return next;
  // Só o cursor puro (formato antigo).
  const withCursor = new URLSearchParams(params);
  withCursor.set('after', next);
  return `/v2/transactions?${withCursor}`;
}
