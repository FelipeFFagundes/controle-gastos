// Paletas do app, uma por tema (ver theme.js). Pouca cor na tela: a cor de destaque marca a seleção (uma
// linha de 1px) e a ação principal; números ficam em tinta e levam o sinal no texto (+ / −); o vermelho
// fica para o que estourou.
//
// Escuro (padrão): cinza neutro, sem tom de cor no fundo (o verde no fundo atrapalhava a leitura), com o
// jade da marca.
// Claro: cores do Wise (DESIGN.md na raiz): fundo sálvia, cards brancos, tinta quase preta e o verde-limão
// como cor da ação principal. O limão não tem contraste para texto ou linhas finas sobre branco, então a
// seleção e os ícones de destaque usam o verde-floresta do Wise (accentInk).

export const palettes = {
  dark: {
    bg: '#111111',
    surface: '#181818',
    surfaceRaised: '#1F1F1F',
    // Linhas sólidas (não transparentes): borda de card e borda de controle.
    border: '#2A2A2A',
    control: '#3D3D3D',
    text: '#F2F2F2',
    textMuted: '#B4B4B4',

    brand: '#34C3A2',
    brandLight: '#67D6BC',
    brandDark: '#1E9C80',
    onBrand: '#04221B',
    accentInk: '#34C3A2',

    // Entradas usam o próprio jade (dois verdes lado a lado pareciam duas coisas diferentes).
    income: '#34C3A2',
    incomeLight: '#67D6BC',
    incomeDark: '#1E9C80',
    onIncome: '#04221B',

    expense: '#EB5A68',
    expenseLight: '#F2808B',
    expenseDark: '#C93F4E',
    onExpense: '#2A0A0E',

    pending: '#EBB54A',
    pendingLight: '#F2CB78',
    pendingDark: '#C9932A',
    onPending: '#2A1C02',

    installment: '#8D9CF2',
    installmentLight: '#AEB9F6',
    installmentDark: '#6C7CE0',
    onInstallment: '#0D1238',

    neutral: '#8A8A8A',
    hover: 'rgba(255, 255, 255, 0.04)',
    selected: 'rgba(255, 255, 255, 0.06)'
  },

  light: {
    bg: '#E8EBE6',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    border: '#D9DED5',
    control: '#B9BFB4',
    text: '#0E0F0C',
    textMuted: '#454745',

    brand: '#9FE870',
    brandLight: '#CDFFAD',
    brandDark: '#86D457',
    onBrand: '#0E0F0C',
    accentInk: '#163300',

    income: '#17803A',
    incomeLight: '#2EAD4B',
    incomeDark: '#054D28',
    onIncome: '#FFFFFF',

    expense: '#D03238',
    expenseLight: '#E25A5F',
    expenseDark: '#A72027',
    onExpense: '#FFFFFF',

    pending: '#B86700',
    pendingLight: '#FFD11A',
    pendingDark: '#8A4D00',
    onPending: '#FFFFFF',

    installment: '#0E7FA8',
    installmentLight: '#38C8FF',
    installmentDark: '#0A5F7E',
    onInstallment: '#FFFFFF',

    neutral: '#6F716D',
    hover: 'rgba(14, 15, 12, 0.04)',
    selected: 'rgba(14, 15, 12, 0.06)'
  }
};

// Usado pelas telas que ficam fora do tema (ErrorBoundary): sempre o escuro.
export const colors = palettes.dark;
