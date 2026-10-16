import { defaultInitialData } from './initialData.js';

const STORAGE_KEY = 'controle_gastos_db_v1';

export function getLocalDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erro ao ler localStorage:', e);
  }
  // Inicializa com dados de Outubro 2026
  saveLocalDb(defaultInitialData);
  return JSON.parse(JSON.stringify(defaultInitialData));
}

export function saveLocalDb(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
}

export function computeMonthData(db, month = '2026-10') {
  const transactions = (db.transactions || []).filter(t => t.month === month);

  let totalIncome = 0;
  let totalExpense = 0;
  let totalPaid = 0;
  let totalPending = 0;

  const expensesByAccount = {};
  const expensesByCategory = {};

  transactions.forEach(t => {
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
      expensesByAccount[t.account] = (expensesByAccount[t.account] || 0) + amount;
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + amount;
    }
  });

  const netBalance = totalIncome - totalExpense;

  return {
    month,
    categories: db.categories || [],
    accounts: db.accounts || [],
    transactions,
    summary: {
      totalIncome,
      totalExpense,
      netBalance,
      totalPaid,
      totalPending,
      expensesByAccount,
      expensesByCategory
    }
  };
}

export function computeInstallments(db, currentMonth = '2026-10') {
  const installmentsMap = new Map();

  (db.transactions || []).forEach(t => {
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

  return Array.from(installmentsMap.values()).map(inst => {
    inst.history.sort((a, b) => a.current - b.current);
    const match = inst.history.find(h => h.month === currentMonth);
    const activeCurrent = match ? match.current : (inst.history[inst.history.length - 1]?.current || 1);
    return {
      ...inst,
      currentInstallment: activeCurrent,
      isCompleted: activeCurrent >= inst.totalInstallments
    };
  });
}
