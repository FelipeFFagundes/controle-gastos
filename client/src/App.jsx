import React, { useState, useEffect } from 'react';
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
  Grid,
  useMediaQuery,
  Chip
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import RestoreIcon from '@mui/icons-material/Restore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LayersIcon from '@mui/icons-material/Layers';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';

import { theme } from './theme';
import { SummaryCards } from './components/SummaryCards';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { InstallmentsTracker } from './components/InstallmentsTracker';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { PluggySyncModal } from './components/PluggySyncModal';

export default function App() {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [currentMonth, setCurrentMonth] = useState('2026-10');
  const [availableMonths, setAvailableMonths] = useState(['2026-10']);
  const [data, setData] = useState({
    categories: [],
    accounts: [],
    transactions: [],
    summary: {}
  });
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // 0: dashboard, 1: installments
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('');

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPluggyModalOpen, setIsPluggyModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Snackbar / Feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Carrega meses
  const fetchMonths = async () => {
    try {
      const res = await fetch('/api/months');
      const json = await res.json();
      if (json.months && json.months.length > 0) {
        setAvailableMonths(json.months);
      }
    } catch (err) {
      console.error('Erro ao buscar meses:', err);
    }
  };

  // Carrega dados do mês
  const fetchData = async (month) => {
    setLoading(true);
    try {
      const targetMonth = month || currentMonth;
      const [resData, resInst] = await Promise.all([
        fetch(`/api/data?month=${targetMonth}`),
        fetch(`/api/installments?month=${targetMonth}`)
      ]);

      const jsonData = await resData.json();
      const jsonInst = await resInst.json();

      setData(jsonData);
      setInstallments(jsonInst.installments || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      showToast('Erro ao carregar dados do servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonths();
    fetchData('2026-10');
  }, []);

  // Navegar entre meses
  const changeMonth = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
    fetchData(newMonth);
  };

  const handleSelectMonth = (newMonth) => {
    setCurrentMonth(newMonth);
    fetchData(newMonth);
  };

  const formatMonthTitle = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
  };

  // Salvar transação
  const handleSaveTransaction = async (formData) => {
    try {
      if (editingTransaction) {
        const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Falha ao atualizar');
        showToast('Lançamento atualizado!');
      } else {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Falha ao criar');
        showToast('Nova compra registrada!');
      }

      setIsModalOpen(false);
      setEditingTransaction(null);
      await fetchMonths();
      await fetchData(currentMonth);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar lançamento.', 'error');
    }
  };

  // Alternar status pago/pendente
  const handleTogglePaid = async (id) => {
    try {
      const res = await fetch(`/api/transactions/${id}/toggle-paid`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Falha ao alterar status');
      fetchData(currentMonth);
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  // Deletar transação
  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este lançamento?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
      showToast('Lançamento removido.');
      fetchData(currentMonth);
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir lançamento.', 'error');
    }
  };

  // Restaurar dados originais da planilha
  const handleResetSeed = async () => {
    if (!window.confirm('Restaurar os dados originais da planilha de Outubro 2026?')) return;
    try {
      const res = await fetch('/api/reset-seed', { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao resetar');
      showToast('Dados restaurados com base na Planilha Controle!');
      setCurrentMonth('2026-10');
      await fetchMonths();
      await fetchData('2026-10');
    } catch (err) {
      console.error(err);
      showToast('Erro ao restaurar dados.', 'error');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Snackbar de Notificações */}
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

      {/* Barra de Navegação Superior (AppBar) */}
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar sx={{ justifyContent: 'space-between', gap: 1, px: { xs: 1.5, sm: 3 } }}>
          {/* Logo e Título */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 2.5, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex' }}>
              <AccountBalanceWalletIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} noWrap>
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
          </Box>
        </Toolbar>
      </AppBar>

      {/* Conteúdo Central */}
      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 3 }, pb: { xs: 11, md: 4 }, px: { xs: 1.5, sm: 3 } }}>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
            {/* Cards de Resumo */}
            <SummaryCards
              summary={data.summary}
              accounts={data.accounts}
              selectedAccountFilter={selectedAccountFilter}
              onSelectAccountFilter={setSelectedAccountFilter}
            />

            {/* Listagem de Transações e Barra Lateral */}
            <Grid container spacing={{ xs: 2, md: 3 }} sx={{ width: '100%', m: 0 }}>
              <Grid item xs={12} md={8} sx={{ width: '100%', p: { xs: '0 !important', md: '12px !important' }, mb: { xs: 2, md: 0 } }}>
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
              </Grid>

              {/* Barra Lateral */}
              <Grid item xs={12} md={4} sx={{ width: '100%', p: { xs: '0 !important', md: '12px !important' } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <CategoryBreakdown
                    expensesByCategory={data.summary?.expensesByCategory || {}}
                    categories={data.categories || []}
                    totalExpense={data.summary?.totalExpense || 0}
                  />

                  {/* Card de Dicas */}
                  <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LightbulbOutlinedIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Dica Rápida
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" paragraph sx={{ mb: 0.5 }}>
                      • No celular, clique no círculo para marcar uma despesa como <strong>Paga</strong>.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      • Compras parceladas geram automaticamente as próximas parcelas nos meses seguintes.
                    </Typography>
                  </Paper>
                </Box>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <InstallmentsTracker installments={installments} currentMonth={currentMonth} />
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
        categories={data.categories || []}
        accounts={data.accounts || []}
        currentMonth={currentMonth}
        editTransaction={editingTransaction}
      />

      <PluggySyncModal
        isOpen={isPluggyModalOpen}
        onClose={() => setIsPluggyModalOpen(false)}
        currentMonth={currentMonth}
        onSyncSuccess={() => {
          showToast('Bancos sincronizados com sucesso!');
          fetchMonths();
          fetchData(currentMonth);
        }}
      />
    </ThemeProvider>
  );
}
