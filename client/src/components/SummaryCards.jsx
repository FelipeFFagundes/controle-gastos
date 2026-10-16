import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  ButtonBase,
  Button,
  Stack
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export function SummaryCards({ summary, accounts = [], selectedAccountFilter = '', onSelectAccountFilter }) {
  if (!summary) return null;

  const {
    totalIncome = 0,
    totalExpense = 0,
    netBalance = 0,
    totalPaid = 0,
    totalPending = 0,
    expensesByAccount = {}
  } = summary;

  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const paidPercentage = totalExpense > 0 ? Math.round((totalPaid / totalExpense) * 100) : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
      {/* Cards Principais: No Mobile ficam exatamente um em cima do outro (xs=12) de forma compacta e coesa */}
      <Grid container spacing={{ xs: 1.25, sm: 2 }}>
        {/* 1. Receitas */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%', 
              borderColor: 'rgba(16, 185, 129, 0.25)',
              bgcolor: 'rgba(16, 185, 129, 0.03)'
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Receitas do Mês
                </Typography>
                <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.12)', color: 'secondary.main', display: 'flex' }}>
                  <TrendingUpIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h5" color="secondary.main" sx={{ mt: { xs: 1, sm: 1.5 }, fontWeight: 700, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
                {formatBRL(totalIncome)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Salário e entradas registradas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 2. Despesas */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%', 
              borderColor: 'rgba(244, 63, 94, 0.25)',
              bgcolor: 'rgba(244, 63, 94, 0.03)'
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Total de Despesas
                </Typography>
                <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: 'rgba(244, 63, 94, 0.12)', color: 'error.main', display: 'flex' }}>
                  <TrendingDownIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h5" color="error.main" sx={{ mt: { xs: 1, sm: 1.5 }, fontWeight: 700, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
                {formatBRL(totalExpense)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Faturas, compras e fixas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 3. Saldo Líquido */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%', 
              borderColor: netBalance >= 0 ? 'rgba(59, 130, 246, 0.25)' : 'rgba(245, 158, 11, 0.25)',
              bgcolor: netBalance >= 0 ? 'rgba(59, 130, 246, 0.03)' : 'rgba(245, 158, 11, 0.03)'
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Saldo Líquido
                </Typography>
                <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: netBalance >= 0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: netBalance >= 0 ? 'primary.main' : 'warning.main', display: 'flex' }}>
                  <AccountBalanceWalletIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h5" color={netBalance >= 0 ? 'primary.light' : 'warning.main'} sx={{ mt: { xs: 1, sm: 1.5 }, fontWeight: 700, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
                {formatBRL(netBalance)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {netBalance >= 0 ? 'Saldo positivo no mês' : 'Despesas superam receitas'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 4. Status Pago vs Pendente */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Status de Pagamento
                </Typography>
                <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: 'rgba(99, 102, 241, 0.12)', color: 'info.main', display: 'flex' }}>
                  <ScheduleIcon fontSize="small" />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: { xs: 1, sm: 1.5 }, alignItems: 'center' }}>
                <Typography variant="caption" color="secondary.light" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                  <CheckCircleIcon sx={{ fontSize: 13 }} /> Pago: {formatBRL(totalPaid)}
                </Typography>
                <Typography variant="caption" color="warning.light" fontWeight={600}>
                  Pendente: {formatBRL(totalPending)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={paidPercentage}
                color="secondary"
                sx={{ mt: 1.25, height: 6, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.08)' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
                {paidPercentage}% quitado
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cartões / Faturas do Mês com filtro interativo */}
      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCardIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, color: 'text.secondary' }}>
              Gastos por Conta / Cartão
            </Typography>
          </Box>
          {selectedAccountFilter && (
            <Button size="small" onClick={() => onSelectAccountFilter('')} sx={{ fontSize: '0.75rem', p: 0.25 }}>
              Limpar filtro
            </Button>
          )}
        </Box>

        <Grid container spacing={1}>
          {accounts.map(acc => {
            const amount = expensesByAccount[acc.name] || 0;
            const isSelected = selectedAccountFilter === acc.name;
            return (
              <Grid item xs={6} sm={4} md={2} key={acc.id}>
                <ButtonBase
                  onClick={() => onSelectAccountFilter(isSelected ? '' : acc.name)}
                  sx={{
                    width: '100%',
                    p: { xs: 1.25, sm: 1.5 },
                    borderRadius: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    border: '1px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'primary.dark'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Typography variant="caption" fontWeight={600} noWrap sx={{ maxWidth: '80%' }}>
                      {acc.name}
                    </Typography>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: acc.color || 'primary.main' }} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: amount > 0 ? 'text.primary' : 'text.secondary' }}>
                    {formatBRL(amount)}
                  </Typography>
                </ButtonBase>
              </Grid>
            );
          })}
        </Grid>
      </Card>
    </Box>
  );
}
