// Formatação e leitura de valores no padrão brasileiro.

// Com os valores ocultos (olho no cabeçalho, ver hideValues.js), todo valor em reais vira "R$ •••••",
// para mostrar o app a alguém sem expor os gastos. Quem liga e desliga é o App, que se redesenha inteiro.
let valuesHidden = false;
export const setValuesHidden = (hidden) => { valuesHidden = hidden; };

export const formatBRL = (value) =>
  valuesHidden
    ? 'R$ •••••'
    : Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Valor com o sinal no texto: "+R$ 2.879,57", "−R$ 9.955,78" (zero fica sem sinal).
export const formatSignedBRL = (value) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatBRL(Math.abs(value || 0))}`;

// 0.0014 -> "0,1%"; 3.4575 -> "345,8%". Uma casa decimal, para um valor pequeno não virar "0%".
export const formatPercent = (ratio) =>
  `${(ratio * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

// Aceita o que a pessoa digita no celular: "45,90", "1.234,56", "45.90" ou "45".
export function parseAmount(text) {
  const raw = String(text ?? '').trim().replace(/[^\d.,-]/g, '');
  if (!raw) return NaN;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  return Number(normalized);
}

// Valor numérico -> texto para o campo de edição ("45,9" -> "45,90").
export const formatAmountInput = (value) =>
  value === null || value === undefined || value === '' ? '' : Number(value).toFixed(2).replace('.', ',');

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function localISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// "2026-10-26" -> "Hoje", "Ontem" ou "Sex, 23 out"
export function formatDayHeader(isoDate) {
  if (!isoDate) return '';
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (isoDate === localISODate(today)) return 'Hoje';
  if (isoDate === localISODate(yesterday)) return 'Ontem';
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = y === today.getFullYear();
  return `${WEEKDAYS[date.getDay()]}, ${d} ${MONTHS_SHORT[m - 1]}${sameYear ? '' : ` ${y}`}`;
}

// "2026-11" -> "nov"  (ou "nov/27" se for de outro ano)
export function formatMonthShort(month) {
  const [y, m] = month.split('-').map(Number);
  const label = MONTHS_SHORT[m - 1];
  return y === new Date().getFullYear() ? label : `${label}/${String(y).slice(2)}`;
}
