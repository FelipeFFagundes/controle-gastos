import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { initialData } from './seed.js';
import { getDb, saveDb } from './db.js';
import { 
  getPluggyApiKey, 
  createPluggyConnectToken,
  getPluggyItems,
  triggerPluggyItemSync,
  getPluggyAccountsByItem,
  getPluggyBills,
  getPluggyTransactions, 
  mapPluggyCategory 
} from './pluggy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

// Carrega variáveis do arquivo .env se existir localmente
const ENV_PATH = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_PATH) && process.loadEnvFile) {
  try {
    process.loadEnvFile(ENV_PATH);
  } catch (e) {
    console.warn('Aviso: Falha ao carregar .env:', e.message);
  }
}

export const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Normalização de URL para Vercel Serverless
app.use((req, res, next) => {
  if (req.url.startsWith('/api/index.js')) {
    req.url = req.url.replace('/api/index.js', '') || '/';
  } else if (req.url.startsWith('/index.js')) {
    req.url = req.url.replace('/index.js', '') || '/';
  }
  next();
});

// Helper de Autenticação por PIN
function getAppPin() {
  return (process.env.APP_PIN || '').trim();
}

function generateAuthToken(pin) {
  // Token seguro assinado com HMAC SHA256 e timestamp
  const timestamp = Date.now();
  const secret = pin || 'default-pin-secret';
  const hmac = crypto.createHmac('sha256', secret).update(String(timestamp)).digest('hex');
  return `${timestamp}.${hmac}`;
}

function verifyAuthToken(token, pin) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [timestampStr, receivedHmac] = parts;
  const timestamp = Number(timestampStr);
  if (isNaN(timestamp)) return false;

  // Validade de 30 dias em milissegundos
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > THIRTY_DAYS_MS) {
    return false; // Expirado
  }

  const secret = pin || 'default-pin-secret';
  const expectedHmac = crypto.createHmac('sha256', secret).update(String(timestamp)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac));
}

// Middleware de verificação de autenticação para rotas protegidas
function requireAuth(req, res, next) {
  const currentPin = getAppPin();
  // Se APP_PIN não estiver configurado nas variáveis de ambiente, o acesso é liberado
  if (!currentPin) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-app-token'];

  if (verifyAuthToken(token, currentPin)) {
    return next();
  }

  return res.status(401).json({
    error: 'Acesso não autorizado. Insira o PIN de 6 dígitos.',
    needsAuth: true
  });
}

// Helper para adicionar meses (YYYY-MM)
function addMonths(monthStr, count) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1 + count, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// --- ROTAS DE AUTENTICAÇÃO ---

// Verifica se a proteção por PIN está ativa
app.get(['/api/auth/status', '/auth/status'], (req, res) => {
  const currentPin = getAppPin();
  const isRequired = Boolean(currentPin);
  let authenticated = false;

  if (isRequired) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-app-token'];
    authenticated = verifyAuthToken(token, currentPin);
  }

  res.json({
    pinRequired: isRequired,
    authenticated: isRequired ? authenticated : true
  });
});

// Realizar Login com o PIN de 6 dígitos
app.post(['/api/auth/login', '/auth/login'], (req, res) => {
  const currentPin = getAppPin();
  const { pin } = req.body || {};

  // Se o servidor não tiver PIN configurado
  if (!currentPin) {
    return res.json({
      success: true,
      token: generateAuthToken(''),
      message: 'PIN não configurado no servidor. Acesso liberado.'
    });
  }

  if (!pin || String(pin).trim() !== currentPin) {
    return res.status(401).json({
      success: false,
      error: 'PIN incorreto. Tente novamente.'
    });
  }

  // Gera token válido por 30 dias
  const token = generateAuthToken(currentPin);
  res.json({
    success: true,
    token,
    expiresInDays: 30,
    message: 'Acesso autorizado!'
  });
});

// Aplicar requireAuth em todas as rotas da API subsequentes
app.use(['/api', '/months', '/data', '/transactions', '/installments', '/accounts', '/pluggy', '/reset-seed', '/clear'], requireAuth);

// --- ROTAS DA API (Compatíveis com e sem prefixo /api) ---

// 1. Obter lista de meses disponíveis
app.get(['/api/months', '/months'], async (req, res) => {
  const db = await getDb();
  const monthsSet = new Set(db.transactions.map(t => t.month));
  monthsSet.add('2026-10');
  const sortedMonths = Array.from(monthsSet).sort();
  res.json({ months: sortedMonths });
});

// 2. Obter dados completos de um mês específico
app.get(['/api/data', '/data'], async (req, res) => {
  const db = await getDb();
  const month = req.query.month || '2026-10';

  const monthTransactions = db.transactions.filter(t => t.month === month);

  let totalIncome = 0;
  let totalExpense = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let creditCardExpenses = 0;
  let fixedExpenses = 0;

  const expensesByAccount = {};
  const expensesByCategory = {};

  // Mapa de tipo de conta
  const accountTypeMap = {};
  (db.accounts || []).forEach(acc => {
    accountTypeMap[acc.name] = acc.type;
  });

  monthTransactions.forEach(t => {
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amount;
    } else {
      totalExpense += amount;
      if (t.paid) {
        totalPaid += amount;
      } else {
        totalPending += amount;
      }

      const accType = accountTypeMap[t.account];
      if (accType === 'credit_card' || (t.account && t.account.toLowerCase().includes('cartão')) || (t.account && t.account.toLowerCase().includes('fatura'))) {
        creditCardExpenses += amount;
      } else {
        fixedExpenses += amount;
      }

      expensesByAccount[t.account] = (expensesByAccount[t.account] || 0) + amount;
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + amount;
    }
  });

  const customSurplusMap = db.customSurplus || {};
  const customSurplusTarget = customSurplusMap[month] !== undefined ? Number(customSurplusMap[month]) : null;

  const netBalance = totalIncome - totalExpense;
  const targetSurplus = customSurplusTarget !== null ? customSurplusTarget : 0;
  // O que ainda pode gastar no cartão antes de estourar a receita total esperada e a meta de sobra definida
  const availableToSpend = totalIncome - totalExpense - targetSurplus;

  res.json({
    month,
    categories: db.categories,
    accounts: db.accounts,
    customSurplusTarget,
    transactions: monthTransactions,
    allTransactions: db.transactions,
    summary: {
      totalIncome,
      totalExpense,
      netBalance,
      totalPaid,
      totalPending,
      creditCardExpenses,
      fixedExpenses,
      availableToSpend,
      customSurplusTarget,
      expensesByAccount,
      expensesByCategory
    }
  });
});

// Atualizar meta de sobra prevista do mês
app.post(['/api/custom-surplus', '/custom-surplus'], async (req, res) => {
  const { month, target } = req.body;
  if (!month) {
    return res.status(400).json({ error: 'Mês não informado.' });
  }
  const db = await getDb();
  if (!db.customSurplus) {
    db.customSurplus = {};
  }
  if (target === null || target === undefined || target === '') {
    delete db.customSurplus[month];
  } else {
    db.customSurplus[month] = Number(target);
  }
  await saveDb(db);
  res.json({ success: true, month, customSurplusTarget: db.customSurplus[month] });
});

// 3. Obter todos os parcelamentos ativos
app.get(['/api/installments', '/installments'], async (req, res) => {
  const db = await getDb();
  const currentMonth = req.query.month || '2026-10';

  const installmentsMap = new Map();
  const normalizeDesc = (desc = '') =>
    String(desc).replace(/\s*-?\s*\d{1,2}\s*\/\s*\d{1,2}\s*$/, '').trim() || String(desc).trim();

  db.transactions.forEach(t => {
    if (t.type === 'income') return;
    if (t.installment && t.installment.total > 1) {
      const baseDesc = normalizeDesc(t.description);
      // Agrupa todas as parcelas da MESMA compra (descrição base + conta + nº total de parcelas)
      const key = `${baseDesc.toLowerCase()}__${t.account}__${t.installment.total}`;
      if (!installmentsMap.has(key)) {
        installmentsMap.set(key, {
          key,
          description: baseDesc,
          account: t.account,
          category: t.category,
          totalInstallments: t.installment.total,
          history: []
        });
      }
      const group = installmentsMap.get(key);
      if (!group.history.some(h => h.current === t.installment.current)) {
        group.history.push({
          id: t.id,
          month: t.month,
          current: t.installment.current,
          paid: t.paid,
          amount: Number(t.amount) || 0
        });
      }
    }
  });

  const installmentsList = Array.from(installmentsMap.values())
    .map(inst => {
      inst.history.sort((a, b) => a.current - b.current);
      const match = inst.history.find(h => h.month === currentMonth);
      const past = inst.history.filter(h => h.month < currentMonth);
      const currentInstallment = match
        ? match.current
        : (past.length ? Math.max(...past.map(h => h.current)) : 0);
      const amountPerInstallment = match
        ? match.amount
        : (inst.history[inst.history.length - 1]?.amount || 0);
      const remainingInstallments = Math.max(0, inst.totalInstallments - currentInstallment);
      return {
        ...inst,
        amountPerInstallment,
        amountThisMonth: match ? match.amount : 0,
        totalAmount: amountPerInstallment * inst.totalInstallments,
        currentInstallment,
        currentInMonth: match ? match.current : null,
        remainingInstallments,
        remainingDebt: remainingInstallments * amountPerInstallment,
        isCompleted: currentInstallment >= inst.totalInstallments && !match
      };
    })
    // Mostra apenas compras com parcela neste mês ou ainda por vir
    .filter(inst => !inst.isCompleted)
    .sort((a, b) => b.amountThisMonth - a.amountThisMonth);

  res.json({ installments: installmentsList });
});

// 4. Criar nova transação
app.post(['/api/transactions', '/transactions'], async (req, res) => {
  const db = await getDb();
  const {
    description,
    amount,
    type,
    category,
    account,
    date,
    paid = false,
    isInstallment = false,
    currentInstallment = 1,
    totalInstallments = 1,
    generateFutureMonths = true
  } = req.body;

  if (!description || !amount || !category || !account || !date) {
    return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
  }

  const baseDate = new Date(date);
  const baseMonth = req.body.month || date.substring(0, 7);
  const numAmount = Number(amount);
  const createdTransactions = [];

  if (isInstallment && totalInstallments > 1 && generateFutureMonths) {
    const startNum = Number(currentInstallment);
    const totalNum = Number(totalInstallments);

    for (let i = startNum; i <= totalNum; i++) {
      const monthOffset = i - startNum;
      const targetMonth = addMonths(baseMonth, monthOffset);
      const targetDate = new Date(baseDate);
      targetDate.setMonth(targetDate.getMonth() + monthOffset);
      const formattedDate = targetDate.toISOString().split('T')[0];

      const newTx = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        description: description.trim(),
        amount: numAmount,
        type: type || 'expense',
        category,
        account,
        date: formattedDate,
        month: targetMonth,
        paid: i === startNum ? Boolean(paid) : false,
        installment: {
          current: i,
          total: totalNum
        }
      };

      db.transactions.push(newTx);
      createdTransactions.push(newTx);
    }
  } else {
    const newTx = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      description: description.trim(),
      amount: numAmount,
      type: type || 'expense',
      category,
      account,
      date,
      month: baseMonth,
      paid: Boolean(paid),
      installment: isInstallment && totalInstallments > 1 ? {
        current: Number(currentInstallment),
        total: Number(totalInstallments)
      } : null
    };

    db.transactions.push(newTx);
    createdTransactions.push(newTx);
  }

  await saveDb(db);
  res.status(201).json({ success: true, created: createdTransactions });
});

// 5. Atualizar transação
app.put(['/api/transactions/:id', '/transactions/:id'], async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const index = db.transactions.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Transação não encontrada.' });
  }

  const existing = db.transactions[index];
  const { description, amount, type, category, account, date, paid, installment, month } = req.body;

  const updatedDate = date || existing.date;
  const updatedMonth = month !== undefined ? month : (existing.month || updatedDate.substring(0, 7));

  db.transactions[index] = {
    ...existing,
    description: description !== undefined ? description : existing.description,
    amount: amount !== undefined ? Number(amount) : existing.amount,
    type: type !== undefined ? type : existing.type,
    category: category !== undefined ? category : existing.category,
    account: account !== undefined ? account : existing.account,
    date: updatedDate,
    month: updatedMonth,
    paid: paid !== undefined ? Boolean(paid) : existing.paid,
    installment: installment !== undefined ? installment : existing.installment
  };

  await saveDb(db);
  res.json({ success: true, transaction: db.transactions[index] });
});

// 6. Alternar status pago/pendente
app.patch(['/api/transactions/:id/toggle-paid', '/transactions/:id/toggle-paid'], async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const transaction = db.transactions.find(t => t.id === id);

  if (!transaction) {
    return res.status(404).json({ error: 'Transação não encontrada.' });
  }

  transaction.paid = !transaction.paid;
  await saveDb(db);
  res.json({ success: true, id: transaction.id, paid: transaction.paid });
});

// 7. Deletar transação
app.delete(['/api/transactions/:id', '/transactions/:id'], async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const initialLength = db.transactions.length;

  const targetTx = db.transactions.find(t => t.id === id);
  if (!targetTx) {
    return res.status(404).json({ error: 'Transação não encontrada.' });
  }

  // Se a transação veio da Pluggy, registra o pluggyId e assinatura na lista negra para não recriar
  if (!db.deletedPluggyIds) db.deletedPluggyIds = [];
  if (targetTx.pluggyId) {
    db.deletedPluggyIds.push(targetTx.pluggyId);
  }
  // Guarda também assinatura (descrição + valor + data) para transações sem pluggyId estável
  const signature = `${targetTx.description || ''}_${targetTx.amount}_${targetTx.date || ''}`;
  db.deletedPluggyIds.push(signature);

  db.transactions = db.transactions.filter(t => t.id !== id);

  await saveDb(db);
  res.json({ success: true, message: 'Transação removida com sucesso.' });
});

// 8. Restaurar dados iniciais
app.post(['/api/reset-seed', '/reset-seed'], async (req, res) => {
  await saveDb(initialData);
  res.json({ success: true, message: 'Dados restaurados para o padrão de Outubro de 2026.' });
});

// 8.1 Gerenciamento de Contas e Cartões (Criar, Editar, Excluir)
app.get(['/api/accounts', '/accounts'], async (req, res) => {
  const db = await getDb();
  res.json({ accounts: db.accounts || [] });
});

app.post(['/api/accounts', '/accounts'], async (req, res) => {
  const db = await getDb();
  const { name, type = 'credit_card', color = '#3b82f6', closingDay, billingCycle, monthOffset } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome da conta/cartão é obrigatório.' });
  }

  const existing = db.accounts.find(a => a.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Já existe uma conta com este nome.' });
  }

  const newAccount = {
    id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: name.trim(),
    type,
    color,
    closingDay: type === 'credit_card' && closingDay ? Number(closingDay) : null,
    billingCycle: billingCycle || 'same_month',
    monthOffset: monthOffset !== undefined ? Number(monthOffset) : 0
  };

  db.accounts.push(newAccount);
  await saveDb(db);
  res.json({ success: true, account: newAccount, accounts: db.accounts });
});

app.put(['/api/accounts/:id', '/accounts/:id'], async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const { name, type, color, billingCycle, monthOffset, closingDay } = req.body;

  const accIndex = db.accounts.findIndex(a => a.id === id);
  if (accIndex === -1) {
    return res.status(404).json({ error: 'Conta não encontrada.' });
  }

  const oldName = db.accounts[accIndex].name;
  const oldOffset = db.accounts[accIndex].monthOffset !== undefined 
    ? db.accounts[accIndex].monthOffset 
    : (db.accounts[accIndex].billingCycle === 'previous_month' ? -1 : 0);
  const oldClosingDay = db.accounts[accIndex].closingDay;

  if (name && name.trim()) {
    db.accounts[accIndex].name = name.trim();
    // Atualiza nome da conta nas transações associadas
    db.transactions.forEach(t => {
      if (t.account === oldName) {
        t.account = name.trim();
      }
    });
  }
  if (type) db.accounts[accIndex].type = type;
  if (color) db.accounts[accIndex].color = color;

  if (closingDay !== undefined) {
    db.accounts[accIndex].closingDay = closingDay ? Number(closingDay) : null;
  }

  let newOffset = oldOffset;
  if (monthOffset !== undefined) {
    newOffset = Number(monthOffset);
    db.accounts[accIndex].monthOffset = newOffset;
    db.accounts[accIndex].billingCycle = newOffset === -1 ? 'previous_month' : newOffset === 1 ? 'next_month' : 'same_month';
  } else if (billingCycle !== undefined) {
    newOffset = billingCycle === 'previous_month' ? -1 : billingCycle === 'next_month' ? 1 : 0;
    db.accounts[accIndex].billingCycle = billingCycle;
    db.accounts[accIndex].monthOffset = newOffset;
  }

  // Se o offset mudou, ajusta o mês das parcelas e lançamentos futuros dessa conta
  if (newOffset !== oldOffset) {
    const diff = newOffset - oldOffset;
    db.transactions.forEach(t => {
      if (t.account === db.accounts[accIndex].name && (t.installment || t.date.substring(0, 7) > t.month)) {
        t.month = addMonths(t.month, diff);
      }
    });
  }

  // Se o dia de fechamento foi atualizado, re-alinha as compras do cartão
  const currentClosingDay = db.accounts[accIndex].closingDay;
  if (currentClosingDay && currentClosingDay !== oldClosingDay) {
    db.transactions.forEach(t => {
      if (t.account === db.accounts[accIndex].name && !t.installment && t.date) {
        const day = parseInt(t.date.split('-')[2], 10);
        const baseM = t.date.substring(0, 7);
        if (day >= currentClosingDay) {
          t.month = addMonths(baseM, 1);
        } else {
          t.month = baseM;
        }
      }
    });
  }

  await saveDb(db);
  res.json({ success: true, account: db.accounts[accIndex], accounts: db.accounts });
});

app.delete(['/api/accounts/:id', '/accounts/:id'], async (req, res) => {
  const db = await getDb();
  const { id } = req.params;

  const account = db.accounts.find(a => a.id === id);
  if (!account) {
    return res.status(404).json({ error: 'Conta não encontrada.' });
  }

  db.accounts = db.accounts.filter(a => a.id !== id);
  await saveDb(db);
  res.json({ success: true, message: `Conta ${account.name} removida.`, accounts: db.accounts });
});

// 9. Status da integração Pluggy
app.get(['/api/pluggy/status', '/pluggy/status'], (req, res) => {
  const isConfigured = Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);
  res.json({
    configured: isConfigured,
    clientIdConfigured: Boolean(process.env.PLUGGY_CLIENT_ID)
  });
});

// 10. Limpar todos os dados existentes
app.post(['/api/clear', '/clear'], async (req, res) => {
  const db = await getDb();
  db.transactions = [];
  await saveDb(db);
  res.json({ success: true, message: 'Todas as transações foram limpas com sucesso.' });
});

// 11. Gerar Connect Token para abrir o Widget Oficial da Pluggy
app.post(['/api/pluggy/connect-token', '/pluggy/connect-token'], async (req, res) => {
  try {
    const clientId = req.body.clientId || process.env.PLUGGY_CLIENT_ID;
    const clientSecret = req.body.clientSecret || process.env.PLUGGY_CLIENT_SECRET;
    const itemId = req.body.itemId || null;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Credenciais da Pluggy não fornecidas.' });
    }

    const apiKey = await getPluggyApiKey(clientId, clientSecret);
    const connectToken = await createPluggyConnectToken(apiKey, itemId);
    res.json({ success: true, connectToken });
  } catch (err) {
    console.error('Erro ao gerar connect token:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar connect token' });
  }
});

// 12. Sincronizar transações e faturas via Pluggy (Open Finance)
app.post(['/api/pluggy/sync', '/pluggy/sync'], async (req, res) => {
  try {
    const clientId = req.body.clientId || process.env.PLUGGY_CLIENT_ID;
    const clientSecret = req.body.clientSecret || process.env.PLUGGY_CLIENT_SECRET;
    const targetMonth = req.body.month;
    const clearBeforeSync = Boolean(req.body.clearExisting);
    const itemIds = req.body.itemIds || []; // array ou único itemId

    if (!clientId || !clientSecret) {
      return res.status(400).json({ 
        error: 'Credenciais da Pluggy não informadas. Forneça clientId e clientSecret.' 
      });
    }

    // 1. Obter token de acesso
    const apiKey = await getPluggyApiKey(clientId, clientSecret);

    // 2. Coletar os itemIds para buscar contas
    const targetItemIds = new Set();
    if (Array.isArray(itemIds)) {
      itemIds.forEach(id => id && targetItemIds.add(id.trim()));
    } else if (typeof itemIds === 'string' && itemIds.trim()) {
      targetItemIds.add(itemIds.trim());
    }

    // Tenta também buscar os itens registrados via API caso habilitado
    const fetchedItems = await getPluggyItems(apiKey);
    fetchedItems.forEach(it => targetItemIds.add(it.id));

    // Se ainda não temos itemIds, tenta buscar direto /accounts (caso o usuário tenha usado token de item ou endpoint legado)
    let accounts = [];
    if (targetItemIds.size > 0) {
      for (const itemId of targetItemIds) {
        try {
          // Solicita atualização do item junto à instituição
          triggerPluggyItemSync(apiKey, itemId).catch(() => {});
          const itemAccounts = await getPluggyAccountsByItem(apiKey, itemId);
          accounts.push(...itemAccounts);
        } catch (err) {
          console.warn(`Erro ao buscar contas do item ${itemId}:`, err.message);
        }
      }
    } else {
      try {
        accounts = await getPluggyAccountsByItem(apiKey, null);
      } catch (err) {
        return res.status(400).json({
          error: 'Nenhuma conexão ativa encontrada. Use o botão "Conectar Novo Banco" para vincular seu Itaú, Nubank ou XP via widget oficial da Pluggy!',
          needsConnect: true
        });
      }
    }

    if (!accounts || accounts.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhuma conta encontrada para as conexões informadas.',
        importedCount: 0
      });
    }

    const db = await getDb();
    if (clearBeforeSync) {
      db.transactions = [];
    }

    let importedCount = 0;
    let billsCount = 0;

    // Data inicial (se especificado targetMonth, busca desde o início do mês, senão busca últimos 90 dias)
    let fromDate = null;
    if (targetMonth) {
      fromDate = `${targetMonth}-01`;
    }

    // Data inicial baseada no período selecionado (period: '24h' | '7d' | '30d' | 'all')
    const syncPeriod = req.body.period || 'all';
    let syncFromDate = '2026-08-01';

    const now = new Date();
    if (syncPeriod === '24h') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      syncFromDate = yesterday.toISOString().split('T')[0];
    } else if (syncPeriod === '7d') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      syncFromDate = sevenDaysAgo.toISOString().split('T')[0];
    } else if (syncPeriod === '30d') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      syncFromDate = thirtyDaysAgo.toISOString().split('T')[0];
    } else if (targetMonth) {
      // Padrão por mês: a partir do dia 1 do mês anterior para cobrir ciclo da fatura
      syncFromDate = `${addMonths(targetMonth, -1)}-01`;
    }

    const deletedSet = new Set(db.deletedPluggyIds || []);

    for (const acc of accounts) {
      const isCredit = acc.type === 'CREDIT' || acc.subtype === 'CREDIT_CARD';
      const rawName = (acc.name || acc.marketingName || '').trim();
      const lowerRaw = rawName.toLowerCase();
      let bankName = rawName;

      // Mapeamento amigável de nomes e instituições
      if (lowerRaw === 'platinum' || lowerRaw.includes('nubank') || lowerRaw.includes('nu pagamentos')) {
        bankName = isCredit || lowerRaw === 'platinum' ? 'Cartão Nubank' : 'Conta Nubank';
      } else if (lowerRaw.includes('latam pass') || (lowerRaw.includes('latam') && isCredit)) {
        bankName = 'Cartão Itaú LATAM Pass';
      } else if (lowerRaw.includes('itau') || lowerRaw.includes('itaú')) {
        if (isCredit || lowerRaw.includes('multiplo') || lowerRaw.includes('múltiplo')) {
          bankName = 'Cartão Itaú Múltiplo';
        } else {
          bankName = 'Conta Itaú';
        }
      } else if (!bankName) {
        bankName = isCredit ? 'Cartão de Crédito' : 'Conta Bancária';
      }

      const cardColor = bankName.toLowerCase().includes('nubank') 
        ? '#820ad1' 
        : bankName.toLowerCase().includes('itau') 
          ? '#ec7000' 
          : isCredit ? '#eab308' : '#3b82f6';

      const isNubankCard = bankName.toLowerCase().includes('nubank') && isCredit;
      const defaultBillingCycle = isNubankCard ? 'previous_month' : 'same_month';
      const defaultMonthOffset = isNubankCard ? -1 : 0;
      const defaultClosingDay = isNubankCard ? 28 : (bankName.toLowerCase().includes('itau') && isCredit ? 29 : null);

      // Auto-cadastrar ou atualizar a conta no app (identificação por ID ou nome + tipo)
      let existingAccount = db.accounts.find(a => a.id === `acc-pluggy-${acc.id}`) ||
        db.accounts.find(a => a.name.toLowerCase() === bankName.toLowerCase() && a.type === (isCredit ? 'credit_card' : 'bank_account')) ||
        (lowerRaw === 'platinum' ? db.accounts.find(a => a.name.toLowerCase().includes('nubank') && a.type === 'credit_card') : null);

      if (!existingAccount) {
        existingAccount = {
          id: `acc-pluggy-${acc.id}`,
          name: bankName,
          type: isCredit ? 'credit_card' : 'bank_account',
          color: cardColor,
          closingDay: defaultClosingDay,
          billingCycle: defaultBillingCycle,
          monthOffset: defaultMonthOffset
        };
        db.accounts.push(existingAccount);
      } else {
        existingAccount.name = bankName;
        existingAccount.type = isCredit ? 'credit_card' : 'bank_account';
        existingAccount.color = cardColor;
        if (isCredit && existingAccount.closingDay === undefined && defaultClosingDay) {
          existingAccount.closingDay = defaultClosingDay;
        }
        if (existingAccount.monthOffset === undefined || (isNubankCard && existingAccount.monthOffset === 0)) {
          existingAccount.monthOffset = defaultMonthOffset;
          existingAccount.billingCycle = defaultBillingCycle;
        }
      }

      // Se for cartão de crédito, busca faturas para identificar o total da fatura
      let bills = [];
      if (isCredit || bankName.toLowerCase().includes('cartão') || bankName.toLowerCase().includes('nubank') || bankName.toLowerCase().includes('itaú')) {
        bills = await getPluggyBills(apiKey, acc.id);
        billsCount += bills.length;
        console.log(`[Pluggy Sync] Conta "${bankName}" (${acc.id}) possui ${bills.length} faturas retornadas. Balanço na conta: ${acc.balance}`);

        bills.forEach(b => {
          console.log(`  -> Fatura ID ${b.id}: totalAmount = R$ ${b.totalAmount}, dueDate = ${b.dueDate}`);
        });
      }

      // Buscar transações recentes no período definido
      let pluggyTxs = [];
      try {
        pluggyTxs = await getPluggyTransactions(apiKey, acc.id, syncFromDate);
        console.log(`[Pluggy Sync] ${pluggyTxs.length} transações recentes retornadas para "${bankName}" desde ${syncFromDate}`);
      } catch (err) {
        console.warn(`Erro não fatal ao buscar transações da conta ${acc.id} (${bankName}):`, err.message);
      }

      // Transações que caem no mês alvo (ex: 2026-10)
      const targetMonthTxs = pluggyTxs.filter(t => (t.date || '').substring(0, 7) === (targetMonth || '2026-10'));

      // Se for cartão e não tiver vindo nenhuma transação individual para o mês alvo, mas tiver fatura emitida:
      if (isCredit && targetMonthTxs.length === 0 && bills.length > 0) {
        const billForMonth = bills.find(b => {
          const due = (b.dueDate || '').substring(0, 7);
          const close = (b.billClosingDate || '').substring(0, 7);
          return due === targetMonth || close === targetMonth;
        }) || bills.sort((a, b) => new Date(b.dueDate || 0) - new Date(a.dueDate || 0))[0];

        if (billForMonth && Number(billForMonth.totalAmount) > 0) {
          const billDueDate = (billForMonth.dueDate || '').substring(0, 10) || `${targetMonth || '2026-10'}-10`;
          const billMonth = (billForMonth.dueDate || '').substring(0, 7) || targetMonth || '2026-10';
          const billId = `bill-${billForMonth.id}`;

          // Verifica se já existe ou se foi excluída manualmente pelo usuário
          const alreadyHasBill = db.transactions.some(t => t.pluggyId === billId);
          const wasDeleted = deletedSet.has(billId);

          if (!alreadyHasBill && !wasDeleted) {
            db.transactions.push({
              id: `tx-bill-${billForMonth.id}`,
              pluggyId: billId,
              description: `Fatura ${bankName}`,
              amount: Number(billForMonth.totalAmount),
              type: 'expense',
              category: 'Outros',
              account: bankName,
              date: billDueDate,
              month: billMonth,
              paid: false,
              installment: null
            });
            importedCount++;
            console.log(`[Pluggy Sync] Criado lançamento da fatura consolidada: ${bankName} no valor de R$ ${billForMonth.totalAmount}`);
          }
        }
      } else if (isCredit && targetMonthTxs.length === 0 && acc.balance && Math.abs(acc.balance) > 0) {
        // Se a instituição reportar o valor no campo balance da conta
        const cardBalance = Math.abs(Number(acc.balance));
        const defaultDate = `${targetMonth || '2026-10'}-10`;
        const balancePluggyId = `balance-${acc.id}-${targetMonth || '2026-10'}`;
        const alreadyHasBalanceTx = db.transactions.some(t => t.pluggyId === balancePluggyId);
        const wasDeleted = deletedSet.has(balancePluggyId);

        if (!alreadyHasBalanceTx && !wasDeleted) {
          db.transactions.push({
            id: `tx-acc-balance-${acc.id}-${targetMonth || '2026-10'}`,
            pluggyId: balancePluggyId,
            description: `Fatura ${bankName}`,
            amount: cardBalance,
            type: 'expense',
            category: 'Outros',
            account: bankName,
            date: defaultDate,
            month: defaultDate.substring(0, 7),
            paid: false,
            installment: null
          });
          importedCount++;
          console.log(`[Pluggy Sync] Criado lançamento pelo saldo da fatura: ${bankName} no valor de R$ ${cardBalance}`);
        }
      }

      for (const ptx of pluggyTxs) {
        const rawAmount = Number(ptx.amount);
        let isExpense = rawAmount < 0 || ptx.type === 'DEBIT';
        const positiveAmount = Math.abs(rawAmount);
        const txDate = ptx.date.substring(0, 10);
        let txMonth = txDate.substring(0, 7);
        const txSignature = `${ptx.description || ''}_${positiveAmount}_${txDate}`;

        // Se o usuário excluiu essa transação anteriormente, NÃO recria
        if (deletedSet.has(ptx.id) || deletedSet.has(txSignature)) {
          continue;
        }

        // Detectar pagamentos de fatura ou estornos/créditos em cartão de crédito
        const isPaymentOrCredit = /pagamento.*(saldo|fatura|recebido)|pgto.*fatura|cr[eé]dito de /i.test(ptx.description || '');
        if (isCredit && isPaymentOrCredit) {
          isExpense = false;
        }

        // Detectar parcelamento na descrição se houver (ex.: 'Loja 01/06' ou '3/10')
        let installment = null;
        const installmentMatch = ptx.description?.match(/(\d{1,2})\/(\d{1,2})/);
        if (installmentMatch) {
          installment = {
            current: parseInt(installmentMatch[1], 10),
            total: parseInt(installmentMatch[2], 10)
          };
        }

        // Tratar ciclo de faturamento e dia de fechamento
        const dayOfMonth = parseInt(txDate.substring(8, 10), 10);
        const isNubank = isCredit && (bankName.toLowerCase().includes('nubank') || existingAccount.billingCycle === 'previous_month');
        
        if (isNubank && installment && dayOfMonth >= 28) {
          txMonth = addMonths(txDate.substring(0, 7), 1);
        } else if (isCredit && existingAccount.closingDay && dayOfMonth >= existingAccount.closingDay) {
          txMonth = addMonths(txDate.substring(0, 7), 1);
        } else if (existingAccount.monthOffset && existingAccount.monthOffset !== 0) {
          txMonth = addMonths(txMonth, existingAccount.monthOffset);
        }

        // Verificação Robusta Anti-Duplicação:
        // 1. Mesmo pluggyId OU
        // 2. Mesma descrição E mesmo valor E mesma conta E mesma data
        const existingTxIndex = db.transactions.findIndex(t => 
          (ptx.id && t.pluggyId === ptx.id) ||
          (
            t.description?.trim().toLowerCase() === (ptx.description || '').trim().toLowerCase() &&
            Math.abs(Number(t.amount) - positiveAmount) < 0.01 &&
            t.account === bankName &&
            t.date?.substring(0, 10) === txDate
          )
        );

        if (existingTxIndex !== -1) {
          // Já existe: vincula o pluggyId caso estivesse sem, e atualiza apenas mês e parcelamento
          if (!db.transactions[existingTxIndex].pluggyId) {
            db.transactions[existingTxIndex].pluggyId = ptx.id;
          }
          db.transactions[existingTxIndex].month = txMonth;
          db.transactions[existingTxIndex].account = bankName;
          if (installment) db.transactions[existingTxIndex].installment = installment;
        } else {
          const newTransaction = {
            id: `tx-pluggy-${ptx.id || Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            pluggyId: ptx.id,
            description: ptx.description || 'Compra no Cartão',
            amount: positiveAmount,
            type: isExpense ? 'expense' : 'income',
            category: mapPluggyCategory(ptx.category),
            account: bankName,
            date: txDate,
            month: txMonth,
            paid: false,
            installment
          };

          db.transactions.push(newTransaction);
          importedCount++;
        }
      }
    }

    await saveDb(db);

    res.json({
      success: true,
      message: `Sincronização concluída! ${importedCount} lançamentos importados de ${accounts.length} contas/cartões.`,
      importedCount,
      accountsCount: accounts.length,
      billsCount
    });
  } catch (err) {
    console.error('Erro ao sincronizar com Pluggy:', err);
    res.status(500).json({ error: err.message || 'Erro ao comunicar com a API da Pluggy' });
  }
});

// Servir frontend compilado em produção se existir
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// Iniciar apenas se executado diretamente
if (process.env.NODE_ENV !== 'production' || process.argv[1]?.endsWith('index.js')) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` Servidor de Controle de Gastos rodando!`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(`===============================================`);
  });
}
