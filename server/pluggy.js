// Serviço de integração com a API da Pluggy (Open Finance Brasil)
// Suporta ambiente Sandbox e Produção / Meu Pluggy (meu.pluggy.ai)

const PLUGGY_API_URL = 'https://api.pluggy.ai';

/**
 * Autentica na Pluggy e obtém a API Key temporária
 */
export async function getPluggyApiKey(clientId, clientSecret) {
  const response = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na autenticação da Pluggy (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.apiKey;
}

/**
 * Gera um connectToken para abrir o widget oficial da Pluggy no navegador
 */
export async function createPluggyConnectToken(apiKey, itemId = null) {
  const body = {};
  if (itemId) {
    body.itemId = itemId;
  }
  const response = await fetch(`${PLUGGY_API_URL}/connect_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao gerar connect token na Pluggy (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.accessToken;
}

/**
 * Tenta listar os itens (conexões) da organização (caso habilitado no plano)
 */
export async function getPluggyItems(apiKey) {
  try {
    const response = await fetch(`${PLUGGY_API_URL}/v2/items`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      }
    });
    if (response.ok) {
      const data = await response.json();
      return data.results || [];
    }
  } catch (e) {
    console.warn('GET /v2/items não disponível:', e.message);
  }
  return [];
}

/**
 * Busca todas as contas e cartões de crédito conectados a um itemId específico
 */
export async function getPluggyAccountsByItem(apiKey, itemId) {
  const url = itemId ? `${PLUGGY_API_URL}/accounts?itemId=${itemId}` : `${PLUGGY_API_URL}/accounts`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao buscar contas na Pluggy (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Busca faturas de um cartão de crédito específico
 */
export async function getPluggyBills(apiKey, accountId) {
  try {
    const response = await fetch(`${PLUGGY_API_URL}/bills?accountId=${accountId}&pageSize=100`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      console.warn(`Aviso: Bills não disponíveis para conta ${accountId} (${response.status})`);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.warn(`Erro ao buscar faturas da conta ${accountId}:`, err);
    return [];
  }
}

/**
 * Busca as transações de uma conta a partir de uma data inicial (YYYY-MM-DD)
 * Na API v2 da Pluggy os parâmetros são: accountId, dateFrom, dateTo, billId
 */
export async function getPluggyTransactions(apiKey, accountId, fromDate, billId = null) {
  let url = `${PLUGGY_API_URL}/v2/transactions?accountId=${accountId}`;
  if (fromDate) {
    url += `&dateFrom=${fromDate}`;
  }
  if (billId) {
    url += `&billId=${billId}`;
  }

  let response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    }
  });

  // Se a conta retornou 410 Gone ou 404, significa que essa subconta/cartão específico foi desconectado ou não mantém mais histórico na Pluggy
  if (response.status === 410 || response.status === 404) {
    console.warn(`Conta ${accountId} retornou ${response.status} (${response.statusText}). Ignorando.`);
    return [];
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`Aviso ao buscar transações da conta ${accountId} (${response.status}): ${errorText}`);
    return [];
  }

  const data = await response.json();
  const txs = data.results || [];
  console.log(`Sucesso: ${txs.length} transações encontradas para conta ${accountId}`);
  return txs;
}

/**
 * Mapeia categorias do banco para as categorias do nosso aplicativo
 */
export function mapPluggyCategory(pluggyCat) {
  if (!pluggyCat) return 'Outros';
  const c = pluggyCat.toLowerCase();
  if (c.includes('food') || c.includes('restaurante') || c.includes('refei') || c.includes('mercado') || c.includes('alimenta')) {
    return 'Alimentação';
  }
  if (c.includes('transporte') || c.includes('uber') || c.includes('posto') || c.includes('combustivel') || c.includes('veiculo') || c.includes('bike')) {
    return 'Transporte & Bike';
  }
  if (c.includes('shopping') || c.includes('compra') || c.includes('vestuario') || c.includes('roupa') || c.includes('eletronico')) {
    return 'Compras & Vestuário';
  }
  if (c.includes('educa') || c.includes('livro') || c.includes('curso')) {
    return 'Educação & Livros';
  }
  if (c.includes('saude') || c.includes('farmacia') || c.includes('medico') || c.includes('drogaria')) {
    return 'Saúde & Farmácia';
  }
  if (c.includes('invest') || c.includes('reserva') || c.includes('poupanca')) {
    return 'Investimento & Reserva';
  }
  if (c.includes('salario') || c.includes('transferencia recebida') || c.includes('rendimento')) {
    return 'Salário & Entradas';
  }
  return 'Outros';
}
