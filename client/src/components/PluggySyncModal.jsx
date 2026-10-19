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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export function PluggySyncModal({ isOpen, onClose, onSyncSuccess, currentMonth = '2026-10' }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [itemId, setItemId] = useState('');
  const [syncPeriod, setSyncPeriod] = useState('7d'); // '24h' | '7d' | '30d' | 'all'
  const [serverConfigured, setServerConfigured] = useState(false);
  const [showManualInputs, setShowManualInputs] = useState(false);
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

    // Verificar se as credenciais já estão configuradas no servidor (.env ou Vercel)
    const checkServerStatus = async () => {
      try {
        const authToken = localStorage.getItem('app_auth_token');
        const headers = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        const res = await fetch('/api/pluggy/status', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.configured) {
            setServerConfigured(true);
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar status da Pluggy:', err);
      }
    };

    if (isOpen) {
      checkServerStatus();
    }
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
    if (!serverConfigured && (!clientId.trim() || !clientSecret.trim())) {
      setError('Preencha seu Client ID e Client Secret antes de conectar um banco.');
      return;
    }

    setWidgetLoading(true);
    setError(null);

    if (clientId.trim()) localStorage.setItem('pluggy_client_id', clientId.trim());
    if (clientSecret.trim()) localStorage.setItem('pluggy_client_secret', clientSecret.trim());

    try {
      const authToken = localStorage.getItem('app_auth_token');
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/pluggy/connect-token', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined
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

    if (clientId.trim()) localStorage.setItem('pluggy_client_id', clientId.trim());
    if (clientSecret.trim()) localStorage.setItem('pluggy_client_secret', clientSecret.trim());
    if (itemId.trim()) localStorage.setItem('pluggy_item_ids', itemId.trim());

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
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined,
          itemIds: itemIdsArray,
          month: currentMonth,
          period: syncPeriod
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

          {/* Status das credenciais do servidor */}
          {serverConfigured ? (
            <Box sx={{ bgcolor: 'rgba(76, 175, 80, 0.08)', p: 1.75, borderRadius: 2, border: '1px solid rgba(76, 175, 80, 0.3)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 22 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} color="success.light">
                      Credenciais ativas no servidor
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Configuradas via variáveis de ambiente (PLUGGY_CLIENT_ID / SECRET).
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  onClick={() => setShowManualInputs(!showManualInputs)}
                  startIcon={<SettingsSuggestIcon sx={{ fontSize: 16 }} />}
                  sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                >
                  {showManualInputs ? 'Ocultar campos' : 'Inserir outras'}
                </Button>
              </Box>

              {showManualInputs && (
                <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' }, mt: 2 }}>
                  <TextField
                    label="Pluggy Client ID (opcional)"
                    fullWidth
                    size="small"
                    placeholder="Ex.: 34a2e58c-..."
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  />
                  <TextField
                    label="Pluggy Client Secret (opcional)"
                    type="password"
                    fullWidth
                    size="small"
                    placeholder="Ex.: 9f12d8a1-..."
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                  />
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Pluggy Client ID"
                fullWidth
                size="small"
                required={!serverConfigured}
                placeholder="Ex.: 34a2e58c-..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />

              <TextField
                label="Pluggy Client Secret"
                type="password"
                fullWidth
                size="small"
                required={!serverConfigured}
                placeholder="Ex.: 9f12d8a1-..."
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </Box>
          )}

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
              disabled={widgetLoading || (!serverConfigured && (!clientId.trim() || !clientSecret.trim()))}
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
              label="Item IDs conectados (opcional se já sincronizado)"
              fullWidth
              size="small"
              placeholder="Ex.: a0922d6f-2007-4169-a181-..., b123..."
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              helperText="Preenchido automaticamente ao conectar pelo widget acima, ou deixe em branco para sincronizar todas as contas já vinculadas."
            />
          </Box>

          {/* Seletor de Período de Sincronização */}
          <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              3. Período de Sincronização
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
              Escolha o intervalo para evitar puxar transações duplicadas ou que você já excluiu:
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1 }}>
              {[
                { value: '24h', label: 'Últimas 24h', desc: 'Apenas hoje' },
                { value: '7d', label: 'Últimos 7 dias', desc: 'Recentes' },
                { value: '30d', label: 'Últimos 30 dias', desc: 'Mês atual' },
                { value: 'all', label: 'Completo', desc: 'Todo o histórico' }
              ].map(opt => {
                const isSelected = syncPeriod === opt.value;
                return (
                  <Button
                    key={opt.value}
                    variant={isSelected ? 'contained' : 'outlined'}
                    color={isSelected ? 'secondary' : 'inherit'}
                    onClick={() => setSyncPeriod(opt.value)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      py: 1,
                      px: 1,
                      borderRadius: 2,
                      borderColor: isSelected ? 'secondary.main' : 'divider',
                      textTransform: 'none'
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.82rem' }}>
                      {opt.label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.68rem', opacity: 0.7 }}>
                      {opt.desc}
                    </Typography>
                  </Button>
                );
              })}
            </Box>
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
            {loading ? 'Puxando Faturas...' : syncPeriod === '24h' ? 'Sincronizar (Últimas 24h)' : syncPeriod === '7d' ? 'Sincronizar (Últimos 7 dias)' : 'Sincronizar Faturas'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
