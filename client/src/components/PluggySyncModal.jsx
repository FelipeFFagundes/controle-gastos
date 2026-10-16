import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Box,
  IconButton,
  Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export function PluggySyncModal({ isOpen, onClose, onSyncSuccess, currentMonth = '2026-10' }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const savedId = localStorage.getItem('pluggy_client_id') || '';
    const savedSecret = localStorage.getItem('pluggy_client_secret') || '';
    setClientId(savedId);
    setClientSecret(savedSecret);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSync = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    if (clientId) localStorage.setItem('pluggy_client_id', clientId);
    if (clientSecret) localStorage.setItem('pluggy_client_secret', clientSecret);

    try {
      const res = await fetch('/api/pluggy/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          month: currentMonth
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao sincronizar com a Pluggy');
      }

      setResult(data);
      if (onSyncSuccess) {
        onSyncSuccess(data);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Falha na conexão com a Pluggy.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SyncIcon color="secondary" />
          <Typography variant="h6" fontWeight={700}>
            Sincronizar Bancos
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSync}>
        <DialogContent dividers sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
            Você pode usar o portal <strong>Meu Pluggy</strong> gratuitamente para conectar até 5 contas reais (Itaú, Nubank, XP).{' '}
            <Link href="https://meu.pluggy.ai" target="_blank" rel="noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
              meu.pluggy.ai <OpenInNewIcon sx={{ fontSize: 12 }} />
            </Link>
          </Alert>

          {error && <Alert severity="error">{error}</Alert>}
          {result && <Alert severity="success">{result.message}</Alert>}

          <TextField
            label="Pluggy Client ID"
            fullWidth
            size="small"
            required
            placeholder="Ex.: 34a2e58c-..."
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />

          <TextField
            label="Pluggy Client Secret"
            type="password"
            fullWidth
            size="small"
            required
            placeholder="Ex.: 9f12d8a1-..."
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
          />

          <Typography variant="caption" color="text.secondary">
            Suas credenciais são transmitidas com segurança para a API oficial da Pluggy e salvas apenas localmente no seu dispositivo.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Fechar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
          >
            {loading ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
