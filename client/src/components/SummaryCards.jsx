import React, { useState } from 'react';
import {
  Card,
  Typography,
  Box,
  LinearProgress,
  ButtonBase,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment
} from '@mui/material';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { formatAmountInput, formatBRL, parseAmount } from '../format';

function Stat({ label, value, color = 'text.primary', hint }) {
  return (
    <Box sx={{ p: 1.75, borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid', borderColor: 'divider', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap component="div">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color, mt: 0.25 }} noWrap>
        {formatBRL(value)}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" noWrap component="div">{hint}</Typography>
      )}
    </Box>
  );
}

export function SummaryCards({
  summary,
  accounts = [],
  onSelectAccount,
  onUpdateCustomSurplus,
  onOpenManageAccounts
}) {
  const [isEditingSurplus, setIsEditingSurplus] = useState(false);
  const [surplusInput, setSurplusInput] = useState('');

  if (!summary) return null;

  const {
    totalIncome = 0,
    totalExpense = 0,
    netBalance = 0,
    creditCardExpenses = 0,
    fixedExpenses = 0,
    availableToSpend = 0,
    customSurplusTarget = null,
    expensesByAccount = {}
  } = summary;

  const surplusTarget = customSurplusTarget !== null ? customSurplusTarget : netBalance;
  const committedPercent = totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;
  const isOverBudget = availableToSpend < 0;
  const accent = isOverBudget ? 'error' : 'primary';

  const openSurplusEditor = () => {
    setSurplusInput(formatAmountInput(surplusTarget));
    setIsEditingSurplus(true);
  };

  const saveSurplus = (value) => {
    onUpdateCustomSurplus?.(value);
    setIsEditingSurplus(false);
  };

  const adjustInput = (step) => {
    const current = parseAmount(surplusInput);
    setSurplusInput(formatAmountInput((Number.isFinite(current) ? current : surplusTarget) + step));
  };

  const parsedSurplus = parseAmount(surplusInput);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 2 }}>
        {/* Card principal: quanto ainda dá para gastar */}
        <Card
          sx={{
            p: { xs: 2.25, sm: 2.75 },
            border: '1.5px solid',
            borderColor: `${accent}.main`,
            bgcolor: isOverBudget ? 'rgba(239, 117, 100, 0.06)' : 'rgba(52, 195, 162, 0.07)'
          }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ color: `${accent}.light` }}>
            {isOverBudget ? 'Acima do limite' : 'Disponível para gastar'}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '2.1rem', sm: '2.4rem' }, color: `${accent}.main`, lineHeight: 1.2, mt: 0.5 }}>
            {isOverBudget ? `- ${formatBRL(Math.abs(availableToSpend))}` : formatBRL(availableToSpend)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {isOverBudget ? 'Os gastos já passaram da meta de sobra do mês.' : 'mantendo a sua meta de sobra'}
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="caption" color="text.secondary">Renda comprometida</Typography>
              <Typography variant="caption" fontWeight={700} color={committedPercent > 90 ? 'error.light' : 'text.primary'}>
                {committedPercent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={committedPercent}
              color={committedPercent > 90 ? 'error' : committedPercent > 70 ? 'warning' : 'secondary'}
              sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255, 255, 255, 0.08)' }}
            />
          </Box>

          {/* Meta de sobra: um toque para ajustar */}
          <ButtonBase
            onClick={openSurplusEditor}
            sx={{
              mt: 2,
              width: '100%',
              minHeight: 52,
              px: 1.5,
              borderRadius: '12px',
              justifyContent: 'space-between',
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <SavingsOutlinedIcon fontSize="small" color="primary" />
              <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" component="div" noWrap>
                  Meta de sobra · {customSurplusTarget !== null ? 'sua' : 'calculada'}
                </Typography>
                <Typography variant="body2" fontWeight={700}>{formatBRL(surplusTarget)}</Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="primary.light" fontWeight={600} sx={{ display: 'flex', alignItems: 'center' }}>
              Ajustar <ChevronRightIcon fontSize="small" />
            </Typography>
          </ButtonBase>
        </Card>

        {/* Resumo compacto */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, alignContent: 'start' }}>
          <Stat label="Entradas" value={totalIncome} color="secondary.main" />
          <Stat label="Saídas" value={totalExpense} color="error.light" />
          <Stat label="Faturas de cartão" value={creditCardExpenses} />
          <Stat label="Conta e Pix" value={fixedExpenses} />
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Stat
              label="Sobra calculada (entradas − saídas)"
              value={netBalance}
              color={netBalance >= 0 ? 'primary.light' : 'error.main'}
            />
          </Box>
        </Box>
      </Box>

      {/* Gastos por cartão/conta: toque abre a lista filtrada */}
      <Card sx={{ p: { xs: 1, sm: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, pt: 0.5, pb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>Por cartão e conta</Typography>
          {onOpenManageAccounts && (
            <Button
              size="small"
              color="inherit"
              startIcon={<SettingsOutlinedIcon fontSize="small" />}
              onClick={onOpenManageAccounts}
              sx={{ minHeight: 40, color: 'text.secondary' }}
            >
              Gerenciar
            </Button>
          )}
        </Box>

        {accounts.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, pb: 1.5 }}>
            Nenhum cartão ou conta ainda. Sincronize um banco ou toque em Gerenciar.
          </Typography>
        )}

        {accounts.map(acc => {
          const amount = expensesByAccount[acc.name] || 0;
          return (
            <ButtonBase
              key={acc.id}
              onClick={() => onSelectAccount?.(acc.name)}
              sx={{ width: '100%', minHeight: 56, px: 1, borderRadius: '10px', gap: 1.5, justifyContent: 'flex-start' }}
            >
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: acc.color || 'primary.main', flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <Typography variant="body1" fontWeight={600} noWrap>{acc.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {acc.type === 'credit_card' ? 'Fatura do cartão' : acc.type === 'cash' ? 'Dinheiro' : 'Conta e Pix'}
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight={700} color={amount > 0 ? 'text.primary' : 'text.secondary'}>
                {formatBRL(amount)}
              </Typography>
              <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </ButtonBase>
          );
        })}
      </Card>

      {/* Ajuste da meta de sobra */}
      <Dialog open={isEditingSurplus} onClose={() => setIsEditingSurplus(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Meta de sobra</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Quanto você quer que sobre no fim do mês. O valor disponível para gastar é recalculado a partir dela.
          </Typography>
          <TextField
            label="Meta"
            fullWidth
            value={surplusInput}
            onChange={(e) => setSurplusInput(e.target.value)}
            inputProps={{ inputMode: 'decimal' }}
            InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
            helperText={`Calculada pelo app: ${formatBRL(netBalance)}`}
            error={surplusInput !== '' && !Number.isFinite(parsedSurplus)}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            {[-500, -100, 100, 500].map(step => (
              <Button key={step} variant="outlined" color="inherit" onClick={() => adjustInput(step)} sx={{ minHeight: 44, borderColor: 'divider', px: 0 }}>
                {step > 0 ? `+${step}` : step}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
          {customSurplusTarget !== null && (
            <Button color="inherit" onClick={() => saveSurplus(null)} sx={{ minHeight: 44, mr: 'auto' }}>
              Usar a calculada
            </Button>
          )}
          <Button color="inherit" onClick={() => setIsEditingSurplus(false)} sx={{ minHeight: 44 }}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!Number.isFinite(parsedSurplus)}
            onClick={() => saveSurplus(Math.round(parsedSurplus * 100) / 100)}
            sx={{ minHeight: 44 }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
