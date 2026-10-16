// Dados iniciais limpos para receber os dados reais da Pluggy
export const defaultInitialData = {
  categories: [
    { id: 'cat-1', name: 'Alimentação', color: '#f59e0b', icon: 'Utensils' },
    { id: 'cat-2', name: 'Transporte & Bike', color: '#3b82f6', icon: 'Bike' },
    { id: 'cat-3', name: 'Compras & Vestuário', color: '#ec4899', icon: 'ShoppingBag' },
    { id: 'cat-4', name: 'Contas & Fixas', color: '#ef4444', icon: 'FileText' },
    { id: 'cat-5', name: 'Educação & Livros', color: '#8b5cf6', icon: 'BookOpen' },
    { id: 'cat-6', name: 'Saúde & Farmácia', color: '#10b981', icon: 'HeartPulse' },
    { id: 'cat-7', name: 'Investimento & Reserva', color: '#06b6d4', icon: 'PiggyBank' },
    { id: 'cat-8', name: 'Salário & Entradas', color: '#22c55e', icon: 'TrendingUp' },
    { id: 'cat-9', name: 'Outros', color: '#64748b', icon: 'Layers' },
  ],
  accounts: [
    { id: 'acc-1', name: 'Fatura XP', type: 'credit_card', color: '#eab308' },
    { id: 'acc-2', name: 'Cartão Natalina', type: 'credit_card', color: '#ec4899' },
    { id: 'acc-3', name: 'Fatura Itaú', type: 'credit_card', color: '#f97316' },
    { id: 'acc-4', name: 'Nubank', type: 'bank_account', color: '#a855f7' },
    { id: 'acc-5', name: 'Despesas Fixas', type: 'cash', color: '#64748b' },
    { id: 'acc-6', name: 'Conta / PIX', type: 'bank_account', color: '#3b82f6' }
  ],
  transactions: []
};
