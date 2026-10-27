// Leituras e escritas via React Query. Toda escrita invalida os dados afetados,
// então a tela sempre reflete o que está gravado no servidor.
// As escritas mais usadas atualizam a tela na hora (otimista) e desfazem se o servidor recusar.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const keys = {
  categories: ['categories'],
  accounts: ['accounts'],
  months: ['months'],
  month: (m) => ['month', m],
  installments: (m) => ['installments', m],
  pluggy: ['pluggy-status']
};

export const monthQueryOptions = (month) => ({ queryKey: keys.month(month), queryFn: () => api.month(month) });

export const useCategories = (enabled) => useQuery({ queryKey: keys.categories, queryFn: api.categories, enabled, staleTime: Infinity });
export const useAccounts = (enabled) => useQuery({ queryKey: keys.accounts, queryFn: api.accounts, enabled });
export const useMonths = (enabled) => useQuery({ queryKey: keys.months, queryFn: api.months, enabled });
// Sem placeholderData: mostrar os números do mês anterior sob o título do novo mês engana. Enquanto
// carrega aparece o esqueleto; os meses vizinhos já vêm pré-carregados (usePrefetchOnIdle).
export const useMonthData = (month, enabled) => useQuery({ ...monthQueryOptions(month), enabled });
export const useInstallments = (month, enabled) => useQuery({ queryKey: keys.installments(month), queryFn: () => api.installments(month), enabled });
export const usePluggyStatus = (enabled) => useQuery({ queryKey: keys.pluggy, queryFn: api.pluggyStatus, enabled });

const invalidateFinancialData = (queryClient, extraKeys = []) => Promise.all([
  queryClient.invalidateQueries({ queryKey: ['month'] }),
  queryClient.invalidateQueries({ queryKey: ['installments'] }),
  queryClient.invalidateQueries({ queryKey: keys.months }),
  ...extraKeys.map(queryKey => queryClient.invalidateQueries({ queryKey }))
]);

// Lançamentos e contas afetam meses, parcelas e totais: invalida tudo que depende deles.
function useInvalidatingMutation(mutationFn, extraKeys = []) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => invalidateFinancialData(queryClient, extraKeys)
  });
}

// Aplica `change` aos dados do mês na hora e guarda o estado anterior para desfazer.
async function patchMonth(queryClient, month, change) {
  const key = keys.month(month);
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData(key);
  if (previous) queryClient.setQueryData(key, change(previous));
  return { key, previous };
}

const rollback = (queryClient) => (err, vars, context) => {
  if (context?.previous) queryClient.setQueryData(context.key, context.previous);
};

function optimisticTransaction(data, accounts, existing = {}) {
  const account = accounts.find(a => a.id === data.accountId);
  return {
    ...existing,
    ...data,
    account: account?.name ?? existing.account,
    installment: data.isInstallment
      ? { current: Number(data.currentInstallment), total: Number(data.totalInstallments) }
      : (data.isInstallment === false ? null : existing.installment ?? null),
    monthLocked: Boolean(data.month) || existing.monthLocked
  };
}

// Novo lançamento entra na lista do mês exibido com um id provisório; editar atualiza a linha na hora.
export function useSaveTransaction(month) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => (id ? api.updateTransaction(id, data) : api.createTransaction(data)),
    onMutate: ({ id, data }) => {
      const accounts = queryClient.getQueryData(keys.accounts) || [];
      return patchMonth(queryClient, month, (current) => ({
        ...current,
        transactions: id
          ? current.transactions.map(t => (t.id === id ? optimisticTransaction(data, accounts, t) : t))
          : [{ ...optimisticTransaction(data, accounts), id: `tmp-${Date.now()}`, month, pending: true }, ...current.transactions]
      }));
    },
    onError: rollback(queryClient),
    onSettled: () => invalidateFinancialData(queryClient)
  });
}

export const useDeleteTransaction = () => useInvalidatingMutation((id) => api.deleteTransaction(id));

export const useSaveAccount = () =>
  useInvalidatingMutation(({ id, data }) => (id ? api.updateAccount(id, data) : api.createAccount(data)), [keys.accounts]);

export const useDeleteAccount = () =>
  useInvalidatingMutation(({ id, withTransactions }) => api.deleteAccount(id, withTransactions), [keys.accounts]);

export const useResetData = () =>
  useInvalidatingMutation((mode) => (mode === 'seed' ? api.resetSeed() : api.clearAll()), [keys.accounts]);

export const usePluggySync = () => useInvalidatingMutation((options) => api.pluggySync(options), [keys.accounts, keys.pluggy]);

// Pago/pendente: define o estado (repetir o pedido não desfaz), já mostrado na tela.
export function useSetPaid(month) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paid }) => api.setPaid(id, paid),
    onMutate: ({ id, paid }) => patchMonth(queryClient, month, (current) => ({
      ...current,
      transactions: current.transactions.map(t => (t.id === id ? { ...t, paid } : t))
    })),
    onError: rollback(queryClient),
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['month'] }),
      queryClient.invalidateQueries({ queryKey: ['installments'] })
    ])
  });
}

// Meta de sobra: o "disponível para gastar" (entradas − saídas − meta) muda na hora.
export function useSetSurplus(month) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (target) => api.setSurplus(month, target),
    onMutate: (target) => patchMonth(queryClient, month, (current) => ({
      ...current,
      summary: current.summary && {
        ...current.summary,
        customSurplusTarget: target,
        availableToSpend: Math.round((current.summary.netBalance - (target ?? 0)) * 100) / 100
      }
    })),
    onError: rollback(queryClient),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.month(month) })
  });
}
