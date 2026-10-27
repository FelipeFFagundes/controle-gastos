import React from 'react';
import { Box } from '@mui/material';

// Dica de atalho ao lado de um botão. Só aparece em aparelhos com mouse (no celular não há teclado físico).
export function Kbd({ children, sx }) {
  return (
    <Box
      component="kbd"
      aria-hidden="true"
      sx={{
        display: 'none',
        '@media (hover: hover) and (pointer: fine)': { display: 'inline-flex' },
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        height: 20,
        px: 0.5,
        ml: 1,
        borderRadius: '5px',
        border: '1px solid',
        borderColor: 'currentColor',
        opacity: 0.6,
        fontFamily: 'inherit',
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: 1,
        ...sx
      }}
    >
      {children}
    </Box>
  );
}
