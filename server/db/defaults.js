// Cores harmonizadas com a paleta do app (client/src/palette.js), validadas para daltonismo
// entre vizinhas no fundo escuro. Cada categoria também tem ícone e nome, então a cor nunca
// é a única forma de identificá-la.
export const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Alimentação', color: '#BF8418', icon: 'Utensils' },
  { id: 'cat-2', name: 'Transporte & Bike', color: '#4A82D6', icon: 'Bike' },
  { id: 'cat-3', name: 'Compras & Vestuário', color: '#D45A9E', icon: 'ShoppingBag' },
  { id: 'cat-4', name: 'Contas & Fixas', color: '#D9634F', icon: 'FileText' },
  { id: 'cat-5', name: 'Educação & Livros', color: '#9E6AD3', icon: 'BookOpen' },
  { id: 'cat-6', name: 'Saúde & Farmácia', color: '#1FA3B8', icon: 'HeartPulse' },
  { id: 'cat-7', name: 'Investimento & Reserva', color: '#6BA33A', icon: 'PiggyBank' },
  { id: 'cat-8', name: 'Salário & Entradas', color: '#6CCB7A', icon: 'TrendingUp' },
  { id: 'cat-9', name: 'Outros', color: '#7D8B86', icon: 'Layers' }
];

// Cores da primeira versão, para a migração que troca pela paleta nova.
export const LEGACY_CATEGORY_COLORS = {
  'cat-1': '#f59e0b',
  'cat-2': '#3b82f6',
  'cat-3': '#ec4899',
  'cat-4': '#ef4444',
  'cat-5': '#8b5cf6',
  'cat-6': '#10b981',
  'cat-7': '#06b6d4',
  'cat-8': '#22c55e',
  'cat-9': '#64748b'
};

// Cores antigas de conta/cartão -> equivalente na paleta nova (mesmo tom).
export const LEGACY_ACCOUNT_COLORS = {
  '#eab308': '#BF8418',
  '#a855f7': '#9E6AD3',
  '#820ad1': '#9E6AD3',
  '#f97316': '#EC7000',
  '#ec4899': '#D45A9E',
  '#3b82f6': '#4A82D6',
  '#10b981': '#6CCB7A',
  '#ef4444': '#D9634F',
  '#64748b': '#7D8B86'
};
