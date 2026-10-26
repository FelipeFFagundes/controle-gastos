// Utilitários de mês (YYYY-MM) e data (YYYY-MM-DD) sem depender de fuso horário.
// Toda a aritmética é feita sobre números, nunca via `new Date('YYYY-MM-DD')`,
// que interpreta a string como UTC e desloca o dia no fuso de Brasília.

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isValidMonth(value) {
  return typeof value === 'string' && MONTH_RE.test(value);
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return d <= daysInMonth(y, m);
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonths(monthStr, count) {
  const [year, month] = monthStr.split('-').map(Number);
  const index = year * 12 + (month - 1) + count;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

// Soma meses a uma data mantendo o dia, limitado ao último dia do mês de destino
// (31/01 + 1 mês = 28/02 ou 29/02, e não 03/03).
export function addMonthsToDate(dateStr, count) {
  const day = Number(dateStr.slice(8, 10));
  const targetMonth = addMonths(dateStr.slice(0, 7), count);
  const [y, m] = targetMonth.split('-').map(Number);
  const clampedDay = Math.min(day, daysInMonth(y, m));
  return `${targetMonth}-${String(clampedDay).padStart(2, '0')}`;
}

export function monthOf(dateStr) {
  return dateStr.slice(0, 7);
}

export function dayOf(dateStr) {
  return Number(dateStr.slice(8, 10));
}

export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function daysAgo(days, now = new Date()) {
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
