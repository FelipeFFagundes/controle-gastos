// Texto da notificação enviada ao celular depois da sincronização automática. Função pura.

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

const formatBRL = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

export function monthName(month) {
  return MONTH_NAMES[Number(String(month).slice(5, 7)) - 1] || month;
}

// sync: { importedCount, updatedCount } (resultado de pluggySync.sync)
// availableToSpend: summary.availableToSpend do mês atual (pode ser negativo)
export function buildSyncNotification({ importedCount = 0, updatedCount = 0 }, availableToSpend, month) {
  const name = monthName(month);
  const balance = availableToSpend >= 0
    ? `Você ainda tem ${formatBRL(availableToSpend)} para gastar em ${name}.`
    : `Você passou ${formatBRL(-availableToSpend)} do limite de ${name}.`;

  const changes = [];
  if (importedCount) changes.push(plural(importedCount, 'lançamento novo', 'lançamentos novos'));
  if (updatedCount) changes.push(plural(updatedCount, 'atualizado', 'atualizados'));
  const detail = changes.length ? `${changes.join(', ')}.` : 'Nenhum lançamento novo.';

  return {
    title: 'Transações atualizadas',
    body: `${balance}\n${detail}`,
    // Mesma tag: a notificação de hoje substitui a de ontem em vez de empilhar.
    tag: 'sync-diario',
    url: '/'
  };
}
