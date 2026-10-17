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
  Link,
  Divider,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export function PluggySyncModal({ isOpen, onClose, onSyncSuccess, currentMonth = '2026-10' }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [itemId, setItemId] = useState('');
  const [loading, setLoading] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const savedId = localStorage.getItem('pluggy_client_id') || '';
    const savedSecret = localStorage.getItem('pluggy_client_secret') || '';
    const savedItems = localStorage.getItem('pluggy_item_ids') || '';
    setClientId(savedId);
    setClientSecret(savedSecret);
    setItemId(savedItems);
  }, [isOpen]);

  if (!isOpen) return null;

  // Salva novos Item IDs na lista local
  const addStoredItemId = (newItemId) => {
    const current = localStorage.getItem('pluggy_item_ids') || '';
    const ids = current.split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.includes(newItemId)) {
      ids.push(newItemId);
    }
    const updated = ids.join(', ');
    localStorage.setItem('pluggy_item_ids', updated);
    setItemId(updated);
  };

  // Abre o widget oficial Pluggy Connect para o usuário conectar o banco (Itaú, Nubank, XP, etc.)
  const handleOpenConnectWidget = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Preencha seu Client ID e Client Secret antes de conectar um banco.');
      return;
    }

    setWidgetLoading(true);
    setError(null);

    localStorage.setItem('pluggy_client_id', clientId.trim());
    localStorage.setItem('pluggy_client_secret', clientSecret.trim());

    try {
      const authToken = localStorage.getItem('app_auth_token');
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/pluggy/connect-token', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar token de conexão da Pluggy');
      }

      if (typeof window.PluggyConnect === 'undefined') {
        throw new Error('O widget da Pluggy está carregando. Aguarde alguns segundos e tente novamente.');
      }

      // Inicializa o widget Pluggy Connect
      const pluggyConnect = new window.PluggyConnect({
        connectToken: data.connectToken,
        includeSandbox: true,
        onSuccess: (itemData) => {
          const connectedItemId = itemData.item?.id;
          if (connectedItemId) {
            addStoredItemId(connectedItemId);
            setResult({ message: `Banco conectado com sucesso! (ID: ${connectedItemId.substring(0, 8)}...). Clique em "Sincronizar Faturas".` });
          }
        },
        onError: (err) => {
          console.error('Erro no widget Pluggy:', err);
          setError('Ocorreu um erro ao conectar a instituição.');
        },
        onClose: () => {
          setWidgetLoading(false);
        }
      });

      pluggyConnect.init();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Falha ao inicializar conexão.');
    } finally {
      setWidgetLoading(false);
    }
  };

  // Sincroniza faturas e transações com a Pluggy
  const handleSync = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    if (clientId) localStorage.setItem('pluggy_client_id', clientId.trim());
    if (clientSecret) localStorage.setItem('pluggy_client_secret', clientSecret.trim());
    if (itemId) localStorage.setItem('pluggy_item_ids', itemId.trim());

    const itemIdsArray = itemId
      ? itemId.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    try {
      const authToken = localStorage.getItem('app_auth_token');
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/pluggy/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          itemIds: itemIdsArray,
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
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SyncIcon color="secondary" />
          <Typography variant="h6" fontWeight={700}>
            Integração Bancária Pluggy
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSync}>
        <DialogContent dividers sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: '0.82rem' } }}>
            Use o portal gratuito <strong>Meu Pluggy</strong> para obter suas credenciais de desenvolvedor.{' '}
            <Link href="https://meu.pluggy.ai" target="_blank" rel="noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
              meu.pluggy.ai <OpenInNewIcon sx={{ fontSize: 12 }} />
            </Link>
          </Alert>

          {error && <Alert severity="error">{error}</Alert>}
          {result && <Alert severity="success">{result.message}</Alert>}

          <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
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
          </Box>

          <Divider sx={{ my: 0.5 }}>
            <Chip label="Conexão de Bancos" size="small" />
          </Divider>

          {/* Botão de Conectar Banco diretamente pelo Widget */}
          <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              1. Conectar Novo Banco ou Cartão
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
              Abre a janela oficial da Pluggy para vincular seu Itaú, Nubank, Santander, XP, etc.
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={handleOpenConnectWidget}
              disabled={widgetLoading || !clientId.trim() || !clientSecret.trim()}
              startIcon={widgetLoading ? <CircularProgress size={16} color="inherit" /> : <AccountBalanceIcon />}
            >
              {widgetLoading ? 'Abrindo Pluggy Connect...' : 'Conectar Banco no App (Widget)'}
            </Button>
          </Box>

          {/* Campo de Conexões Conectadas (Item IDs) */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              2. Conexões Conectadas (Item IDs)
            </Typography>
            <TextField
              label="Item IDs conectados (separados por vírgula)"
              fullWidth
              size="small"
              placeholder="Ex.: a0922d6f-2007-4169-a181-..., b123..."
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              helperText="Preenchido automaticamente ao conectar pelo widget acima, ou copie do painel da Pluggy."
            />
          </Box>
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
            {loading ? 'Puxando Faturas...' : 'Sincronizar Faturas'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
