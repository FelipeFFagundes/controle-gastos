// Dados iniciais extraídos diretamente da planilha "Planilha Controle.xlsx" (Outubro de 2026)
export const initialData = {
  categories: [
    { id: 'cat-1', name: 'Alimentação', color: '#BF8418', icon: 'Utensils' },
    { id: 'cat-2', name: 'Transporte & Bike', color: '#4A82D6', icon: 'Bike' },
    { id: 'cat-3', name: 'Compras & Vestuário', color: '#D45A9E', icon: 'ShoppingBag' },
    { id: 'cat-4', name: 'Contas & Fixas', color: '#D9634F', icon: 'FileText' },
    { id: 'cat-5', name: 'Educação & Livros', color: '#9E6AD3', icon: 'BookOpen' },
    { id: 'cat-6', name: 'Saúde & Farmácia', color: '#1FA3B8', icon: 'HeartPulse' },
    { id: 'cat-7', name: 'Investimento & Reserva', color: '#6BA33A', icon: 'PiggyBank' },
    { id: 'cat-8', name: 'Salário & Entradas', color: '#6CCB7A', icon: 'TrendingUp' },
    { id: 'cat-9', name: 'Outros', color: '#7D8B86', icon: 'Layers' },
  ],
  accounts: [
    { id: 'acc-1', name: 'Fatura XP', type: 'credit_card', color: '#BF8418' },
    { id: 'acc-2', name: 'Cartão Natalina', type: 'credit_card', color: '#D45A9E' },
    { id: 'acc-3', name: 'Fatura Itaú', type: 'credit_card', color: '#EC7000' },
    { id: 'acc-4', name: 'Nubank', type: 'bank_account', color: '#9E6AD3' },
    { id: 'acc-5', name: 'Despesas Fixas', type: 'cash', color: '#7D8B86' },
    { id: 'acc-6', name: 'Conta / PIX', type: 'bank_account', color: '#4A82D6' }
  ],
  transactions: [
    // --- RECEITAS OUTUBRO 2026 ---
    {
      id: 'tx-rec-1',
      description: 'Salário / Receita Principal',
      amount: 1545.00,
      type: 'income',
      category: 'Salário & Entradas',
      account: 'Conta / PIX',
      date: '2026-10-05',
      month: '2026-10',
      paid: true,
      installment: null
    },
    {
      id: 'tx-rec-2',
      description: 'Receita Secundária / Rendimentos',
      amount: 944.57,
      type: 'income',
      category: 'Salário & Entradas',
      account: 'Conta / PIX',
      date: '2026-10-15',
      month: '2026-10',
      paid: true,
      installment: null
    },
    {
      id: 'tx-rec-3',
      description: 'Entrada Extra',
      amount: 390.00,
      type: 'income',
      category: 'Salário & Entradas',
      account: 'Conta / PIX',
      date: '2026-10-20',
      month: '2026-10',
      paid: true,
      installment: null
    },

    // --- FATURA XP (Compras & Parcelas de Outubro 2026) ---
    {
      id: 'tx-xp-1',
      description: 'Discos',
      amount: 181.49,
      type: 'expense',
      category: 'Transporte & Bike',
      account: 'Fatura XP',
      date: '2026-10-02',
      month: '2026-10',
      paid: false,
      installment: { current: 5, total: 12 }
    },
    {
      id: 'tx-xp-2',
      description: 'Farm',
      amount: 35.84,
      type: 'expense',
      category: 'Compras & Vestuário',
      account: 'Fatura XP',
      date: '2026-10-04',
      month: '2026-10',
      paid: false,
      installment: { current: 3, total: 4 }
    },
    {
      id: 'tx-xp-3',
      description: 'Farol Dianteiro',
      amount: 30.59,
      type: 'expense',
      category: 'Transporte & Bike',
      account: 'Fatura XP',
      date: '2026-10-05',
      month: '2026-10',
      paid: false,
      installment: { current: 4, total: 10 }
    },
    {
      id: 'tx-xp-4',
      description: 'Aliexpress',
      amount: 121.47,
      type: 'expense',
      category: 'Compras & Vestuário',
      account: 'Fatura XP',
      date: '2026-10-08',
      month: '2026-10',
      paid: false,
      installment: null
    },
    {
      id: 'tx-xp-5',
      description: 'North Face',
      amount: 149.90,
      type: 'expense',
      category: 'Compras & Vestuário',
      account: 'Fatura XP',
      date: '2026-10-10',
      month: '2026-10',
      paid: false,
      installment: { current: 1, total: 4 }
    },
    {
      id: 'tx-xp-6',
      description: 'Protetor de Quadro',
      amount: 287.00,
      type: 'expense',
      category: 'Transporte & Bike',
      account: 'Fatura XP',
      date: '2026-10-12',
      month: '2026-10',
      paid: false,
      installment: { current: 3, total: 10 }
    },
    {
      id: 'tx-xp-7',
      description: 'Despesa Fatura XP 1',
      amount: 447.95,
      type: 'expense',
      category: 'Outros',
      account: 'Fatura XP',
      date: '2026-10-14',
      month: '2026-10',
      paid: false,
      installment: null
    },
    {
      id: 'tx-xp-8',
      description: 'Farmácia / Diversos XP',
      amount: 23.62,
      type: 'expense',
      category: 'Saúde & Farmácia',
      account: 'Fatura XP',
      date: '2026-10-16',
      month: '2026-10',
      paid: false,
      installment: null
    },
    {
      id: 'tx-xp-9',
      description: 'Lanches / Alimentação XP',
      amount: 37.93,
      type: 'expense',
      category: 'Alimentação',
      account: 'Fatura XP',
      date: '2026-10-18',
      month: '2026-10',
      paid: false,
      installment: null
    },
    {
      id: 'tx-xp-10',
      description: 'Outras Compras Fatura XP',
      amount: 999.70,
      type: 'expense',
      category: 'Outros',
      account: 'Fatura XP',
      date: '2026-10-20',
      month: '2026-10',
      paid: false,
      installment: null
    },

    // --- DESPESAS FIXAS / MENSAIS (Colunas I & J) ---
    {
      id: 'tx-fix-1',
      description: 'Total Fixo Mensal',
      amount: 21.90,
      type: 'expense',
      category: 'Contas & Fixas',
      account: 'Despesas Fixas',
      date: '2026-10-01',
      month: '2026-10',
      paid: true,
      installment: null
    },
    {
      id: 'tx-fix-2',
      description: 'Livro Murilo',
      amount: 13.90,
      type: 'expense',
      category: 'Educação & Livros',
      account: 'Despesas Fixas',
      date: '2026-10-02',
      month: '2026-10',
      paid: true,
      installment: null
    },
    {
      id: 'tx-fix-3',
      description: 'Adiantamento 13º',
      amount: 59.90,
      type: 'expense',
      category: 'Contas & Fixas',
      account: 'Despesas Fixas',
      date: '2026-10-05',
      month: '2026-10',
      paid: true,
      installment: null
    },
    {
      id: 'tx-fix-4',
      description: 'Investir / Reserva',
      amount: 13.90,
      type: 'expense',
      category: 'Investimento & Reserva',
      account: 'Despesas Fixas',
      date: '2026-10-10',
      month: '2026-10',
      paid: true,
      installment: null
    },
    {
      id: 'tx-fix-5',
      description: 'Ajuda Chuvas',
      amount: 439.90,
      type: 'expense',
      category: 'Outros',
      account: 'Despesas Fixas',
      date: '2026-10-12',
      month: '2026-10',
      paid: true,
      installment: null
    },
    {
      id: 'tx-fix-6',
      description: 'Compromisso Fixo / Parcela',
      amount: 390.00,
      type: 'expense',
      category: 'Contas & Fixas',
      account: 'Despesas Fixas',
      date: '2026-10-15',
      month: '2026-10',
      paid: true,
      installment: null
    },
    {
      id: 'tx-fix-7',
      description: 'Vô',
      amount: 9.90,
      type: 'expense',
      category: 'Outros',
      account: 'Despesas Fixas',
      date: '2026-10-18',
      month: '2026-10',
      paid: true,
      installment: null
    },
    {
      id: 'tx-fix-8',
      description: 'Diversos Fixos',
      amount: 23.99,
      type: 'expense',
      category: 'Contas & Fixas',
      account: 'Despesas Fixas',
      date: '2026-10-22',
      month: '2026-10',
      paid: true,
      installment: null
    },

    // --- CARTÃO NATALINA / OUTRAS DESPESAS (Coluna P) ---
    {
      id: 'tx-nat-1',
      description: 'Fatura / Despesa Natalina Principal',
      amount: 4900.00,
      type: 'expense',
      category: 'Contas & Fixas',
      account: 'Cartão Natalina',
      date: '2026-10-10',
      month: '2026-10',
      paid: false,
      installment: null
    },
    {
      id: 'tx-nat-2',
      description: 'Despesa Natalina 2',
      amount: 814.00,
      type: 'expense',
      category: 'Outros',
      account: 'Cartão Natalina',
      date: '2026-10-12',
      month: '2026-10',
      paid: false,
      installment: null
    },
    {
      id: 'tx-nat-3',
      description: 'Despesa Natalina 3',
      amount: 713.00,
      type: 'expense',
      category: 'Outros',
      account: 'Cartão Natalina',
      date: '2026-10-15',
      month: '2026-10',
      paid: false,
      installment: null
    },
    {
      id: 'tx-nat-4',
      description: 'Dia 18',
      amount: 180.00,
      type: 'expense',
      category: 'Contas & Fixas',
      account: 'Cartão Natalina',
      date: '2026-10-18',
      month: '2026-10',
      paid: false,
      installment: null
    },
    {
      id: 'tx-nat-5',
      description: 'Adiantamento 13º Natalina',
      amount: 59.90,
      type: 'expense',
      category: 'Contas & Fixas',
      account: 'Cartão Natalina',
      date: '2026-10-20',
      month: '2026-10',
      paid: false,
      installment: null
    }
  ]
};
