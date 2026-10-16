// Serviço de integração com a API da Pluggy (Open Finance Brasil)
// Suporta tanto o ambiente Sandbox quanto Produção / Meu Pluggy (meu.pluggy.ai)

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
 * Busca todas as contas conectadas
 */
export async function getPluggyAccounts(apiKey) {
  const response = await fetch(`${PLUGGY_API_URL}/accounts`, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar contas na Pluggy: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Busca as transações de uma conta a partir de uma data inicial (YYYY-MM-DD)
 */
export async function getPluggyTransactions(apiKey, accountId, fromDate) {
  let url = `${PLUGGY_API_URL}/transactions?accountId=${accountId}&pageSize=500`;
  if (fromDate) {
    url += `&from=${fromDate}`;
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar transações da conta ${accountId}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results || [];
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
