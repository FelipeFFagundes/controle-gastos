// Leituras e escritas via React Query. Toda escrita invalida os dados afetados,
// então a tela sempre reflete o que está gravado no servidor.
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

export const useCategories = (enabled) => useQuery({ queryKey: keys.categories, queryFn: api.categories, enabled, staleTime: Infinity });
export const useAccounts = (enabled) => useQuery({ queryKey: keys.accounts, queryFn: api.accounts, enabled });
export const useMonths = (enabled) => useQuery({ queryKey: keys.months, queryFn: api.months, enabled });
export const useMonthData = (month, enabled) => useQuery({ queryKey: keys.month(month), queryFn: () => api.month(month), enabled, placeholderData: (prev) => prev });
export const useInstallments = (month, enabled) => useQuery({ queryKey: keys.installments(month), queryFn: () => api.installments(month), enabled, placeholderData: (prev) => prev });
export const usePluggyStatus = (enabled) => useQuery({ queryKey: keys.pluggy, queryFn: api.pluggyStatus, enabled });

// Lançamentos e contas afetam meses, parcelas e totais: invalida tudo que depende deles.
function useInvalidatingMutation(mutationFn, extraKeys = []) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['month'] }),
      queryClient.invalidateQueries({ queryKey: ['installments'] }),
      queryClient.invalidateQueries({ queryKey: keys.months }),
      ...extraKeys.map(queryKey => queryClient.invalidateQueries({ queryKey }))
    ])
  });
}

export const useSaveTransaction = () =>
  useInvalidatingMutation(({ id, data }) => (id ? api.updateTransaction(id, data) : api.createTransaction(data)));

export const useDeleteTransaction = () => useInvalidatingMutation((id) => api.deleteTransaction(id));

export const useSaveAccount = () =>
  useInvalidatingMutation(({ id, data }) => (id ? api.updateAccount(id, data) : api.createAccount(data)), [keys.accounts]);

export const useDeleteAccount = () =>
  useInvalidatingMutation(({ id, withTransactions }) => api.deleteAccount(id, withTransactions), [keys.accounts]);

export const useResetData = () =>
  useInvalidatingMutation((mode) => (mode === 'seed' ? api.resetSeed() : api.clearAll()), [keys.accounts]);

export const usePluggySync = () => useInvalidatingMutation((options) => api.pluggySync(options), [keys.accounts, keys.pluggy]);

// Marcar como pago é atualizado na tela na hora (otimista) e desfeito se o servidor recusar.
export function useTogglePaid(month) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.togglePaid(id),
    onMutate: async (id) => {
      const key = keys.month(month);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      if (previous) {
        queryClient.setQueryData(key, {
          ...previous,
          transactions: previous.transactions.map(t => (t.id === id ? { ...t, paid: !t.paid } : t))
        });
      }
      return { previous, key };
    },
    onError: (err, id, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['month'] }),
      queryClient.invalidateQueries({ queryKey: ['installments'] })
    ])
  });
}

export function useSetSurplus(month) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (target) => api.setSurplus(month, target),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.month(month) })
  });
}
