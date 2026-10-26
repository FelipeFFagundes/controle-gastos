import { addMonths, dayOf, monthOf } from './months.js';

// Regra única para decidir em qual mês (fatura / competência) um lançamento entra.
//
// 1. Ponto de partida: mês da data do lançamento.
// 2. Cartão com dia de fechamento: compras a partir do fechamento vão para a fatura seguinte.
// 3. Deslocamento manual da conta (monthOffset: -1, 0, +1) é somado no final.
export function billingMonth(account, date) {
  let month = monthOf(date);
  if (account?.type === 'credit_card' && account.closingDay && dayOf(date) >= account.closingDay) {
    month = addMonths(month, 1);
  }
  const offset = Number(account?.monthOffset) || 0;
  return offset ? addMonths(month, offset) : month;
}

export const BILLING_CYCLE_OFFSETS = {
  previous_month: -1,
  same_month: 0,
  next_month: 1
};

export function offsetToBillingCycle(offset) {
  if (offset === -1) return 'previous_month';
  if (offset === 1) return 'next_month';
  return 'same_month';
}
