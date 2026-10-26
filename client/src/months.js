export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(monthStr, count) {
  const [year, month] = monthStr.split('-').map(Number);
  const index = year * 12 + (month - 1) + count;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function formatMonthTitle(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const name = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
  return `${name.charAt(0).toUpperCase() + name.slice(1)} de ${year}`;
}
