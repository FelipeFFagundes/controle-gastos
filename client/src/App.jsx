import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  Tooltip
} from '@mui/material';
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
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CreditCardIcon from '@mui/icons-material/CreditCard';

import { AccountBreakdown, SummaryCards } from './components/SummaryCards';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { CategoryPicker } from './components/CategoryPicker';
import { PinLockScreen } from './components/PinLockScreen';
import { InstallmentsSkeleton, ListSkeleton, OverviewSkeleton } from './components/Skeletons';
import { Kbd } from './components/Kbd';
import { useConfirm } from './components/ConfirmDialog';
import { api, clearToken, getToken, setUnauthorizedHandler } from './api';
import { addMonths, currentMonth as getCurrentMonth, formatMonthTitle } from './months';
import { formatBRL } from './format';
import { clearPersistedData } from './queryClient';
import { useBackClose } from './backStack';
import { withViewTransition } from './viewTransition';
import { useShortcuts } from './shortcuts';
import { useThemeMode } from './themeMode.jsx';
import { useHideValues } from './hideValues';
import { loadPluggyConnect } from './pluggyWidget';
import {
  monthQueryOptions,
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
  useSetPaid,
  useSetSurplus
} from './queries';

// Telas e modais usados com menos frequência ficam em arquivos separados, baixados em segundo plano
// depois que a tela principal aparece (ver usePrefetchOnIdle).
const loaders = {
  installments: () => import('./components/InstallmentsTracker'),
  pluggy: () => import('./components/PluggySyncModal'),
  accounts: () => import('./components/AccountManagementModal')
};
const InstallmentsTracker = lazy(() => loaders.installments().then(m => ({ default: m.InstallmentsTracker })));
const PluggySyncModal = lazy(() => loaders.pluggy().then(m => ({ default: m.PluggySyncModal })));
const AccountManagementModal = lazy(() => loaders.accounts().then(m => ({ default: m.AccountManagementModal })));

const UNDO_DELAY_MS = 6000;
const SAFE_BOTTOM = 'env(safe-area-inset-bottom)';
const TAB_ORDER = ['overview', 'transactions', 'installments'];
const SEARCH_INPUT_ID = 'transaction-search';
const TAB_TITLES = { overview: 'Visão geral', transactions: 'Lançamentos', installments: 'Parcelas' };

// Marca do app: três linhas de razão que encurtam, desenhadas no jade.
function BrandMark() {
  return (
    <Box component="svg" viewBox="0 0 20 20" aria-hidden="true" sx={{ width: 20, height: 20, color: 'accent.main', flexShrink: 0 }}>
      <rect x="1" y="3" width="18" height="3" fill="currentColor" />
      <rect x="1" y="9" width="12" height="3" fill="currentColor" />
      <rect x="1" y="15" width="6" height="3" fill="currentColor" />
    </Box>
  );
}

// Estado da autenticação: 'checking' | 'locked' | 'open' | 'offline'.
// Com um token salvo, o app abre na hora com os dados guardados e confere a sessão em segundo plano.
function useAuthGate(onLock) {
  const [state, setState] = useState(() => (getToken() ? 'open' : 'checking'));
  const [pinRequired, setPinRequired] = useState(true);
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  const lock = () => {
    onLockRef.current();
    setState('locked');
  };

  const check = async () => {
    try {
      const status = await api.authStatus();
      setPinRequired(status.pinRequired);
      if (status.authenticated) setState('open');
      else lock();
    } catch {
      // Sem rede: com sessão salva, segue mostrando os dados guardados.
      setState(current => (current === 'open' ? 'open' : 'offline'));
    }
  };

  useEffect(() => {
    setUnauthorizedHandler(lock);
    check();
  }, []);

  return { state, pinRequired, check, unlock: () => setState('open'), lock };
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

// Depois que a tela aparece, aproveita o tempo ocioso para baixar o que provavelmente vem a seguir:
// os meses vizinhos e as telas separadas. Respeita o modo "economia de dados".
function usePrefetchOnIdle(month, ready) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!ready || navigator.connection?.saveData) return undefined;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const handle = idle(() => {
      queryClient.prefetchQuery(monthQueryOptions(addMonths(month, -1)));
      queryClient.prefetchQuery(monthQueryOptions(addMonths(month, 1)));
      Object.values(loaders).forEach(load => load().catch(() => {}));
    });
    return () => cancel(handle);
  }, [month, ready, queryClient]);
}

export default function App() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const themeMode = useThemeMode();
  const hideValues = useHideValues();
  const auth = useAuthGate(() => {
    clearToken();
    clearPersistedData(); // os dados guardados no aparelho saem junto com a sessão
  });
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

  const [toast, setToast] = useState(null); // { message, severity, action, persist }
  const showToast = (message, severity = 'success', action = null, options = {}) =>
    setToast({ message, severity, action, undoId: action?.undoId, persist: options.persist, key: Date.now() });
  const showError = (err) => showToast(err?.message || 'Algo deu errado.', 'error');

  // Dados: o servidor é a fonte única de verdade; o cache guardado aparece enquanto atualiza.
  const monthsQuery = useMonths(enabled);
  const monthQuery = useMonthData(currentMonth, enabled);
  const installmentsQuery = useInstallments(currentMonth, enabled);
  const accountsQuery = useAccounts(enabled);
  const categoriesQuery = useCategories(enabled);

  const saveTransaction = useSaveTransaction(currentMonth);
  const deleteTransaction = useDeleteTransaction();
  const setPaid = useSetPaid(currentMonth);
  const setSurplus = useSetSurplus(currentMonth);
  const saveAccount = useSaveAccount();
  const deleteAccount = useDeleteAccount();
  const resetData = useResetData();

  const deferredDelete = useDeferredDelete(
    (id, done) => deleteTransaction.mutate(id, { onSettled: done, onError: showError }),
    // Depois de apagado no servidor não há mais o que desfazer: fecha o aviso.
    (id) => setToast(t => (t?.undoId === id ? null : t))
  );

  usePrefetchOnIdle(currentMonth, enabled && monthQuery.isSuccess);

  // Novo deploy baixado pelo service worker.
  useEffect(() => {
    const onUpdate = () => showToast('Nova versão do app disponível.', 'info', { label: 'Atualizar', onClick: () => window.location.reload() }, { persist: true });
    window.addEventListener('app-update-available', onUpdate);
    return () => window.removeEventListener('app-update-available', onUpdate);
  }, []);

  const installments = installmentsQuery.data || [];
  const accounts = accountsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const summary = monthQuery.data?.summary;
  const transactions = (monthQuery.data?.transactions || []).filter(t => !deferredDelete.pendingIds.has(t.id));
  const availableMonths = Array.from(new Set([...(monthsQuery.data || []), currentMonth])).sort();
  const loadError = monthQuery.error || accountsQuery.error;
  const offline = loadError?.status === 0;

  // Navegação com transição: a nova aba/mês desliza no sentido do movimento.
  const goToTab = (tab) => {
    if (tab === activeTab) return;
    const direction = TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(activeTab) ? 'forward' : 'back';
    withViewTransition(() => {
      setActiveTab(tab);
      window.scrollTo({ top: 0 });
    }, direction);
  };

  const changeMonth = (delta) => withViewTransition(() => setCurrentMonth(m => addMonths(m, delta)), delta > 0 ? 'forward' : 'back');
  const selectMonth = (month) => withViewTransition(() => setCurrentMonth(month), month > currentMonth ? 'forward' : 'back');
  const prefetchMonth = (delta) => queryClient.prefetchQuery(monthQueryOptions(addMonths(currentMonth, delta)));

  const openNewTransaction = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const closeTransactionModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  // Botão voltar do Android: fecha a camada de cima; fora da Visão geral, volta para ela.
  useBackClose(activeTab !== 'overview', () => goToTab('overview'));
  useBackClose(isModalOpen, closeTransactionModal);
  useBackClose(Boolean(pickingCategoryFor), () => setPickingCategoryFor(null));
  useBackClose(isPluggyModalOpen, () => setIsPluggyModalOpen(false));
  useBackClose(isAccountsModalOpen, () => setIsAccountsModalOpen(false));
  useBackClose(Boolean(menuAnchor), () => setMenuAnchor(null));

  const focusSearch = () => {
    goToTab('transactions');
    setTimeout(() => document.getElementById(SEARCH_INPUT_ID)?.focus(), 350);
  };

  useShortcuts({
    n: openNewTransaction,
    s: () => setIsPluggyModalOpen(true),
    o: hideValues.toggle,
    '/': focusSearch,
    ArrowLeft: () => changeMonth(-1),
    ArrowRight: () => changeMonth(1),
    1: () => goToTab('overview'),
    2: () => goToTab('transactions'),
    3: () => goToTab('installments')
  }, enabled);

  const handleLockApp = () => auth.lock();

  const recategorizedMessage = (result, category) => {
    const n = result?.recategorized;
    if (!n) return null;
    return n === 1
      ? `${category}: salvo, e mais 1 lançamento da mesma loja foi atualizado.`
      : `${category}: salvo, e mais ${n} lançamentos da mesma loja foram atualizados.`;
  };

  // Otimista: o modal fecha e a lista já mostra a mudança; se o servidor recusar, a tela volta e avisa.
  const handleSaveTransaction = (formData) => {
    const id = editingTransaction?.id;
    const categoryChanged = id && formData.category !== editingTransaction.category;
    closeTransactionModal();
    saveTransaction.mutate({ id, data: formData }, {
      onSuccess: (result) => showToast((categoryChanged && recategorizedMessage(result, formData.category)) || (id ? 'Lançamento atualizado.' : 'Lançamento adicionado.')),
      onError: (err) => showError({ message: `Não foi salvo: ${err.message}` })
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

  const handleTogglePaid = (tx) => setPaid.mutate({ id: tx.id, paid: !tx.paid }, { onError: showError });

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

  if (auth.state === 'checking') {
    return (
      <Container maxWidth="lg" sx={{ py: 1.5, px: 1.5 }}>
        <OverviewSkeleton />
      </Container>
    );
  }

  if (auth.state === 'offline') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Sem conexão com o servidor</Typography>
        <Typography variant="body2" color="text.secondary">Verifique sua internet e tente novamente.</Typography>
        <Button variant="contained" onClick={auth.check} sx={{ minHeight: 48 }}>Tentar novamente</Button>
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

  // Sem dados deste mês: esqueleto enquanto carrega; se falhou (ex.: sem conexão e sem cache), avisa.
  const monthUnavailable = !monthQuery.data && monthQuery.isError;
  const showSkeleton = !monthQuery.data && !monthUnavailable;
  const unavailableNotice = monthUnavailable && (
    <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '6px' }}>
      <Typography variant="subtitle1" fontWeight={700}>{formatMonthTitle(currentMonth)} não está salvo no aparelho</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        {offline ? 'Conecte-se à internet para ver este mês.' : monthQuery.error?.message}
      </Typography>
      <Button variant="outlined" onClick={() => monthQuery.refetch()} sx={{ minHeight: 44 }}>Tentar novamente</Button>
    </Box>
  );

  return (
    <>
      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        autoHideDuration={toast?.persist ? null : toast?.action ? UNDO_DELAY_MS : 3500}
        // Um toque qualquer na tela não fecha o aviso (senão o "Desfazer" some antes da hora).
        onClose={(e, reason) => reason !== 'clickaway' && setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        // No celular fica acima da barra inferior e à esquerda do botão +.
        sx={{ bottom: { xs: `calc(80px + ${SAFE_BOTTOM}) !important`, sm: '24px !important' } }}
      >
        {toast ? (
          <Alert
            severity={toast.severity}
            variant="filled"
            onClose={toast.action ? undefined : () => setToast(null)}
            action={toast.action && (
              <Button color="inherit" size="small" sx={{ fontWeight: 700, minHeight: 40 }} onClick={() => { toast.action.onClick(); setToast(null); }}>
                {toast.action.label}
              </Button>
            )}
            sx={{ width: '100%', alignItems: 'center' }}
          >
            {toast.message}
          </Alert>
        ) : <span />}
      </Snackbar>

      {loadError && (
        <Alert severity={offline ? 'warning' : 'error'} sx={{ borderRadius: 0 }}>
          {offline ? 'Sem conexão. Mostrando os dados salvos no aparelho.' : `Erro ao carregar dados: ${loadError.message}`}
        </Alert>
      )}

      {/* Cabeçalho (fica parado durante as transições: ver .app-header no index.css) */}
      <AppBar className="app-header" position="sticky" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar sx={{ gap: 1, px: { xs: 1, sm: 3 }, minHeight: { xs: 60 } }}>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.25, mr: 1 }}>
            <BrandMark />
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ display: { sm: 'none', md: 'block' } }}>
              Controle de Gastos
            </Typography>
          </Box>

          {/* Seletor de mês: ocupa o espaço que sobrar, nunca alarga a tela */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: { xs: 'flex-start', md: 'center' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, maxWidth: 340, width: '100%', borderRadius: '4px', border: '1px solid', borderColor: 'divider' }}>
              <Tooltip title={<>Mês anterior <Kbd>←</Kbd></>}>
                <IconButton
                  onClick={() => changeMonth(-1)}
                  onPointerEnter={() => prefetchMonth(-1)}
                  onFocus={() => prefetchMonth(-1)}
                  aria-label="Mês anterior"
                  sx={{ width: 44, height: 44 }}
                >
                  <ChevronLeftIcon />
                </IconButton>
              </Tooltip>
              <Select
                value={currentMonth}
                onChange={(e) => selectMonth(e.target.value)}
                variant="standard"
                disableUnderline
                IconComponent={() => null}
                sx={{ flex: 1, minWidth: 0, fontWeight: 700, '& .MuiSelect-select': { textAlign: 'center', p: '0 !important' } }}
                renderValue={(m) => <Box component="span" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatMonthTitle(m)}</Box>}
                MenuProps={{ slotProps: { paper: { sx: { maxHeight: 360 } } } }}
              >
                {availableMonths.map(m => <MenuItem key={m} value={m} sx={{ minHeight: 44 }}>{formatMonthTitle(m)}</MenuItem>)}
              </Select>
              <Tooltip title={<>Próximo mês <Kbd>→</Kbd></>}>
                <IconButton
                  onClick={() => changeMonth(1)}
                  onPointerEnter={() => prefetchMonth(1)}
                  onFocus={() => prefetchMonth(1)}
                  aria-label="Próximo mês"
                  sx={{ width: 44, height: 44 }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Tooltip title={<>{hideValues.hidden ? 'Mostrar valores' : 'Ocultar valores'} <Kbd>O</Kbd></>}>
            <IconButton
              onClick={hideValues.toggle}
              aria-label={hideValues.hidden ? 'Mostrar valores' : 'Ocultar valores'}
              aria-pressed={hideValues.hidden}
              sx={{ width: 44, height: 44, color: hideValues.hidden ? 'accent.main' : 'inherit' }}
            >
              {hideValues.hidden ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Sincronizar bancos">
            <IconButton
              onClick={() => setIsPluggyModalOpen(true)}
              onPointerEnter={() => loaders.pluggy()}
              aria-label="Sincronizar bancos"
              sx={{ width: 44, height: 44, display: { md: 'none' } }}
            >
              <SyncIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<SyncIcon />}
            onClick={() => setIsPluggyModalOpen(true)}
            onPointerEnter={() => { loaders.pluggy(); loadPluggyConnect().catch(() => {}); }}
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
            Sincronizar <Kbd>S</Kbd>
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNewTransaction} sx={{ display: { xs: 'none', sm: 'flex' }, flexShrink: 0 }}>
            Novo lançamento <Kbd>N</Kbd>
          </Button>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Mais opções" sx={{ width: 44, height: 44 }}>
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            {menuItem(<CreditCardIcon fontSize="small" />, 'Cartões e contas', () => setIsAccountsModalOpen(true))}
            {menuItem(<SyncIcon fontSize="small" />, 'Sincronizar bancos', () => setIsPluggyModalOpen(true))}
            {auth.pinRequired && menuItem(<LockOutlinedIcon fontSize="small" />, 'Bloquear app', handleLockApp)}
            {themeMode.mode === 'dark'
              ? menuItem(<LightModeOutlinedIcon fontSize="small" />, 'Tema claro', themeMode.toggleMode)
              : menuItem(<DarkModeOutlinedIcon fontSize="small" />, 'Tema escuro', themeMode.toggleMode)}
            <Divider />
            {menuItem(<RestoreIcon fontSize="small" />, 'Carregar dados de exemplo', handleResetSeed)}
            {menuItem(<DeleteSweepIcon fontSize="small" />, 'Apagar todos os dados', handleClearAllTransactions, 'error.main')}
          </Menu>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
          pb: { xs: `calc(96px + ${SAFE_BOTTOM})`, sm: 4 }
        }}
      >
        {/* Abas no computador/tablet */}
        <Tabs value={activeTab} onChange={(e, tab) => goToTab(tab)} sx={{ display: { xs: 'none', sm: 'flex' }, mb: 3 }}>
          <Tab value="overview" label={<span>{TAB_TITLES.overview} <Kbd>1</Kbd></span>} />
          <Tab value="transactions" label={<span>{TAB_TITLES.transactions} <Kbd>2</Kbd></span>} />
          <Tab
            value="installments"
            label={<span>{TAB_TITLES.installments} <Kbd>3</Kbd></span>}
            onPointerEnter={() => loaders.installments()}
          />
        </Tabs>

        <Typography variant="h1" sx={{ mb: 2, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{TAB_TITLES[activeTab]}</Typography>

        {activeTab === 'overview' && (unavailableNotice || (showSkeleton ? <OverviewSkeleton /> : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SummaryCards summary={summary} onUpdateCustomSurplus={handleUpdateCustomSurplus} />
            {/* Cartões e categorias lado a lado no computador, cada um da altura do próprio conteúdo. */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
              <AccountBreakdown
                accounts={accounts}
                expensesByAccount={summary?.expensesByAccount || {}}
                onSelectAccount={(name) => {
                  setAccountFilter(name);
                  setCategoryFilter('');
                  goToTab('transactions');
                }}
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
          </Box>
        )))}

        {activeTab === 'transactions' && (unavailableNotice || (showSkeleton ? <ListSkeleton /> : (
          <TransactionList
            transactions={transactions}
            categories={categories}
            searchInputId={SEARCH_INPUT_ID}
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
        )))}

        {activeTab === 'installments' && (
          <Suspense fallback={<InstallmentsSkeleton />}>
            {installmentsQuery.data ? (
              <InstallmentsTracker installments={installments} currentMonth={currentMonth} accounts={accounts} />
            ) : <InstallmentsSkeleton />}
          </Suspense>
        )}
      </Container>

      {/* Navegação inferior no celular. "Novo" fica na barra, ao alcance do polegar, sem cobrir a lista. */}
      <Paper
        className="app-bottom-nav"
        elevation={0}
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
        <BottomNavigation
          showLabels
          value={activeTab}
          onChange={(e, tab) => (tab === 'new' ? openNewTransaction() : goToTab(tab))}
          sx={{ bgcolor: 'transparent', height: 64 }}
        >
          <BottomNavigationAction value="overview" label="Visão geral" icon={<DashboardIcon />} />
          <BottomNavigationAction value="transactions" label="Lançamentos" icon={<ReceiptLongIcon />} />
          <BottomNavigationAction
            value="installments"
            label="Parcelas"
            icon={<LayersIcon />}
          />
          <BottomNavigationAction
            value="new"
            label="Novo"
            aria-label="Novo lançamento"
            icon={(
              <Box sx={{ width: 40, height: 28, borderRadius: '4px', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AddIcon />
              </Box>
            )}
            sx={{ color: 'text.primary' }}
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
      />

      <CategoryPicker
        transaction={pickingCategoryFor}
        categories={categories}
        onSelect={handlePickCategory}
        onClose={() => setPickingCategoryFor(null)}
      />

      <Suspense fallback={null}>
        {isPluggyModalOpen && (
          <PluggySyncModal
            isOpen={isPluggyModalOpen}
            onClose={() => setIsPluggyModalOpen(false)}
            onSyncSuccess={(result) => showToast(result?.message || 'Bancos sincronizados!')}
          />
        )}
        {isAccountsModalOpen && (
          <AccountManagementModal
            isOpen={isAccountsModalOpen}
            onClose={() => setIsAccountsModalOpen(false)}
            accounts={accounts}
            onSaveAccount={handleSaveAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </Suspense>
    </>
  );
}
