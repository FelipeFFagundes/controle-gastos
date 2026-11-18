// Previsões de entrada e os depósitos reais que as cumprem. Funções puras.
//
// Previsão: qualquer entrada lançada à mão (sem pluggyId), ex.: "Salário" de R$ 4.900 no dia 30.
// Depósito: entrada que veio do banco (Pluggy), ex.: "Salário PAYSMART" de R$ 2.408,88 no dia 15.
//
// Um depósito ligado a uma previsão (forecastId) desconta o que falta receber dela. Nos totais, a previsão
// só conta pelo que ainda falta; assim salário parcial (dia 15) + resto (dia 30) nunca somam por cima
// do salário previsto.
//
// O vínculo é automático:
//   1. regra aprendida: o usuário já ligou um depósito desta origem a uma previsão com este nome;
//   2. salário: depósito com "salário" na descrição vai para a previsão do mês com "salário" no nome.
import { merchantKey } from './merchant.js';
import { toCents } from './summary.js';

// Marca um depósito que o usuário desligou de propósito: o vínculo automático não o religa.
export const NOT_LINKED = 'none';

const SALARY_RE = /\bsalario\b|\bsalary\b|folha de pagamento|\bproventos\b|\bvencimentos\b/;

const normalize = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const isSalaryLike = (description) => SALARY_RE.test(normalize(description));

export const isForecast = (t) => t.type === 'income' && !t.pluggyId;

const isDeposit = (t) => t.type === 'income' && Boolean(t.pluggyId);

const isLinked = (t) => Boolean(t.forecastId) && t.forecastId !== NOT_LINKED;

// Centavos já recebidos por previsão, considerando só depósitos do mesmo mês.
export function receivedByForecast(transactions) {
  const forecasts = new Map(transactions.filter(isForecast).map(f => [f.id, f]));
  const received = new Map();
  for (const t of transactions) {
    if (!isDeposit(t) || !isLinked(t)) continue;
    const forecast = forecasts.get(t.forecastId);
    if (!forecast || forecast.month !== t.month) continue;
    received.set(forecast.id, (received.get(forecast.id) || 0) + toCents(t.amount));
  }
  return received;
}

// Quanto cada entrada soma no total do mês, em centavos. Previsão: só o que falta receber.
export function incomeContributionCents(t, received) {
  const cents = toCents(t.amount);
  if (!isForecast(t)) return cents;
  return Math.max(0, cents - (received.get(t.id) || 0));
}

// Novos vínculos para os depósitos ainda soltos: [{ id, forecastId }].
// `rules`: Map de merchantKey(origem do depósito) -> merchantKey(nome da previsão), aprendido com o usuário.
export function proposeLinks(transactions, rules = new Map()) {
  const forecasts = transactions.filter(isForecast);
  if (!forecasts.length) return [];

  const received = receivedByForecast(transactions);
  const remaining = (f) => toCents(f.amount) - (received.get(f.id) || 0);
  const links = [];

  const deposits = transactions
    .filter(t => isDeposit(t) && !t.forecastId)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  for (const deposit of deposits) {
    const sameMonth = forecasts.filter(f => f.month === deposit.month);
    if (!sameMonth.length) continue;

    const learned = rules.get(merchantKey(deposit.description));
    let candidates = learned ? sameMonth.filter(f => merchantKey(f.description) === learned) : [];
    if (!candidates.length && isSalaryLike(deposit.description)) {
      candidates = sameMonth.filter(f => isSalaryLike(f.description));
    }
    if (!candidates.length) continue;

    // Mais de uma previsão possível: a que mais falta receber.
    const target = candidates.reduce((best, f) => (remaining(f) > remaining(best) ? f : best));
    links.push({ id: deposit.id, forecastId: target.id });
    received.set(target.id, (received.get(target.id) || 0) + toCents(deposit.amount));
  }
  return links;
}

// Dados extras para a tela: na previsão, quanto já caiu; no depósito, de qual previsão ele faz parte.
export function annotateForecasts(transactions) {
  const received = receivedByForecast(transactions);
  const byId = new Map(transactions.map(t => [t.id, t]));
  return transactions.map(t => {
    if (isForecast(t)) {
      const got = received.get(t.id) || 0;
      if (!got) return t;
      const total = toCents(t.amount);
      return { ...t, forecast: { received: got / 100, remaining: Math.max(0, total - got) / 100 } };
    }
    if (isDeposit(t) && isLinked(t)) {
      const forecast = byId.get(t.forecastId);
      return forecast ? { ...t, forecastDescription: forecast.description } : t;
    }
    return t;
  });
}
