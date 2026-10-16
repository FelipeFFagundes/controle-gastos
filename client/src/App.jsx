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
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
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
import { AccountManagementModal } from './components/AccountManagementModal';
import { getLocalDb, saveLocalDb, computeMonthData, computeInstallments } from './storage';
import { defaultInitialData } from './initialData';

export default function App() {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [currentMonth, setCurrentMonth] = useState('2026-10');
  const [availableMonths, setAvailableMonths] = useState(['2026-10']);
  
  // Carrega instantaneamente do storage local (0ms, sem depender de rede)
  const initialLocalDb = getLocalDb();
  const initialMonthData = computeMonthData(initialLocalDb, '2026-10');
  const initialInstallments = computeInstallments(initialLocalDb, '2026-10');

  const [data, setData] = useState(initialMonthData);
  const [installments, setInstallments] = useState(initialInstallments);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: dashboard, 1: installments
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('');

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPluggyModalOpen, setIsPluggyModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Snackbar / Feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Carrega meses disponíveis
  const fetchMonths = async () => {
    try {
      const res = await fetch('/api/months');
      if (res.ok) {
        const json = await res.json();
        if (json.months && json.months.length > 0) {
          setAvailableMonths(json.months);
          return;
        }
      }
    } catch (err) {
      // Ignora erro silenciosamente para usar local
    }
    // Fallback local
    const db = getLocalDb();
    const monthsSet = new Set((db.transactions || []).map(t => t.month));
    monthsSet.add('2026-10');
    setAvailableMonths(Array.from(monthsSet).sort());
  };

  // Carrega dados do mês (híbrido: local imediato + sincronização com API)
  const fetchData = async (month) => {
    const targetMonth = month || currentMonth;
    // 1. Atualiza imediatamente a partir do banco local
    const db = getLocalDb();
    setData(computeMonthData(db, targetMonth));
    setInstallments(computeInstallments(db, targetMonth));

    // 2. Tenta sincronizar com o backend
    try {
      const [resData, resInst] = await Promise.all([
        fetch(`/api/data?month=${targetMonth}`),
        fetch(`/api/installments?month=${targetMonth}`)
      ]);

      if (resData.ok && resInst.ok) {
        const jsonData = await resData.json();
        const jsonInst = await resInst.json();

        // Se o servidor retornou dados válidos
        if (jsonData.transactions) {
          setData(jsonData);
          setInstallments(jsonInst.installments || []);
          // Atualiza o banco local com todos os dados mais recentes do servidor
          if (jsonData.allTransactions) {
            db.transactions = jsonData.allTransactions;
          }
          if (jsonData.accounts) {
            db.accounts = jsonData.accounts;
          }
          if (jsonData.categories) {
            db.categories = jsonData.categories;
          }
          if (jsonData.customSurplusTarget !== undefined) {
            if (!db.customSurplus) db.customSurplus = {};
            if (jsonData.customSurplusTarget !== null) {
              db.customSurplus[targetMonth] = jsonData.customSurplusTarget;
            } else {
              delete db.customSurplus[targetMonth];
            }
          }
          saveLocalDb(db);
        }
      }
    } catch (err) {
      console.log('Operando em modo local:', err);
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

  // Helper para adicionar meses (YYYY-MM)
  const addMonths = (monthStr, count) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1 + count, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  // Salvar transação (local imediato + API em paralelo)
  const handleSaveTransaction = async (formData) => {
    const db = getLocalDb();

    if (editingTransaction) {
      const idx = db.transactions.findIndex(t => t.id === editingTransaction.id);
      if (idx !== -1) {
        db.transactions[idx] = {
          ...db.transactions[idx],
          ...formData,
          month: formData.date ? formData.date.substring(0, 7) : db.transactions[idx].month
        };
      }
      showToast('Lançamento atualizado!');
      // Background API sync
      fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      }).catch(() => {});
    } else {
      const {
        description,
        amount,
        type,
        category,
        account,
        date,
        paid = false,
        isInstallment = false,
        currentInstallment = 1,
        totalInstallments = 1,
        generateFutureMonths = true
      } = formData;

      const baseDate = new Date(date);
      const baseMonth = date.substring(0, 7);
      const numAmount = Number(amount);

      if (isInstallment && totalInstallments > 1 && generateFutureMonths) {
        const startNum = Number(currentInstallment);
        const totalNum = Number(totalInstallments);

        for (let i = startNum; i <= totalNum; i++) {
          const monthOffset = i - startNum;
          const targetMonth = addMonths(baseMonth, monthOffset);
          const targetDate = new Date(baseDate);
          targetDate.setMonth(targetDate.getMonth() + monthOffset);
          const formattedDate = targetDate.toISOString().split('T')[0];

          db.transactions.push({
            id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            description: description.trim(),
            amount: numAmount,
            type: type || 'expense',
            category,
            account,
            date: formattedDate,
            month: targetMonth,
            paid: i === startNum ? Boolean(paid) : false,
            installment: {
              current: i,
              total: totalNum
            }
          });
        }
      } else {
        db.transactions.push({
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          description: description.trim(),
          amount: numAmount,
          type: type || 'expense',
          category,
          account,
          date,
          month: baseMonth,
          paid: Boolean(paid),
          installment: isInstallment && totalInstallments > 1 ? {
            current: Number(currentInstallment),
            total: Number(totalInstallments)
          } : null
        });
      }

      showToast('Nova compra registrada!');
      // Background API sync
      fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      }).catch(() => {});
    }

    saveLocalDb(db);
    setIsModalOpen(false);
    setEditingTransaction(null);
    fetchMonths();
    fetchData(currentMonth);
  };

  // Alternar status pago/pendente (local imediato + API em paralelo)
  const handleTogglePaid = (id) => {
    const db = getLocalDb();
    const tx = db.transactions.find(t => t.id === id);
    if (tx) {
      tx.paid = !tx.paid;
      saveLocalDb(db);
      fetchData(currentMonth);
      fetch(`/api/transactions/${id}/toggle-paid`, { method: 'PATCH' }).catch(() => {});
    }
  };

  // Deletar transação (local imediato + API em paralelo)
  const handleDeleteTransaction = (id) => {
    if (!window.confirm('Tem certeza que deseja remover este lançamento?')) return;
    const db = getLocalDb();
    db.transactions = db.transactions.filter(t => t.id !== id);
    saveLocalDb(db);
    showToast('Lançamento removido.');
    fetchData(currentMonth);
    fetch(`/api/transactions/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // Limpar todas as transações para começar do zero com a Pluggy
  const handleClearAllTransactions = async () => {
    if (!window.confirm('Deseja limpar todos os lançamentos para começar do zero com os dados bancários reais da Pluggy? Categorias e contas serão preservadas.')) return;
    const db = getLocalDb();
    db.transactions = [];
    saveLocalDb(db);
    showToast('Lançamentos limpos! Pronto para sincronizar da Pluggy.');
    fetchMonths();
    fetchData(currentMonth);
    fetch('/api/clear', { method: 'POST' }).catch(() => {});
  };

  // Atualizar meta de sobra prevista (aumentar/diminuir ou definir valor manual)
  const handleUpdateCustomSurplus = async (targetVal) => {
    const db = getLocalDb();
    if (!db.customSurplus) db.customSurplus = {};
    if (targetVal === null || targetVal === undefined) {
      delete db.customSurplus[currentMonth];
      showToast('Sobra prevista resetada para o cálculo padrão.');
    } else {
      db.customSurplus[currentMonth] = Number(targetVal);
      showToast(`Meta de sobra ajustada para R$ ${Number(targetVal).toFixed(2)}`);
    }
    saveLocalDb(db);
    fetchData(currentMonth);

    // Salva no backend
    fetch('/api/custom-surplus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth, target: targetVal })
    }).catch(() => {});
  };

  // Salvar conta/cartão (novo ou editado)
  const handleSaveAccount = async (accData) => {
    const db = getLocalDb();
    if (!db.accounts) db.accounts = [];

    if (accData.id) {
      // Edição
      const idx = db.accounts.findIndex(a => a.id === accData.id);
      if (idx !== -1) {
        const oldName = db.accounts[idx].name;
        db.accounts[idx] = { ...db.accounts[idx], ...accData };
        // Atualiza transações que usavam o nome anterior
        if (oldName !== accData.name) {
          db.transactions.forEach(t => {
            if (t.account === oldName) t.account = accData.name;
          });
        }
        showToast(`Cartão/Conta "${accData.name}" atualizado!`);
      }
      fetch(`/api/accounts/${accData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accData)
      }).catch(() => {});
    } else {
      // Criação
      const newAcc = {
        id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: accData.name,
        type: accData.type || 'credit_card',
        color: accData.color || '#3b82f6'
      };
      db.accounts.push(newAcc);
      showToast(`Cartão/Conta "${accData.name}" adicionado!`);
      fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAcc)
      }).catch(() => {});
    }

    saveLocalDb(db);
    fetchData(currentMonth);
  };

  // Excluir conta/cartão
  const handleDeleteAccount = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja remover o cartão/conta "${name}"?`)) return;
    const db = getLocalDb();
    db.accounts = (db.accounts || []).filter(a => a.id !== id);
    saveLocalDb(db);
    showToast(`Conta/Cartão "${name}" removido.`);
    fetchData(currentMonth);
    fetch(`/api/accounts/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // Restaurar dados originais da planilha
  const handleResetSeed = () => {
    if (!window.confirm('Restaurar os dados originais da planilha de Outubro 2026?')) return;
    saveLocalDb(defaultInitialData);
    showToast('Dados restaurados com base na Planilha Controle!');
    setCurrentMonth('2026-10');
    fetchMonths();
    fetchData('2026-10');
    fetch('/api/reset-seed', { method: 'POST' }).catch(() => {});
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
              onUpdateCustomSurplus={handleUpdateCustomSurplus}
              onOpenManageAccounts={() => setIsAccountsModalOpen(true)}
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
        onSyncSuccess={(syncResult) => {
          const msg = syncResult?.message || 'Bancos sincronizados com sucesso!';
          showToast(msg);
          fetchMonths().then(() => {
            fetchData(currentMonth);
          });
        }}
      />

      <AccountManagementModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        accounts={data.accounts || []}
        onSaveAccount={handleSaveAccount}
        onDeleteAccount={handleDeleteAccount}
      />
    </ThemeProvider>
  );
}
