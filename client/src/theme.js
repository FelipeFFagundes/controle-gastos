import { createTheme } from '@mui/material/styles';
import { palettes } from './palette';

// Fontes empacotadas com o app (funcionam offline). Só o subconjunto latino, que cobre o português.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/jetbrains-mono/latin-500.css';

// Papéis das cores (ver palette.js):
//   primary   -> marca: a ação principal
//   accent    -> a linha que marca a seleção, a marca do app e ícones de destaque (contrastam com o fundo)
//   secondary -> entradas e "pago"
//   error     -> estouro e ações destrutivas (vermelho)
//   warning   -> pendências
//   info      -> parcelamentos
//   control   -> trilhos e bordas de controle
//
// Estilo: cantos retos (4px nos controles, 6px nos cards), cards separados do fundo por um tom e uma
// linha de 1px, sem sombra. Toda seleção (aba, filtro, navegação) é uma linha de 1px na cor de destaque,
// na borda mais próxima, da largura do rótulo.
//
// Tipografia: Inter nos dois temas, a alternativa que Coinbase e Mercury indicam para as fontes deles. No
// escuro (Coinbase), os números grandes vão em JetBrains Mono, no lugar da Coinbase Mono, e o título fica
// em peso 400. No claro (Mercury), números e títulos em Inter 500, perto do peso leve do Mercury (480).
const RADIUS_CONTROL = 4;
const RADIUS_CARD = 6;
const SYSTEM_FALLBACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

const FONTS = {
  dark: {
    text: `"Inter", ${SYSTEM_FALLBACK}`,
    figures: `"JetBrains Mono", "Inter", ${SYSTEM_FALLBACK}`, // taste-skill-ignore: Coinbase usa fonte mono nos valores
    figuresWeight: 500,
    titleWeight: 400
  },
  light: {
    text: `"Inter", ${SYSTEM_FALLBACK}`,
    figures: `"Inter", ${SYSTEM_FALLBACK}`,
    figuresWeight: 500,
    titleWeight: 500
  }
};

export function createAppTheme(mode = 'dark') {
  const c = palettes[mode] || palettes.dark;
  const fonts = FONTS[mode] || FONTS.dark;

  return createTheme({
    palette: {
      mode,
      primary: { main: c.brand, light: c.brandLight, dark: c.brandDark, contrastText: c.onBrand },
      secondary: { main: c.income, light: c.incomeLight, dark: c.incomeDark, contrastText: c.onIncome },
      error: { main: c.expense, light: c.expenseLight, dark: c.expenseDark, contrastText: c.onExpense },
      warning: { main: c.pending, light: c.pendingLight, dark: c.pendingDark, contrastText: c.onPending },
      info: { main: c.installment, light: c.installmentLight, dark: c.installmentDark, contrastText: c.onInstallment },
      success: { main: c.income, light: c.incomeLight, dark: c.incomeDark, contrastText: c.onIncome },
      accent: { main: c.accentInk, contrastText: c.surface },
      control: { main: c.control },
      background: { default: c.bg, paper: c.surface },
      text: { primary: c.text, secondary: c.textMuted },
      divider: c.border,
      action: { hover: c.hover, selected: c.selected }
    },
    typography: {
      fontFamily: fonts.text,
      // Fonte dos números grandes e dos títulos (use com sx={{ fontFamily: 'figures' }} via theme.typography.figures).
      figures: fonts.figures,
      figuresWeight: fonts.figuresWeight,
      // Valores e datas com dígitos de largura fixa: os números se alinham e não "tremem" ao mudar.
      allVariants: {
        fontVariantNumeric: 'tabular-nums'
      },
      // Título da tela: tamanho de app, não de página de marketing.
      h1: {
        fontFamily: fonts.text,
        fontSize: '1.5rem',
        fontWeight: fonts.titleWeight,
        lineHeight: 1.25,
        letterSpacing: '-0.01em'
      },
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
    // Base dos raios numéricos do sx (borderRadius: 2 = 4px).
    shape: {
      borderRadius: 2
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: c.bg, color: c.text }
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
            borderRadius: RADIUS_CONTROL,
            padding: '8px 16px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none'
            }
          },
          outlined: {
            borderColor: c.control
          }
        },
        // Botões de texto/contorno na cor da marca usam a cor de destaque legível (o limão some no branco).
        variants: [
          { props: { variant: 'text', color: 'primary' }, style: { color: c.accentInk } },
          { props: { variant: 'outlined', color: 'primary' }, style: { color: c.accentInk, borderColor: c.accentInk } }
        ]
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS_CONTROL,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: c.accentInk }
          },
          notchedOutline: { borderColor: c.control }
        }
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { '&.Mui-focused': { color: c.accentInk } }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS_CARD,
            backgroundImage: 'none',
            border: `1px solid ${c.border}`,
            boxShadow: 'none'
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
            borderRadius: RADIUS_CARD,
            border: `1px solid ${c.border}`,
            backgroundColor: c.surfaceRaised
          },
          paperFullScreen: {
            borderRadius: 0,
            border: 'none',
            backgroundColor: c.surface,
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)'
          }
        }
      },
      MuiMenu: {
        styleOverrides: {
          paper: { backgroundColor: c.surfaceRaised, border: `1px solid ${c.border}` }
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
            borderRadius: RADIUS_CONTROL,
            fontWeight: 600
          },
          outlined: {
            borderColor: c.control
          }
        }
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: RADIUS_CONTROL }
        }
      },
      // Abas: sobre uma linha de 1px, sem preenchimento; a selecionada fica na cor do texto com a linha de
      // destaque exatamente da largura do rótulo (o espaço entre abas é margem, não padding).
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 44, borderBottom: `1px solid ${c.border}` },
          indicator: { height: 1, backgroundColor: c.accentInk }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minWidth: 0,
            minHeight: 44,
            padding: 0,
            marginRight: 28,
            color: c.textMuted,
            fontWeight: 500,
            '&.Mui-selected': { color: c.text }
          }
        }
      },
      // Barra inferior do celular: a selecionada sobe para a cor do texto e ganha a linha na borda de cima.
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            color: c.textMuted,
            '&.Mui-selected': { color: c.text },
            '&.Mui-selected::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '28%',
              right: '28%',
              height: '1px',
              backgroundColor: c.accentInk
            }
          },
          label: {
            fontSize: '0.75rem',
            '&.Mui-selected': { fontSize: '0.75rem', fontWeight: 600 }
          }
        }
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 0 },
          bar: { borderRadius: 0 }
        }
      }
    }
  });
}
