import { addMonths, addMonthsToDate } from './months.js';

const MAX_INSTALLMENTS = 48;

// Sufixo de parcela no fim da descrição: "AMAZON MARKETPLACE03/12", "Loja - Parcela 3/10".
const INSTALLMENT_SUFFIX_RE = /\s*-?\s*(?:parcela\s*)?(\d{1,2})\s*\/\s*(\d{1,2})\s*$/i;

export function isValidInstallment(current, total) {
  return Number.isInteger(current) && Number.isInteger(total)
    && total >= 2 && total <= MAX_INSTALLMENTS
    && current >= 1 && current <= total;
}

// Só reconhece o padrão no FIM da descrição e com números coerentes, para não
// confundir datas ("PAG 15/09") com parcelas.
export function parseInstallmentFromDescription(description = '') {
  const match = String(description).match(INSTALLMENT_SUFFIX_RE);
  if (!match) return null;
  const current = Number(match[1]);
  const total = Number(match[2]);
  return isValidInstallment(current, total) ? { current, total } : null;
}

export function stripInstallmentSuffix(description = '') {
  const text = String(description);
  return text.replace(INSTALLMENT_SUFFIX_RE, '').trim() || text.trim();
}

// Chave que agrupa as parcelas da mesma compra quando o banco não informa um id de compra.
export function installmentGroupKey(description, accountId, total) {
  return `${stripInstallmentSuffix(description).toLowerCase()}|${accountId}|${total}`;
}

// Gera as parcelas de uma compra lançada manualmente, a partir da parcela informada.
export function buildInstallmentSeries({ date, month, current, total }) {
  const series = [];
  for (let n = current; n <= total; n++) {
    const offset = n - current;
    series.push({
      current: n,
      total,
      date: addMonthsToDate(date, offset),
      month: addMonths(month, offset)
    });
  }
  return series;
}

// Visão "Parcelamentos Ativos" relativa ao mês selecionado.
export function summarizeInstallments(transactions, selectedMonth) {
  const groups = new Map();

  for (const t of transactions) {
    if (t.type !== 'expense' || !t.installment || t.installment.total < 2) continue;
    const key = t.installmentGroup || installmentGroupKey(t.description, t.accountId, t.installment.total);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        description: stripInstallmentSuffix(t.description),
        account: t.account,
        accountId: t.accountId,
        category: t.category,
        totalInstallments: t.installment.total,
        history: []
      });
    }
    const group = groups.get(key);
    if (!group.history.some(h => h.current === t.installment.current)) {
      group.history.push({
        id: t.id,
        month: t.month,
        current: t.installment.current,
        paid: t.paid,
        amount: t.amount
      });
    }
  }

  return Array.from(groups.values())
    .map(group => {
      group.history.sort((a, b) => a.current - b.current);
      const match = group.history.find(h => h.month === selectedMonth);
      const past = group.history.filter(h => h.month < selectedMonth);
      const currentInstallment = match
        ? match.current
        : (past.length ? Math.max(...past.map(h => h.current)) : 0);
      const amountPerInstallment = match
        ? match.amount
        : (group.history[group.history.length - 1]?.amount || 0);
      const remainingInstallments = Math.max(0, group.totalInstallments - currentInstallment);
      return {
        ...group,
        amountPerInstallment,
        amountThisMonth: match ? match.amount : 0,
        totalAmount: round2(amountPerInstallment * group.totalInstallments),
        currentInstallment,
        currentInMonth: match ? match.current : null,
        remainingInstallments,
        remainingDebt: round2(remainingInstallments * amountPerInstallment),
        isCompleted: currentInstallment >= group.totalInstallments && !match
      };
    })
    .filter(item => !item.isCompleted)
    .sort((a, b) => b.amountThisMonth - a.amountThisMonth);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
