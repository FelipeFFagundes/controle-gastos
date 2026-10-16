import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  ButtonBase,
  Button
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
    creditCardExpenses = 0,
    fixedExpenses = 0,
    availableToSpend = 0,
    expensesByAccount = {}
  } = summary;

  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Quanto da renda total já foi comprometida pelos gastos
  const budgetCommittedPercent = totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;
  const isOverBudget = netBalance < 0;

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Banner Principal de Controle: Quanto ainda posso gastar no Cartão */}
      <Card
        sx={{
          width: '100%',
          p: { xs: 2, sm: 2.5 },
          background: isOverBudget
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)'
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderColor: isOverBudget ? 'error.main' : 'secondary.main',
          borderWidth: 1.5
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <CreditCardIcon color={isOverBudget ? 'error' : 'secondary'} fontSize="small" />
              <Typography variant="overline" sx={{ letterSpacing: 1, fontWeight: 700, color: isOverBudget ? 'error.light' : 'secondary.light' }}>
                {isOverBudget ? 'ORÇAMENTO ESTOURADO' : 'LIMITE DISPONÍVEL PARA GASTAR NO CARTÃO'}
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: isOverBudget ? 'error.main' : 'secondary.main', fontSize: { xs: '1.8rem', sm: '2.3rem' } }}>
              {isOverBudget ? `- ${formatBRL(Math.abs(netBalance))}` : formatBRL(availableToSpend)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isOverBudget
                ? 'Suas despesas superaram sua renda prevista para o fim do mês!'
                : `Você ainda pode gastar até ${formatBRL(availableToSpend)} e conseguir pagar 100% das suas faturas com seu salário.`}
            </Typography>
          </Box>

          <Box sx={{ width: { xs: '100%', sm: 220 }, bgcolor: 'rgba(0, 0, 0, 0.25)', p: 1.5, borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="caption" color="text.secondary">
                Renda Comprometida:
              </Typography>
              <Typography variant="caption" fontWeight={700} color={budgetCommittedPercent > 90 ? 'error.light' : 'secondary.light'}>
                {budgetCommittedPercent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={budgetCommittedPercent}
              color={budgetCommittedPercent > 90 ? 'error' : budgetCommittedPercent > 70 ? 'warning' : 'secondary'}
              sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255, 255, 255, 0.1)' }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, textAlign: 'right', fontSize: '0.7rem' }}>
              {formatBRL(totalExpense)} de {formatBRL(totalIncome)}
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* Cards de Resumo: Empilhados 100% no mobile */}
      <Box
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 1.5
        }}
      >
        {/* 1. Salário & Entradas Previstas */}
        <Card 
          sx={{ 
            width: '100%',
            borderColor: 'rgba(16, 185, 129, 0.25)',
            bgcolor: 'rgba(16, 185, 129, 0.04)'
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Salário & Entradas
              </Typography>
              <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.15)', color: 'secondary.main', display: 'flex' }}>
                <TrendingUpIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h5" color="secondary.main" sx={{ mt: 1, fontWeight: 700, fontSize: { xs: '1.4rem', sm: '1.5rem' } }}>
              {formatBRL(totalIncome)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Receita que vai entrar até o fim do mês
            </Typography>
          </CardContent>
        </Card>

        {/* 2. Total em Faturas de Cartão */}
        <Card 
          sx={{ 
            width: '100%',
            borderColor: 'rgba(244, 63, 94, 0.25)',
            bgcolor: 'rgba(244, 63, 94, 0.04)'
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Faturas dos Cartões
              </Typography>
              <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: 'rgba(244, 63, 94, 0.15)', color: 'error.main', display: 'flex' }}>
                <CreditCardIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h5" color="error.main" sx={{ mt: 1, fontWeight: 700, fontSize: { xs: '1.4rem', sm: '1.5rem' } }}>
              {formatBRL(creditCardExpenses > 0 ? creditCardExpenses : totalExpense)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gastos acumulados a pagar nas faturas
            </Typography>
          </CardContent>
        </Card>

        {/* 3. Despesas Fixas / Outros */}
        <Card 
          sx={{ 
            width: '100%',
            borderColor: 'rgba(245, 158, 11, 0.25)',
            bgcolor: 'rgba(245, 158, 11, 0.04)'
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Despesas Fixas / PIX
              </Typography>
              <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.15)', color: 'warning.main', display: 'flex' }}>
                <ScheduleIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h5" color="warning.main" sx={{ mt: 1, fontWeight: 700, fontSize: { xs: '1.4rem', sm: '1.5rem' } }}>
              {formatBRL(fixedExpenses)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Contas pagas em conta corrente/PIX
            </Typography>
          </CardContent>
        </Card>

        {/* 4. Sobra Prevista no Fim do Mês */}
        <Card 
          sx={{ 
            width: '100%',
            borderColor: netBalance >= 0 ? 'rgba(59, 130, 246, 0.25)' : 'rgba(239, 68, 68, 0.25)',
            bgcolor: netBalance >= 0 ? 'rgba(59, 130, 246, 0.04)' : 'rgba(239, 68, 68, 0.04)'
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Sobra Prevista
              </Typography>
              <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: netBalance >= 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: netBalance >= 0 ? 'primary.main' : 'error.main', display: 'flex' }}>
                <AccountBalanceWalletIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h5" color={netBalance >= 0 ? 'primary.light' : 'error.main'} sx={{ mt: 1, fontWeight: 700, fontSize: { xs: '1.4rem', sm: '1.5rem' } }}>
              {formatBRL(netBalance)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {netBalance >= 0 ? 'Sobra após pagar todas faturas' : 'Déficit previsto'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Cartões / Faturas do Mês com filtro interativo */}
      <Card sx={{ width: '100%', p: { xs: 1.5, sm: 2 } }}>
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

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
            gap: 1,
            width: '100%'
          }}
        >
          {accounts.map(acc => {
            const amount = expensesByAccount[acc.name] || 0;
            const isSelected = selectedAccountFilter === acc.name;
            return (
              <ButtonBase
                key={acc.id}
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
            );
          })}
        </Box>
      </Card>
    </Box>
  );
}
