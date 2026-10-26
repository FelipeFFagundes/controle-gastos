import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Box,
  LinearProgress,
  ButtonBase,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';

export function SummaryCards({ 
  summary, 
  accounts = [], 
  selectedAccountFilter = '', 
  onSelectAccountFilter,
  onUpdateCustomSurplus,
  onOpenManageAccounts
}) {
  const {
    totalIncome = 0,
    totalExpense = 0,
    netBalance = 0,
    creditCardExpenses = 0,
    fixedExpenses = 0,
    availableToSpend = 0,
    customSurplusTarget = null,
    expensesByAccount = {}
  } = summary || {};

  const [isEditingSurplus, setIsEditingSurplus] = useState(false);
  const [surplusInput, setSurplusInput] = useState('');

  const displayedSurplus = customSurplusTarget !== null ? customSurplusTarget : netBalance;

  useEffect(() => {
    setSurplusInput(displayedSurplus !== undefined ? String(displayedSurplus) : '');
  }, [displayedSurplus, isEditingSurplus]);

  // Só depois dos hooks: retornar antes deles muda a quantidade de hooks entre renders e quebra o React.
  if (!summary) return null;

  const handleAdjustStep = (step) => {
    const current = customSurplusTarget !== null ? customSurplusTarget : netBalance;
    const nextVal = Math.round((current + step) * 100) / 100;
    if (onUpdateCustomSurplus) {
      onUpdateCustomSurplus(nextVal);
    }
  };

  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Percentual de comprometimento da renda
  const budgetCommittedPercent = totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;
  const isOverBudget = availableToSpend < 0;

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 1. OS 3 PILARES PRIORITÁRIOS (GRID CSS SEM BUG DE MARGEM LATERAL) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
          width: '100%'
        }}
      >
        {/* CARD 1 (DESTAQUE): LIMITE DISPONÍVEL PARA GASTOS */}
        <Card
          sx={{
            p: { xs: 2, sm: 2.5 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1.5px solid',
            borderColor: isOverBudget ? 'error.main' : 'secondary.main',
            bgcolor: isOverBudget ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditCardIcon color={isOverBudget ? 'error' : 'secondary'} fontSize="small" />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  letterSpacing={0.5}
                  sx={{ textTransform: 'uppercase', color: isOverBudget ? 'error.light' : 'secondary.light' }}
                >
                  Disponível para Gastos
                </Typography>
              </Box>
              <Chip
                label={isOverBudget ? 'Estourado' : 'Livre'}
                size="small"
                color={isOverBudget ? 'error' : 'secondary'}
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
              />
            </Box>

            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: isOverBudget ? 'error.main' : 'secondary.main',
                fontSize: { xs: '1.8rem', sm: '2.1rem' }
              }}
            >
              {isOverBudget ? `- ${formatBRL(Math.abs(availableToSpend))}` : formatBRL(availableToSpend)}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
              {isOverBudget
                ? 'Limite excedido para a meta definida!'
                : 'Pode gastar no cartão mantendo a meta de sobra'}
            </Typography>
          </Box>

          {/* Barra de comprometimento de renda compacta */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Renda comprometida
              </Typography>
              <Typography
                variant="caption"
                fontWeight={700}
                color={budgetCommittedPercent > 90 ? 'error.light' : 'secondary.light'}
              >
                {budgetCommittedPercent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={budgetCommittedPercent}
              color={budgetCommittedPercent > 90 ? 'error' : budgetCommittedPercent > 70 ? 'warning' : 'secondary'}
              sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.08)' }}
            />
          </Box>
        </Card>

        {/* CARD 2: META DE SOBRA */}
        <Card
          sx={{
            p: { xs: 2, sm: 2.5 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            bgcolor: 'rgba(59, 130, 246, 0.03)',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SavingsOutlinedIcon color="primary" fontSize="small" />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  letterSpacing={0.5}
                  sx={{ textTransform: 'uppercase', color: 'primary.light' }}
                >
                  Meta de Sobra
                </Typography>
              </Box>
              {customSurplusTarget !== null && (
                <Chip
                  label="Personalizada"
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                />
              )}
            </Box>

            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: displayedSurplus >= 0 ? 'primary.light' : 'error.main',
                fontSize: { xs: '1.8rem', sm: '2.1rem' }
              }}
            >
              {formatBRL(displayedSurplus)}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
              {customSurplusTarget !== null 
                ? 'Meta manual definida para o fim do mês'
                : 'Sobra calculada após quitar todas as despesas'}
            </Typography>
          </Box>

          {/* Ajuste Rápido da Sobra */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 2,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Ajustar meta:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => handleAdjustStep(-100)}
                title="Diminuir R$ 100"
                sx={{ p: 0.5, bgcolor: 'rgba(255, 255, 255, 0.04)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}
              >
                <RemoveIcon sx={{ fontSize: 15 }} />
              </IconButton>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setIsEditingSurplus(true)}
                sx={{ fontSize: '0.72rem', px: 1, py: 0.25, minWidth: 'auto', textTransform: 'none', fontWeight: 600, height: 26 }}
              >
                Definir
              </Button>
              <IconButton
                size="small"
                onClick={() => handleAdjustStep(100)}
                title="Aumentar R$ 100"
                sx={{ p: 0.5, bgcolor: 'rgba(255, 255, 255, 0.04)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}
              >
                <AddIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>
          </Box>
        </Card>

        {/* CARD 3: DESPESAS FIXAS */}
        <Card
          sx={{
            p: { xs: 2, sm: 2.5 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid',
            borderColor: 'rgba(245, 158, 11, 0.3)',
            bgcolor: 'rgba(245, 158, 11, 0.03)',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon color="warning" fontSize="small" />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  letterSpacing={0.5}
                  sx={{ textTransform: 'uppercase', color: 'warning.light' }}
                >
                  Despesas Fixas
                </Typography>
              </Box>
              <Chip
                label="Contas & PIX"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
              />
            </Box>

            <Typography
              variant="h4"
              color="warning.main"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.8rem', sm: '2.1rem' }
              }}
            >
              {formatBRL(fixedExpenses)}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
              Contas pagas diretamente em conta corrente ou PIX
            </Typography>
          </Box>

          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Gastos não vinculados a fatura de cartão
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* 2. FAIXA DE INFORMAÇÕES SECUNDÁRIAS (ORGANIZADAS, SEM POLUIR A TELA) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: 1.5,
          width: '100%'
        }}
      >
        {/* Indicador Secundário 1: Salário / Entradas */}
        <Card sx={{ p: 1.5, px: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', borderColor: 'divider', width: '100%', boxSizing: 'border-box' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Salário & Entradas
            </Typography>
            <TrendingUpIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} color="secondary.main" sx={{ mt: 0.25 }}>
            {formatBRL(totalIncome)}
          </Typography>
        </Card>

        {/* Indicador Secundário 2: Total em Faturas de Cartão */}
        <Card sx={{ p: 1.5, px: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', borderColor: 'divider', width: '100%', boxSizing: 'border-box' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Faturas dos Cartões
            </Typography>
            <CreditCardIcon sx={{ fontSize: 16, color: 'error.light' }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} color="error.light" sx={{ mt: 0.25 }}>
            {formatBRL(creditCardExpenses)}
          </Typography>
        </Card>

        {/* Indicador Secundário 3: Total de Despesas do Mês */}
        <Card sx={{ p: 1.5, px: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', borderColor: 'divider', width: '100%', boxSizing: 'border-box' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Total de Gastos
            </Typography>
            <TrendingDownIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ mt: 0.25 }}>
            {formatBRL(totalExpense)}
          </Typography>
        </Card>

        {/* Indicador Secundário 4: Sobra Real Calculada */}
        <Card sx={{ p: 1.5, px: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', borderColor: 'divider', width: '100%', boxSizing: 'border-box' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Sobra Real Calculada
            </Typography>
            <AccountBalanceWalletIcon sx={{ fontSize: 16, color: 'info.main' }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} color={netBalance >= 0 ? 'info.light' : 'error.main'} sx={{ mt: 0.25 }}>
            {formatBRL(netBalance)}
          </Typography>
        </Card>
      </Box>

      {/* 3. GASTOS POR CONTA / CARTÃO (PREENCHENDO 100% DA LARGURA) */}
      <Card sx={{ width: '100%', p: { xs: 2, sm: 2.5 }, boxSizing: 'border-box' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCardIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, color: 'text.secondary' }}>
              Gastos por Conta / Cartão
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedAccountFilter && (
              <Button size="small" onClick={() => onSelectAccountFilter('')} sx={{ fontSize: '0.75rem', p: 0.25 }}>
                Limpar filtro
              </Button>
            )}
            {onOpenManageAccounts && (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={onOpenManageAccounts}
                startIcon={<EditIcon sx={{ fontSize: 13 }} />}
                sx={{ fontSize: '0.75rem', py: 0.25, px: 1, borderColor: 'divider' }}
              >
                Editar Cartões
              </Button>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
          {accounts.map(acc => {
            const amount = expensesByAccount[acc.name] || 0;
            const isSelected = selectedAccountFilter === acc.name;
            return (
              <ButtonBase
                key={acc.id}
                onClick={() => onSelectAccountFilter(isSelected ? '' : acc.name)}
                sx={{
                  width: '100%',
                  px: { xs: 2, sm: 2.5 },
                  py: 1.25,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                    borderColor: 'primary.dark'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: acc.color || 'primary.main', flexShrink: 0 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {acc.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {acc.type === 'credit_card' ? 'Fatura Cartão de Crédito' : 'Conta Bancária / Débito'}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body1" sx={{ fontWeight: 800, color: amount > 0 ? 'text.primary' : 'text.secondary' }}>
                    {formatBRL(amount)}
                  </Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
      </Card>

      {/* MODAL / DIALOG PARA DEFINIR META DE SOBRA */}
      <Dialog open={isEditingSurplus} onClose={() => setIsEditingSurplus(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={700}>Ajustar Meta de Sobra</Typography>
          <IconButton size="small" onClick={() => setIsEditingSurplus(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Defina quanto você planeja que sobre no fim do mês. O app recalcula automaticamente o seu limite disponível para compras no cartão.
          </Typography>
          <TextField
            label="Meta de Sobra Desejada (R$)"
            fullWidth
            type="number"
            size="small"
            value={surplusInput}
            onChange={(e) => setSurplusInput(e.target.value)}
            placeholder={`Calculado: ${netBalance}`}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {customSurplusTarget !== null && (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                if (onUpdateCustomSurplus) onUpdateCustomSurplus(null);
                setIsEditingSurplus(false);
              }}
            >
              Resetar para Calculado
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => {
              if (onUpdateCustomSurplus) {
                const val = surplusInput === '' ? null : Number(surplusInput);
                onUpdateCustomSurplus(val);
              }
              setIsEditingSurplus(false);
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
