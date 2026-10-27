import { createTheme } from '@mui/material/styles';
import { colors } from './palette';

// Papéis das cores (ver palette.js):
//   primary   -> marca (jade): botões, navegação, foco
//   secondary -> entradas e saldo positivo (verde)
//   error     -> saídas, estouro e ações destrutivas (coral)
//   warning   -> pendências (açafrão)
//   info      -> parcelamentos (lavanda)
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: colors.brand, light: colors.brandLight, dark: colors.brandDark, contrastText: colors.onBrand },
    secondary: { main: colors.income, light: colors.incomeLight, dark: colors.incomeDark, contrastText: colors.onIncome },
    error: { main: colors.expense, light: colors.expenseLight, dark: colors.expenseDark, contrastText: '#2A0A05' },
    warning: { main: colors.pending, light: colors.pendingLight, dark: colors.pendingDark, contrastText: '#2A1C02' },
    info: { main: colors.installment, light: colors.installmentLight, dark: colors.installmentDark, contrastText: '#0D1238' },
    success: { main: colors.income, light: colors.incomeLight, dark: colors.incomeDark, contrastText: colors.onIncome },
    background: { default: colors.bg, paper: colors.surface },
    text: { primary: colors.text, secondary: colors.textMuted },
    divider: colors.border,
    action: { hover: 'rgba(214, 236, 226, 0.05)', selected: 'rgba(52, 195, 162, 0.12)' }
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em'
    },
    subtitle1: {
      fontWeight: 600
    },
    button: {
      textTransform: 'none',
      fontWeight: 600
    },
    // Menor texto do app: 13px (abaixo disso fica ilegível no celular).
    caption: {
      fontSize: '0.8125rem'
    }
  },
  shape: {
    borderRadius: 14
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: colors.bg }
      }
    },
    // Área de toque de pelo menos 44px em qualquer botão, ícone, chip, checkbox ou switch, sem mudar o
    // visual: um ::before invisível se estende além do elemento quando ele é menor que 44px.
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 'min(0px, calc((100% - 44px) / 2))'
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.45)'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.surfaceRaised
        },
        paperFullScreen: {
          borderRadius: 0,
          border: 'none',
          backgroundColor: colors.surface,
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: { backgroundColor: colors.surfaceRaised, border: `1px solid ${colors.border}` }
      }
    },
    // No iPhone, campos com fonte menor que 16px fazem a tela dar zoom ao tocar.
    MuiInputBase: {
      styleOverrides: {
        input: ({ theme }) => ({
          [theme.breakpoints.down('sm')]: { fontSize: 16 }
        })
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600
        }
      }
    }
  }
});
