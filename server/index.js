import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initialData } from './seed.js';
import { getDb, saveDb } from './db.js';
import { 
  getPluggyApiKey, 
  getPluggyAccounts, 
  getPluggyBills,
  getPluggyTransactions, 
  mapPluggyCategory 
} from './pluggy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

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

// Helper para adicionar meses (YYYY-MM)
function addMonths(monthStr, count) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1 + count, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

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

  const netBalance = totalIncome - totalExpense;
  // O que ainda pode gastar no cartão antes de estourar a receita total esperada (salário + entradas - outros gastos)
  const availableToSpend = Math.max(0, totalIncome - totalExpense);

  res.json({
    month,
    categories: db.categories,
    accounts: db.accounts,
    transactions: monthTransactions,
    summary: {
      totalIncome,
      totalExpense,
      netBalance,
      totalPaid,
      totalPending,
      creditCardExpenses,
      fixedExpenses,
      availableToSpend,
      expensesByAccount,
      expensesByCategory
    }
  });
});

// 3. Obter todos os parcelamentos ativos
app.get(['/api/installments', '/installments'], async (req, res) => {
  const db = await getDb();
  const currentMonth = req.query.month || '2026-10';

  const installmentsMap = new Map();

  db.transactions.forEach(t => {
    if (t.installment && t.installment.total > 1) {
      const key = `${t.description}__${t.account}`;
      if (!installmentsMap.has(key)) {
        installmentsMap.set(key, {
          description: t.description,
          account: t.account,
          category: t.category,
          amountPerInstallment: t.amount,
          totalAmount: t.amount * t.installment.total,
          totalInstallments: t.installment.total,
          currentInMonth: t.month === currentMonth ? t.installment.current : null,
          history: []
        });
      }
      installmentsMap.get(key).history.push({
        id: t.id,
        month: t.month,
        current: t.installment.current,
        paid: t.paid,
        amount: t.amount
      });
    }
  });

  const installmentsList = Array.from(installmentsMap.values()).map(inst => {
    inst.history.sort((a, b) => a.current - b.current);
    const match = inst.history.find(h => h.month === currentMonth);
    const activeCurrent = match ? match.current : (inst.history[inst.history.length - 1]?.current || 1);
    return {
      ...inst,
      currentInstallment: activeCurrent,
      isCompleted: activeCurrent >= inst.totalInstallments
    };
  });

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
  const baseMonth = date.substring(0, 7);
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
  const { description, amount, type, category, account, date, paid, installment } = req.body;

  const updatedDate = date || existing.date;
  const updatedMonth = updatedDate.substring(0, 7);

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

  db.transactions = db.transactions.filter(t => t.id !== id);

  if (db.transactions.length === initialLength) {
    return res.status(404).json({ error: 'Transação não encontrada.' });
  }

  await saveDb(db);
  res.json({ success: true, message: 'Transação removida com sucesso.' });
});

// 8. Restaurar dados iniciais
app.post(['/api/reset-seed', '/reset-seed'], async (req, res) => {
  await saveDb(initialData);
  res.json({ success: true, message: 'Dados restaurados para o padrão de Outubro de 2026.' });
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

// 11. Sincronizar transações e faturas via Pluggy (Open Finance)
app.post(['/api/pluggy/sync', '/pluggy/sync'], async (req, res) => {
  try {
    const clientId = req.body.clientId || process.env.PLUGGY_CLIENT_ID;
    const clientSecret = req.body.clientSecret || process.env.PLUGGY_CLIENT_SECRET;
    const targetMonth = req.body.month;
    const clearBeforeSync = Boolean(req.body.clearExisting);

    if (!clientId || !clientSecret) {
      return res.status(400).json({ 
        error: 'Credenciais da Pluggy não informadas. Forneça clientId e clientSecret ou configure no ambiente.' 
      });
    }

    // 1. Obter token de acesso
    const apiKey = await getPluggyApiKey(clientId, clientSecret);

    // 2. Obter contas e cartões conectados
    const accounts = await getPluggyAccounts(apiKey);
    if (!accounts || accounts.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhuma conta encontrada conectada na Pluggy.',
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

    // 3. Processar cada conta / cartão
    for (const acc of accounts) {
      const bankName = acc.name || acc.marketingName || (acc.type === 'CREDIT' ? 'Cartão de Crédito' : 'Conta Bancária');
      
      // Auto-cadastrar a conta no app se ainda não existir
      let existingAccount = db.accounts.find(a => a.name.toLowerCase() === bankName.toLowerCase());
      if (!existingAccount) {
        existingAccount = {
          id: `acc-pluggy-${acc.id}`,
          name: bankName,
          type: acc.type === 'CREDIT' ? 'credit_card' : 'bank_account',
          color: acc.type === 'CREDIT' ? '#eab308' : '#3b82f6'
        };
        db.accounts.push(existingAccount);
      }

      // Se for cartão de crédito, busca faturas para identificar vencimentos
      if (acc.type === 'CREDIT') {
        const bills = await getPluggyBills(apiKey, acc.id);
        billsCount += bills.length;
      }

      // Buscar transações
      const pluggyTxs = await getPluggyTransactions(apiKey, acc.id, fromDate);

      for (const ptx of pluggyTxs) {
        const alreadyExists = db.transactions.some(t => 
          t.pluggyId === ptx.id || 
          (t.description === ptx.description && t.amount === Math.abs(ptx.amount) && t.date.startsWith(ptx.date.substring(0, 10)))
        );

        if (!alreadyExists) {
          const rawAmount = Number(ptx.amount);
          const isExpense = rawAmount < 0 || ptx.type === 'DEBIT';
          const positiveAmount = Math.abs(rawAmount);
          const txDate = ptx.date.substring(0, 10);
          const txMonth = txDate.substring(0, 7);

          // Detectar parcelamento na descrição se houver (ex.: 'Loja 01/06' ou '3/10')
          let installment = null;
          const installmentMatch = ptx.description?.match(/(\d{1,2})\/(\d{1,2})/);
          if (installmentMatch) {
            installment = {
              current: parseInt(installmentMatch[1], 10),
              total: parseInt(installmentMatch[2], 10)
            };
          }

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
            paid: true,
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
