import React, { useState } from 'react';
import { useIsMobile } from '../useIsMobile';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Box,
  IconButton,
  Divider,
  Chip,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { keys, usePluggyStatus, usePluggySync } from '../queries';
import { useConfirm } from './ConfirmDialog';

const PERIODS = [
  { value: '24h', label: 'Últimas 24h', desc: 'Apenas hoje' },
  { value: '7d', label: 'Últimos 7 dias', desc: 'Recentes' },
  { value: '30d', label: 'Últimos 30 dias', desc: 'Mês atual' },
  { value: 'all', label: 'Completo', desc: 'Todo o histórico' }
];

export function PluggySyncModal({ isOpen, onClose, onSyncSuccess }) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const status = usePluggyStatus(isOpen);
  const sync = usePluggySync();
  const confirm = useConfirm();
  const [syncPeriod, setSyncPeriod] = useState('7d');
  const [clearBeforeSync, setClearBeforeSync] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const configured = status.data?.configured;
  const items = status.data?.items || [];

  // Abre o widget oficial Pluggy Connect para vincular uma instituição.
  const handleOpenConnectWidget = async () => {
    setWidgetLoading(true);
    setError(null);
    try {
      const { connectToken } = await api.pluggyConnectToken();
      if (typeof window.PluggyConnect === 'undefined') {
        throw new Error('O widget da Pluggy ainda está carregando. Aguarde alguns segundos e tente novamente.');
      }
      new window.PluggyConnect({
        connectToken,
        includeSandbox: true,
        onSuccess: async (itemData) => {
          const itemId = itemData.item?.id;
          if (!itemId) return;
          try {
            await api.pluggyRegisterItem(itemId);
            queryClient.invalidateQueries({ queryKey: keys.pluggy });
            setMessage('Banco conectado! Agora clique em "Sincronizar".');
          } catch (err) {
            setError(err.message);
          }
        },
        onError: () => setError('Ocorreu um erro ao conectar a instituição.'),
        onClose: () => setWidgetLoading(false)
      }).init();
    } catch (err) {
      setError(err.message);
    } finally {
      setWidgetLoading(false);
    }
  };

  const handleSync = async (e) => {
    e.preventDefault();
    if (clearBeforeSync && !(await confirm({
      title: 'Apagar antes de importar?',
      message: 'Todos os lançamentos e cartões/contas serão apagados e importados de novo do banco. Edições feitas no app serão perdidas.',
      confirmLabel: 'Apagar e importar',
      danger: true
    }))) return;
    setError(null);
    setMessage(null);
    sync.mutate(
      { period: syncPeriod, clearExisting: clearBeforeSync },
      {
        onSuccess: (data) => {
          setMessage(data.message);
          setClearBeforeSync(false);
          onSyncSuccess?.(data);
        },
        onError: (err) => setError(err.message)
      }
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
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
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}

          {status.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : !configured ? (
            <Alert severity="warning" sx={{ '& .MuiAlert-message': { fontSize: '0.82rem' } }}>
              Configure <strong>PLUGGY_CLIENT_ID</strong> e <strong>PLUGGY_CLIENT_SECRET</strong> no arquivo <code>.env</code> (local)
              ou nas variáveis de ambiente da Vercel. Por segurança, as credenciais não são mais digitadas no navegador.
            </Alert>
          ) : (
            <>
              <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  1. Conectar banco ou cartão
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                  Abre a janela oficial da Pluggy para vincular Itaú, Nubank, XP etc.
                  {items.length > 0 && ` Conexões salvas: ${items.length}.`}
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  onClick={handleOpenConnectWidget}
                  disabled={widgetLoading}
                  startIcon={widgetLoading ? <CircularProgress size={16} color="inherit" /> : <AccountBalanceIcon />}
                >
                  {widgetLoading ? 'Abrindo Pluggy Connect...' : 'Conectar Banco (Widget)'}
                </Button>
              </Box>

              <Divider sx={{ my: 0.5 }}>
                <Chip label="Sincronização" size="small" />
              </Divider>

              <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  2. Período
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                  Lançamentos já importados são atualizados, não duplicados. Os que você excluiu não voltam.
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1 }}>
                  {PERIODS.map(opt => {
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
                        <Typography variant="caption" sx={{ fontSize: '0.8125rem', opacity: 0.7 }}>
                          {opt.desc}
                        </Typography>
                      </Button>
                    );
                  })}
                </Box>
              </Box>

              <Box sx={{ bgcolor: 'rgba(239, 68, 68, 0.04)', p: 1.5, borderRadius: 2, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={clearBeforeSync}
                      onChange={(e) => setClearBeforeSync(e.target.checked)}
                      color="error"
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600} color={clearBeforeSync ? 'error.light' : 'text.primary'}>
                        Limpar lançamentos e contas antes de importar
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Só apaga depois que os dados do banco forem baixados com sucesso.
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Fechar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            disabled={!configured || sync.isPending}
            startIcon={sync.isPending ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
          >
            {sync.isPending ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
