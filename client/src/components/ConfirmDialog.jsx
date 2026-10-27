import React, { createContext, useCallback, useContext, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useBackClose } from '../backStack';

// Substitui o window.confirm nativo por um diálogo no visual do app.
//   const confirm = useConfirm();
//   if (await confirm({ title, message, confirmLabel, danger: true })) { ... }
const ConfirmContext = createContext(async () => false);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setState({ ...options, resolve });
  }), []);

  const close = (answer) => {
    state?.resolve(answer);
    setState(null);
  };

  useBackClose(Boolean(state), () => close(false));

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={Boolean(state)} onClose={() => close(false)} maxWidth="xs" fullWidth>
        {state && (
          <>
            <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{state.title}</DialogTitle>
            {state.message && (
              <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                  {state.message}
                </Typography>
              </DialogContent>
            )}
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button color="inherit" onClick={() => close(false)} sx={{ minHeight: 44 }}>
                {state.cancelLabel || 'Cancelar'}
              </Button>
              <Button
                variant="contained"
                color={state.danger ? 'error' : 'primary'}
                onClick={() => close(true)}
                sx={{ minHeight: 44 }}
                autoFocus
              >
                {state.confirmLabel || 'Confirmar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
