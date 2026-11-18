import { incomeContributionCents, isForecast, receivedByForecast } from './forecast.js';

// Totais do mês. Valores são somados em centavos para evitar erros de ponto flutuante.
//
// Tipos de lançamento:
//   expense  - gasto (entra nas despesas)
//   income   - receita (entra nas receitas)
//   transfer - movimentação entre contas próprias: pagamento de fatura, aplicação /
//              resgate automático, Pix para si mesmo. Aparece na lista mas NÃO entra
//              nos totais, senão a fatura paga pela conta corrente seria contada duas
//              vezes (a compra no cartão + o pagamento da fatura).
//
// Entradas previstas à mão (ex.: salário do fim do mês) contam só pelo que ainda falta receber:
// os depósitos do banco ligados a elas já entram por conta própria (ver forecast.js).
export function computeMonthSummary(transactions, accounts, surplusTarget = null) {
  const accountTypes = new Map(accounts.map(a => [a.id, a.type]));
  const received = receivedByForecast(transactions);

  let income = 0;
  let forecastPending = 0;
  let expense = 0;
  let paid = 0;
  let pending = 0;
  let creditCard = 0;
  let transfers = 0;
  const byAccount = {};
  const byCategory = {};

  for (const t of transactions) {
    const cents = toCents(t.amount);
    if (t.type === 'income') {
      const contribution = incomeContributionCents(t, received);
      income += contribution;
      if (isForecast(t)) forecastPending += contribution;
      continue;
    }
    if (t.type === 'transfer') {
      transfers += cents;
      continue;
    }
    expense += cents;
    if (t.paid) paid += cents; else pending += cents;
    if (accountTypes.get(t.accountId) === 'credit_card') creditCard += cents;
    byAccount[t.account] = (byAccount[t.account] || 0) + cents;
    byCategory[t.category] = (byCategory[t.category] || 0) + cents;
  }

  const target = surplusTarget === null || surplusTarget === undefined ? 0 : toCents(surplusTarget);

  return {
    totalIncome: fromCents(income),
    // Parte das entradas que ainda é só previsão (não caiu no banco).
    incomeForecastPending: fromCents(forecastPending),
    totalExpense: fromCents(expense),
    netBalance: fromCents(income - expense),
    totalPaid: fromCents(paid),
    totalPending: fromCents(pending),
    creditCardExpenses: fromCents(creditCard),
    fixedExpenses: fromCents(expense - creditCard),
    totalTransfers: fromCents(transfers),
    availableToSpend: fromCents(income - expense - target),
    customSurplusTarget: surplusTarget,
    expensesByAccount: mapValues(byAccount, fromCents),
    expensesByCategory: mapValues(byCategory, fromCents)
  };
}

export function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

export function fromCents(cents) {
  return cents / 100;
}

function mapValues(obj, fn) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));
}
