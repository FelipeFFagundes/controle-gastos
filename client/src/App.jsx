import React, { useEffect, useRef, useState } from 'react';
import {
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
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Snackbar,
  Alert,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Fab,
  Badge,
  CircularProgress,
  Tooltip
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LayersIcon from '@mui/icons-material/Layers';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CreditCardIcon from '@mui/icons-material/CreditCard';

import { SummaryCards } from './components/SummaryCards';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { InstallmentsTracker } from './components/InstallmentsTracker';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { CategoryPicker } from './components/CategoryPicker';
import { PluggySyncModal } from './components/PluggySyncModal';
import { AccountManagementModal } from './components/AccountManagementModal';
import { PinLockScreen } from './components/PinLockScreen';
import { useConfirm } from './components/ConfirmDialog';
import { api, clearToken, setUnauthorizedHandler } from './api';
import { addMonths, currentMonth as getCurrentMonth, formatMonthTitle } from './months';
import { formatBRL } from './format';
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

const UNDO_DELAY_MS = 5000;
const SAFE_BOTTOM = 'env(safe-area-inset-bottom)';

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

// Exclusão com "Desfazer": o lançamento some da tela na hora e só é apagado no servidor
// depois de alguns segundos (ou antes, se o app for para segundo plano).
function useDeferredDelete(deleteNow, onCommitted) {
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const timers = useRef(new Map());

  const forget = (id) => setPendingIds(prev => {
    const next = new Set(prev);
    next.delete(id);
    return next;
  });

  const commit = (id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    onCommitted(id);
    deleteNow(id, () => forget(id));
  };

  const schedule = (id) => {
    setPendingIds(prev => new Set(prev).add(id));
    timers.current.set(id, setTimeout(() => commit(id), UNDO_DELAY_MS));
  };

  const undo = (id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    forget(id);
  };

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') [...timers.current.keys()].forEach(commit);
    };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  });

  return { pendingIds, schedule, undo };
}

export default function App() {
  const auth = useAuthGate();
  const confirm = useConfirm();
  const enabled = auth.state === 'open';

  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth);
  const [activeTab, setActiveTab] = useState('overview');
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPluggyModalOpen, setIsPluggyModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [pickingCategoryFor, setPickingCategoryFor] = useState(null);

  const [toast, setToast] = useState(null); // { message, severity, action }
  const showToast = (message, severity = 'success', action = null) =>
    setToast({ message, severity, action, undoId: action?.undoId, key: Date.now() });
  const showError = (err) => showToast(err?.message || 'Algo deu errado.', 'error');

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

  const deferredDelete = useDeferredDelete(
    (id, done) => deleteTransaction.mutate(id, { onSettled: done, onError: showError }),
    // Depois de apagado no servidor não há mais o que desfazer: fecha o aviso.
    (id) => setToast(t => (t?.undoId === id ? null : t))
  );

  const installments = installmentsQuery.data || [];
  const accounts = accountsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const summary = monthQuery.data?.summary;
  const transactions = (monthQuery.data?.transactions || []).filter(t => !deferredDelete.pendingIds.has(t.id));
  const availableMonths = Array.from(new Set([...(monthsQuery.data || []), currentMonth])).sort();
  const loadError = monthQuery.error || accountsQuery.error;

  const goToTab = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  const openNewTransaction = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const closeTransactionModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleLockApp = () => {
    clearToken();
    auth.lock();
  };

  const recategorizedMessage = (result, category) => {
    const n = result?.recategorized;
    if (!n) return null;
    return n === 1
      ? `${category}: salvo, e mais 1 lançamento da mesma loja foi atualizado.`
      : `${category}: salvo, e mais ${n} lançamentos da mesma loja foram atualizados.`;
  };

  const handleSaveTransaction = (formData) => {
    const id = editingTransaction?.id;
    const categoryChanged = id && formData.category !== editingTransaction.category;
    saveTransaction.mutate({ id, data: formData }, {
      onSuccess: (result) => {
        showToast((categoryChanged && recategorizedMessage(result, formData.category)) || (id ? 'Lançamento atualizado.' : 'Lançamento adicionado.'));
        closeTransactionModal();
      },
      onError: showError
    });
  };

  const handlePickCategory = (tx, category) => {
    setPickingCategoryFor(null);
    if (category === tx.category) return;
    saveTransaction.mutate({ id: tx.id, data: { category } }, {
      onSuccess: (result) => showToast(recategorizedMessage(result, category) || `Categoria alterada para ${category}.`),
      onError: showError
    });
  };

  const handleTogglePaid = (id) => togglePaid.mutate(id, { onError: showError });

  const handleDeleteTransaction = (tx) => {
    closeTransactionModal();
    deferredDelete.schedule(tx.id);
    showToast('Lançamento excluído.', 'info', { label: 'Desfazer', onClick: () => deferredDelete.undo(tx.id), undoId: tx.id });
  };

  const handleClearAllTransactions = async () => {
    setMenuAnchor(null);
    if (!(await confirm({
      title: 'Apagar todos os dados?',
      message: 'Todos os lançamentos e cartões/contas serão apagados. Categorias e metas ficam. Não dá para desfazer.',
      confirmLabel: 'Apagar tudo',
      danger: true
    }))) return;
    resetData.mutate('clear', { onSuccess: () => showToast('Lançamentos e cartões/contas apagados.'), onError: showError });
  };

  const handleResetSeed = async () => {
    setMenuAnchor(null);
    if (!(await confirm({
      title: 'Carregar dados de exemplo?',
      message: 'Todos os dados atuais serão substituídos pelos dados de exemplo de outubro de 2026.',
      confirmLabel: 'Substituir',
      danger: true
    }))) return;
    resetData.mutate('seed', {
      onSuccess: () => {
        setCurrentMonth('2026-10');
        showToast('Dados de exemplo carregados.');
      },
      onError: showError
    });
  };

  const handleUpdateCustomSurplus = (target) => {
    setSurplus.mutate(target, {
      onSuccess: () => showToast(target === null ? 'Meta de sobra voltou ao valor calculado.' : `Meta de sobra: ${formatBRL(target)}`),
      onError: showError
    });
  };

  const handleSaveAccount = ({ id, ...accData }) => {
    saveAccount.mutate({ id, data: accData }, {
      onSuccess: () => showToast(`"${accData.name}" ${id ? 'atualizado' : 'adicionado'}.`),
      onError: showError
    });
  };

  const handleDeleteAccount = async (id, name) => {
    if (!(await confirm({ title: `Remover "${name}"?`, confirmLabel: 'Remover', danger: true }))) return;
    const onSuccess = () => showToast(`"${name}" removido.`);
    deleteAccount.mutate({ id }, {
      onSuccess,
      onError: async (err) => {
        // Conta com lançamentos: o servidor exige confirmação explícita para apagá-los junto.
        if (err.status !== 409) return showError(err);
        if (await confirm({
          title: 'A conta tem lançamentos',
          message: `Excluir "${name}" e os ${err.body.transactionCount} lançamento(s) dela? Não dá para desfazer.`,
          confirmLabel: 'Excluir tudo',
          danger: true
        })) {
          deleteAccount.mutate({ id, withTransactions: true }, { onSuccess, onError: showError });
        }
      }
    });
  };

  if (auth.state === 'checking' || auth.state === 'offline') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, textAlign: 'center' }}>
        {auth.state === 'checking' ? (
          <CircularProgress />
        ) : (
          <>
            <Typography variant="h6">Sem conexão com o servidor</Typography>
            <Typography variant="body2" color="text.secondary">Verifique sua internet e tente novamente.</Typography>
            <Button variant="contained" onClick={auth.check} sx={{ minHeight: 48 }}>Tentar novamente</Button>
          </>
        )}
      </Box>
    );
  }

  if (auth.state === 'locked') {
    return <PinLockScreen onUnlock={auth.unlock} />;
  }

  const menuItem = (icon, label, onClick, color) => (
    <MenuItem onClick={() => { setMenuAnchor(null); onClick(); }} sx={{ minHeight: 48, color }}>
      <ListItemIcon sx={{ color: color || 'inherit' }}>{icon}</ListItemIcon>
      <ListItemText>{label}</ListItemText>
    </MenuItem>
  );

  return (
    <>
      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        autoHideDuration={toast?.action ? UNDO_DELAY_MS : 3500}
        onClose={(e, reason) => reason !== 'clickaway' && setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        // No celular fica acima da barra inferior e à esquerda do botão +.
        sx={{ bottom: { xs: `calc(80px + ${SAFE_BOTTOM}) !important`, sm: '24px !important' }, right: { xs: '84px !important', sm: 'auto' } }}
      >
        {toast ? (
          <Alert
            severity={toast.severity}
            variant="filled"
            onClose={toast.action ? undefined : () => setToast(null)}
            action={toast.action && (
              <Button color="inherit" size="small" sx={{ fontWeight: 700 }} onClick={() => { toast.action.onClick(); setToast(null); }}>
                {toast.action.label}
              </Button>
            )}
            sx={{ width: '100%', borderRadius: '12px', alignItems: 'center' }}
          >
            {toast.message}
          </Alert>
        ) : <span />}
      </Snackbar>

      {loadError && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          Erro ao carregar dados: {loadError.message}
        </Alert>
      )}

      {/* Cabeçalho */}
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar sx={{ gap: 1, px: { xs: 1, sm: 3 }, minHeight: { xs: 60 } }}>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5, mr: 1 }}>
            <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'primary.main', display: 'flex' }}>
              <AccountBalanceWalletIcon fontSize="small" />
            </Box>
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ display: { sm: 'none', md: 'block' } }}>
              Controle de Gastos
            </Typography>
          </Box>

          {/* Seletor de mês: ocupa o espaço que sobrar, nunca alarga a tela */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: { xs: 'flex-start', md: 'center' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, maxWidth: 340, width: '100%', borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
              <IconButton onClick={() => setCurrentMonth(m => addMonths(m, -1))} aria-label="Mês anterior" sx={{ width: 44, height: 44 }}>
                <ChevronLeftIcon />
              </IconButton>
              <Select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                variant="standard"
                disableUnderline
                IconComponent={() => null}
                sx={{ flex: 1, minWidth: 0, fontWeight: 700, '& .MuiSelect-select': { textAlign: 'center', p: '0 !important' } }}
                renderValue={(m) => <Box component="span" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatMonthTitle(m)}</Box>}
                MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
              >
                {availableMonths.map(m => <MenuItem key={m} value={m} sx={{ minHeight: 44 }}>{formatMonthTitle(m)}</MenuItem>)}
              </Select>
              <IconButton onClick={() => setCurrentMonth(m => addMonths(m, 1))} aria-label="Próximo mês" sx={{ width: 44, height: 44 }}>
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>

          <Tooltip title="Sincronizar bancos">
            <IconButton onClick={() => setIsPluggyModalOpen(true)} aria-label="Sincronizar bancos" sx={{ width: 44, height: 44, display: { md: 'none' } }}>
              <SyncIcon />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" color="secondary" startIcon={<SyncIcon />} onClick={() => setIsPluggyModalOpen(true)} sx={{ display: { xs: 'none', md: 'flex' } }}>
            Sincronizar
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNewTransaction} sx={{ display: { xs: 'none', md: 'flex' } }}>
            Novo lançamento
          </Button>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Mais opções" sx={{ width: 44, height: 44 }}>
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            {menuItem(<CreditCardIcon fontSize="small" />, 'Cartões e contas', () => setIsAccountsModalOpen(true))}
            {menuItem(<SyncIcon fontSize="small" />, 'Sincronizar bancos', () => setIsPluggyModalOpen(true))}
            {auth.pinRequired && menuItem(<LockOutlinedIcon fontSize="small" />, 'Bloquear app', handleLockApp)}
            <Divider />
            {menuItem(<RestoreIcon fontSize="small" />, 'Carregar dados de exemplo', handleResetSeed)}
            {menuItem(<DeleteSweepIcon fontSize="small" />, 'Apagar todos os dados', handleClearAllTransactions, 'error.main')}
          </Menu>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 1.5, sm: 3 },
          px: { xs: 1.5, sm: 3 },
          pb: { xs: `calc(160px + ${SAFE_BOTTOM})`, sm: 4 }
        }}
      >
        {/* Abas no computador/tablet */}
        <Tabs value={activeTab} onChange={(e, tab) => goToTab(tab)} sx={{ display: { xs: 'none', sm: 'flex' }, mb: 3 }}>
          <Tab value="overview" icon={<DashboardIcon fontSize="small" />} iconPosition="start" label="Visão geral" sx={{ minHeight: 48 }} />
          <Tab value="transactions" icon={<ReceiptLongIcon fontSize="small" />} iconPosition="start" label={`Lançamentos (${transactions.length})`} sx={{ minHeight: 48 }} />
          <Tab value="installments" icon={<LayersIcon fontSize="small" />} iconPosition="start" label={`Parcelas (${installments.length})`} sx={{ minHeight: 48 }} />
        </Tabs>

        {activeTab === 'overview' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SummaryCards
              summary={summary}
              accounts={accounts}
              onSelectAccount={(name) => {
                setAccountFilter(name);
                setCategoryFilter('');
                goToTab('transactions');
              }}
              onUpdateCustomSurplus={handleUpdateCustomSurplus}
              onOpenManageAccounts={() => setIsAccountsModalOpen(true)}
            />
            <CategoryBreakdown
              expensesByCategory={summary?.expensesByCategory || {}}
              categories={categories}
              totalExpense={summary?.totalExpense || 0}
              onSelectCategory={(name) => {
                setCategoryFilter(name);
                setAccountFilter('');
                goToTab('transactions');
              }}
            />
          </Box>
        )}

        {activeTab === 'transactions' && (
          <TransactionList
            transactions={transactions}
            categories={categories}
            accountFilter={accountFilter}
            onAccountFilterChange={setAccountFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            onTogglePaid={handleTogglePaid}
            onEdit={(tx) => {
              setEditingTransaction(tx);
              setIsModalOpen(true);
            }}
            onDelete={handleDeleteTransaction}
            onPickCategory={setPickingCategoryFor}
          />
        )}

        {activeTab === 'installments' && (
          <InstallmentsTracker installments={installments} currentMonth={currentMonth} accounts={accounts} />
        )}
      </Container>

      {/* Botão de novo lançamento no celular */}
      <Fab
        color="primary"
        aria-label="Novo lançamento"
        onClick={openNewTransaction}
        sx={{
          display: { md: 'none' },
          position: 'fixed',
          right: 16,
          bottom: { xs: `calc(76px + ${SAFE_BOTTOM})`, sm: 24 },
          zIndex: 30,
          boxShadow: '0 8px 24px rgba(52, 195, 162, 0.35)'
        }}
      >
        <AddIcon />
      </Fab>

      {/* Navegação inferior no celular */}
      <Paper
        elevation={6}
        sx={{
          display: { xs: 'block', sm: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          borderTop: '1px solid',
          borderColor: 'divider',
          pb: SAFE_BOTTOM
        }}
      >
        <BottomNavigation showLabels value={activeTab} onChange={(e, tab) => goToTab(tab)} sx={{ bgcolor: 'transparent', height: 64 }}>
          <BottomNavigationAction value="overview" label="Visão geral" icon={<DashboardIcon />} />
          <BottomNavigationAction value="transactions" label="Lançamentos" icon={<ReceiptLongIcon />} />
          <BottomNavigationAction
            value="installments"
            label="Parcelas"
            icon={<Badge badgeContent={installments.length} color="info" max={99}><LayersIcon /></Badge>}
          />
        </BottomNavigation>
      </Paper>

      {/* Modais */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={closeTransactionModal}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        categories={categories}
        accounts={accounts}
        currentMonth={currentMonth}
        editTransaction={editingTransaction}
        saving={saveTransaction.isPending}
      />

      <CategoryPicker
        transaction={pickingCategoryFor}
        categories={categories}
        onSelect={handlePickCategory}
        onClose={() => setPickingCategoryFor(null)}
      />

      <PluggySyncModal
        isOpen={isPluggyModalOpen}
        onClose={() => setIsPluggyModalOpen(false)}
        onSyncSuccess={(result) => showToast(result?.message || 'Bancos sincronizados!')}
      />

      <AccountManagementModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        accounts={accounts}
        onSaveAccount={handleSaveAccount}
        onDeleteAccount={handleDeleteAccount}
      />
    </>
  );
}
