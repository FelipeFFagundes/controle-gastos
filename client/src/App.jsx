import React, { useEffect, useState } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  Snackbar,
  Alert,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Fab,
  Chip,
  CircularProgress
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LayersIcon from '@mui/icons-material/Layers';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

import { theme } from './theme';
import { SummaryCards } from './components/SummaryCards';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { InstallmentsTracker } from './components/InstallmentsTracker';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { PluggySyncModal } from './components/PluggySyncModal';
import { AccountManagementModal } from './components/AccountManagementModal';
import { PinLockScreen } from './components/PinLockScreen';
import { api, clearToken, setUnauthorizedHandler } from './api';
import { addMonths, currentMonth as getCurrentMonth, formatMonthTitle } from './months';
import {
  useAccounts,
  useCategories,
  useDeleteAccount,
  useDeleteTransaction,
  useInstallments,
  useMonthData,
  useMonths,
  useResetData,
  useSaveAccount,
  useSaveTransaction,
  useSetSurplus,
  useTogglePaid
} from './queries';

const fmtBRL = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Estado da autenticação: 'checking' | 'locked' | 'open' | 'offline'
function useAuthGate() {
  const [state, setState] = useState('checking');
  const [pinRequired, setPinRequired] = useState(false);

  const check = async () => {
    setState('checking');
    try {
      const status = await api.authStatus();
      setPinRequired(status.pinRequired);
      setState(status.authenticated ? 'open' : 'locked');
    } catch {
      setState('offline');
    }
  };

  useEffect(() => {
    setUnauthorizedHandler(() => setState('locked'));
    check();
  }, []);

  return { state, pinRequired, check, unlock: () => setState('open'), lock: () => setState('locked') };
}

export default function App() {
  const auth = useAuthGate();
  const enabled = auth.state === 'open';
  const isPinRequired = auth.pinRequired;

  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth);
  const [activeTab, setActiveTab] = useState(0); // 0: visão do mês, 1: parcelamentos
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('');

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPluggyModalOpen, setIsPluggyModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showToast = (message, severity = 'success') => setSnackbar({ open: true, message, severity });
  const showError = (err) => showToast(err?.message || 'Algo deu errado.', 'error');
  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  // Dados: o servidor é a fonte única de verdade.
  const monthsQuery = useMonths(enabled);
  const monthQuery = useMonthData(currentMonth, enabled);
  const installmentsQuery = useInstallments(currentMonth, enabled);
  const accountsQuery = useAccounts(enabled);
  const categoriesQuery = useCategories(enabled);

  const saveTransaction = useSaveTransaction();
  const deleteTransaction = useDeleteTransaction();
  const togglePaid = useTogglePaid(currentMonth);
  const setSurplus = useSetSurplus(currentMonth);
  const saveAccount = useSaveAccount();
  const deleteAccount = useDeleteAccount();
  const resetData = useResetData();

  const installments = installmentsQuery.data || [];
  const data = {
    transactions: monthQuery.data?.transactions || [],
    summary: monthQuery.data?.summary,
    accounts: accountsQuery.data || [],
    categories: categoriesQuery.data || []
  };
  const availableMonths = Array.from(new Set([...(monthsQuery.data || []), currentMonth])).sort();
  const loadError = monthQuery.error || accountsQuery.error;

  const handleLockApp = () => {
    clearToken();
    auth.lock();
    showToast('Aplicativo bloqueado com segurança.', 'info');
  };

  const changeMonth = (direction) => setCurrentMonth(m => addMonths(m, direction));
  const handleSelectMonth = (month) => setCurrentMonth(month);

  const handleSaveTransaction = (formData) => {
    const id = editingTransaction?.id;
    saveTransaction.mutate({ id, data: formData }, {
      onSuccess: () => {
        showToast(id ? 'Lançamento atualizado!' : 'Lançamento registrado!');
        setIsModalOpen(false);
        setEditingTransaction(null);
      },
      onError: showError
    });
  };

  const handleTogglePaid = (id) => togglePaid.mutate(id, { onError: showError });

  const handleDeleteTransaction = (id) => {
    if (!window.confirm('Tem certeza que deseja remover este lançamento?')) return;
    deleteTransaction.mutate(id, { onSuccess: () => showToast('Lançamento removido.'), onError: showError });
  };

  const handleClearAllTransactions = () => {
    if (!window.confirm('Apagar TODOS os lançamentos e cartões/contas? Categorias e metas são preservadas. Não dá para desfazer.')) return;
    resetData.mutate('clear', {
      onSuccess: () => showToast('Lançamentos e cartões/contas apagados.'),
      onError: showError
    });
  };

  const handleResetSeed = () => {
    if (!window.confirm('Substituir TODOS os dados atuais pelos dados de exemplo da planilha de Outubro/2026?')) return;
    resetData.mutate('seed', {
      onSuccess: () => {
        setCurrentMonth('2026-10');
        showToast('Dados de exemplo restaurados.');
      },
      onError: showError
    });
  };

  const handleUpdateCustomSurplus = (target) => {
    setSurplus.mutate(target, {
      onSuccess: () => showToast(target === null ? 'Sobra prevista voltou ao cálculo padrão.' : `Meta de sobra ajustada para ${fmtBRL(target)}`),
      onError: showError
    });
  };

  const handleSaveAccount = ({ id, ...accData }) => {
    saveAccount.mutate({ id, data: accData }, {
      onSuccess: () => showToast(`Cartão/Conta "${accData.name}" ${id ? 'atualizado' : 'adicionado'}!`),
      onError: showError
    });
  };

  const handleDeleteAccount = (id, name) => {
    if (!window.confirm(`Remover o cartão/conta "${name}"?`)) return;
    const onSuccess = () => showToast(`Conta/Cartão "${name}" removido.`);
    deleteAccount.mutate({ id }, {
      onSuccess,
      onError: (err) => {
        // Conta com lançamentos: o servidor exige confirmação explícita para apagá-los junto.
        if (err.status !== 409) return showError(err);
        if (window.confirm(`${err.message}\n\nExcluir a conta E os ${err.body.transactionCount} lançamento(s)?`)) {
          deleteAccount.mutate({ id, withTransactions: true }, { onSuccess, onError: showError });
        }
      }
    });
  };

  if (auth.state === 'checking' || auth.state === 'offline') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, textAlign: 'center' }}>
          {auth.state === 'checking' ? (
            <CircularProgress />
          ) : (
            <>
              <Typography variant="h6">Sem conexão com o servidor</Typography>
              <Typography variant="body2" color="text.secondary">Verifique se o servidor está rodando e tente novamente.</Typography>
              <Button variant="contained" onClick={auth.check}>Tentar novamente</Button>
            </>
          )}
        </Box>
      </ThemeProvider>
    );
  }

  if (auth.state === 'locked') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PinLockScreen onUnlock={() => { auth.unlock(); showToast('PIN autenticado com sucesso!'); }} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {loadError && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          Erro ao carregar dados: {loadError.message}
        </Alert>
      )}

      {/* Barra de Navegação Superior (AppBar) */}
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar sx={{ justifyContent: 'space-between', gap: 1, px: { xs: 1.5, sm: 3 } }}>
          {/* Logo e Título */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 2.5, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex' }}>
              <AccountBalanceWalletIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }} noWrap>
                Controle de Gastos
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Finanças Mensais
              </Typography>
            </Box>
          </Box>

          {/* Seletor de Mês */}
          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2.5, p: 0.5, border: '1px solid', borderColor: 'divider' }}>
            <IconButton size="small" onClick={() => changeMonth(-1)}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>

            <FormControl size="small" variant="standard" sx={{ minWidth: { xs: 120, sm: 160 } }}>
              <Select
                value={currentMonth}
                onChange={(e) => handleSelectMonth(e.target.value)}
                disableUnderline
                sx={{
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  fontWeight: 600,
                  textAlign: 'center',
                  '& .MuiSelect-select': { py: 0.5, px: 1 }
                }}
              >
                {availableMonths.map(m => (
                  <MenuItem key={m} value={m}>
                    {formatMonthTitle(m)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <IconButton size="small" onClick={() => changeMonth(1)}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Ações no Desktop */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={handleClearAllTransactions}
              sx={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              Limpar
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<RestoreIcon />}
              onClick={handleResetSeed}
              sx={{ borderColor: 'divider' }}
            >
              Restaurar
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<SyncIcon />}
              onClick={() => setIsPluggyModalOpen(true)}
            >
              Sincronizar Bancos
            </Button>

            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
              }}
            >
              Nova Compra
            </Button>

            {/* Botão de Bloqueio (se PIN configurado) */}
            {isPinRequired && (
              <IconButton
                size="small"
                onClick={handleLockApp}
                title="Bloquear aplicativo"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'rgba(255, 255, 255, 0.02)',
                  '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)', color: 'error.main' }
                }}
              >
                <LockOutlinedIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* Botão de Bloqueio no Mobile */}
          {isPinRequired && (
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
              <IconButton
                size="small"
                onClick={handleLockApp}
                title="Bloquear aplicativo"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'rgba(255, 255, 255, 0.02)'
                }}
              >
                <LockOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Conteúdo Central */}
      <Container maxWidth="xl" sx={{ py: { xs: 1.5, sm: 3 }, pb: { xs: 11, md: 4 }, px: { xs: 1.5, sm: 3, md: 4 }, width: '100%' }}>
        {/* Abas Superiores no Desktop */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab
              icon={<DashboardIcon fontSize="small" />}
              iconPosition="start"
              label={`Visão do Mês (${formatMonthTitle(currentMonth)})`}
              sx={{ minHeight: 48, fontWeight: 600 }}
            />
            <Tab
              icon={<LayersIcon fontSize="small" />}
              iconPosition="start"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Parcelamentos Ativos</span>
                  <Chip label={installments.length} size="small" color="info" sx={{ height: 20, fontWeight: 700 }} />
                </Box>
              }
              sx={{ minHeight: 48, fontWeight: 600 }}
            />
          </Tabs>

          <Typography variant="caption" color="text.secondary">
            {data.transactions?.length || 0} lançamentos
          </Typography>
        </Box>

        {/* Exibição da Aba Atual */}
        {activeTab === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 }, width: '100%' }}>
            {/* Cards de Resumo */}
            <SummaryCards
              summary={data.summary}
              accounts={data.accounts}
              selectedAccountFilter={selectedAccountFilter}
              onSelectAccountFilter={setSelectedAccountFilter}
              onUpdateCustomSurplus={handleUpdateCustomSurplus}
              onOpenManageAccounts={() => setIsAccountsModalOpen(true)}
            />

            {/* Listagem de Transações e Barra Lateral (CSS Grid sem offsets ou margens à esquerda) */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 340px', lg: '1fr 380px' },
                gap: { xs: 2, md: 3 },
                width: '100%',
                alignItems: 'start'
              }}
            >
              <Box sx={{ width: '100%', minWidth: 0 }}>
                <TransactionList
                  transactions={data.transactions || []}
                  accounts={data.accounts || []}
                  categories={data.categories || []}
                  selectedAccountFilter={selectedAccountFilter}
                  onSelectAccountFilter={setSelectedAccountFilter}
                  onTogglePaid={handleTogglePaid}
                  onEdit={(tx) => {
                    setEditingTransaction(tx);
                    setIsModalOpen(true);
                  }}
                  onDelete={handleDeleteTransaction}
                />
              </Box>

              {/* Barra Lateral */}
              <Box sx={{ width: '100%', minWidth: 0 }}>
                <CategoryBreakdown
                  expensesByCategory={data.summary?.expensesByCategory || {}}
                  categories={data.categories || []}
                  totalExpense={data.summary?.totalExpense || 0}
                />
              </Box>
            </Box>
          </Box>
        ) : (
          <InstallmentsTracker installments={installments} currentMonth={currentMonth} accounts={data.accounts} />
        )}
      </Container>

      {/* Botão Flutuante (FAB) para Mobile */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', bottom: 72, right: 16, zIndex: 30 }}>
        <Fab
          color="primary"
          aria-label="adicionar"
          onClick={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }}
          sx={{ boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)' }}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* Barra de Navegação Inferior (BottomNavigation) para Celular */}
      <Paper
        sx={{
          display: { xs: 'block', sm: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
        elevation={6}
      >
        <BottomNavigation
          showLabels
          value={activeTab}
          onChange={(e, val) => {
            if (val === 2) {
              setIsPluggyModalOpen(true);
            } else {
              setActiveTab(val);
            }
          }}
          sx={{ bgcolor: 'transparent', height: 60 }}
        >
          <BottomNavigationAction label="Visão Geral" icon={<DashboardIcon />} />
          <BottomNavigationAction
            label="Parcelas"
            icon={
              <Box sx={{ position: 'relative' }}>
                <LayersIcon />
                {installments.length > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -4,
                      right: -8,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      bgcolor: 'info.main',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {installments.length}
                  </Box>
                )}
              </Box>
            }
          />
          <BottomNavigationAction label="Bancos" icon={<SyncIcon />} />
        </BottomNavigation>
      </Paper>

      {/* Modais */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        categories={data.categories}
        accounts={data.accounts}
        currentMonth={currentMonth}
        editTransaction={editingTransaction}
      />

      <PluggySyncModal
        isOpen={isPluggyModalOpen}
        onClose={() => setIsPluggyModalOpen(false)}
        onSyncSuccess={(result) => showToast(result?.message || 'Bancos sincronizados!')}
      />

      <AccountManagementModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        accounts={data.accounts}
        onSaveAccount={handleSaveAccount}
        onDeleteAccount={handleDeleteAccount}
      />
    </ThemeProvider>
  );
}
