import { useMediaQuery, useTheme } from '@mui/material';

// Celular: telas abaixo de 600px. Usado para abrir diálogos em tela cheia.
export function useIsMobile() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}
