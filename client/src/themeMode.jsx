import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme } from './theme';
import { palettes } from './palette';

// Tema escolhido no menu (escuro ou claro), guardado no aparelho. O index.html lê a mesma chave antes
// do React carregar, para a primeira pintura já sair na cor certa.
const STORAGE_KEY = 'theme-mode';
const ThemeModeContext = createContext({ mode: 'dark', toggleMode: () => {} });

function readStoredMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(readStoredMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palettes[mode].bg);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Sem armazenamento (aba anônima): o tema vale só nesta sessão.
    }
  }, [mode]);

  const value = useMemo(() => ({ mode, toggleMode: () => setMode(m => (m === 'dark' ? 'light' : 'dark')) }), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeModeContext);
