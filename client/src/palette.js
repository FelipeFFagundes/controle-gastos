// Paletas do app, uma por tema (ver theme.js). Pouca cor na tela: a cor de destaque marca a seleção (uma
// linha de 1px) e a ação principal; números ficam em tinta e levam o sinal no texto (+ / −); o vermelho
// fica para o que estourou.
//
// Escuro (padrão): cores do Coinbase (design/coinbase.DESIGN.md): fundo quase preto neutro, cards um tom
// acima e o azul Coinbase como única cor da marca. O azul puro (#0052FF) tem pouco contraste para texto e
// linhas finas sobre o fundo escuro, então a seleção e os ícones de destaque usam um azul mais claro
// (accentInk). Verde e vermelho seguem o "sobe / desce" do Coinbase, clareados para o fundo escuro.
// Claro: cores do Mercury (design/mercury.DESIGN.md): fundo branco-lavanda, cards brancos, tinta
// violeta-escura e o índigo do Mercury na ação principal e na seleção.

export const palettes = {
  dark: {
    bg: '#0A0B0D',
    surface: '#16181C',
    surfaceRaised: '#1E2025',
    // Linhas sólidas (não transparentes): borda de card e borda de controle.
    border: '#2A2D33',
    control: '#41454D',
    text: '#FFFFFF',
    textMuted: '#A8ACB3',

    brand: '#0052FF',
    brandLight: '#3773F5',
    brandDark: '#003ECC',
    onBrand: '#FFFFFF',
    accentInk: '#578BFA',

    income: '#05B169',
    incomeLight: '#3DCF8E',
    incomeDark: '#048A52',
    onIncome: '#0A0B0D',

    expense: '#F0616D',
    expenseLight: '#F58A93',
    expenseDark: '#CF202F',
    onExpense: '#0A0B0D',

    pending: '#F4B000',
    pendingLight: '#F7C846',
    pendingDark: '#C98F00',
    onPending: '#0A0B0D',

    installment: '#A98BF5',
    installmentLight: '#C3AEF8',
    installmentDark: '#8A68E8',
    onInstallment: '#0A0B0D',

    neutral: '#7C828A',
    hover: 'rgba(255, 255, 255, 0.04)',
    selected: 'rgba(255, 255, 255, 0.07)'
  },

  light: {
    bg: '#F4F4F9',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    border: '#E3E3EC',
    control: '#C3C3CC',
    text: '#28253B',
    textMuted: '#554E7B',

    brand: '#5266EB',
    brandLight: '#9CB4E8',
    brandDark: '#3A4DD4',
    onBrand: '#FFFFFF',
    accentInk: '#5266EB',

    // O Mercury não define verde nem vermelho; estes passam de 4,5:1 sobre o branco.
    income: '#18794A',
    incomeLight: '#2EA56A',
    incomeDark: '#0F5C37',
    onIncome: '#FFFFFF',

    expense: '#D03238',
    expenseLight: '#E25A5F',
    expenseDark: '#A72027',
    onExpense: '#FFFFFF',

    pending: '#B86700',
    pendingLight: '#F4B000',
    pendingDark: '#8A4D00',
    onPending: '#FFFFFF',

    installment: '#0E7FA8',
    installmentLight: '#38C8FF',
    installmentDark: '#0A5F7E',
    onInstallment: '#FFFFFF',

    neutral: '#70707D',
    hover: 'rgba(40, 37, 59, 0.04)',
    selected: 'rgba(40, 37, 59, 0.06)'
  }
};

// Usado pelas telas que ficam fora do tema (ErrorBoundary): sempre o escuro.
export const colors = palettes.dark;
