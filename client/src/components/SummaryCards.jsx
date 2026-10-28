import React, { useState } from 'react';
import {
  Card,
  Typography,
  Box,
  ButtonBase,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { formatAmountInput, formatBRL, formatPercent, formatSignedBRL, parseAmount } from '../format';
import { useBackClose } from '../backStack';

// Fonte dos números grandes (ver theme.js).
const figures = (theme) => theme.typography.figures;

// Renda do mês como uma régua: o trilho tem o tamanho das entradas, o gasto preenche o trilho e o que
// passa das entradas continua depois do fim dele, em vermelho. A meta de sobra é um traço jade no trilho.
function SpendingTrack({ income, expense, target }) {
  const scale = Math.max(income, expense);
  const at = (value) => (scale > 0 ? `${(value / scale) * 100}%` : '0%');
  const over = Math.max(0, expense - income);
  const ratio = income > 0 ? expense / income : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">Renda comprometida</Typography>
        <Typography variant="body2" fontWeight={600} color={ratio > 1 ? 'error.main' : 'text.primary'}>
          {ratio === null ? <Box component="span" sx={{ color: 'text.secondary' }}>—</Box> : formatPercent(ratio)}
        </Typography>
      </Box>

      <Box role="img" aria-label={`Saídas de ${formatBRL(expense)} para entradas de ${formatBRL(income)}`} sx={{ position: 'relative', height: 8 }}>
        <Box sx={{ position: 'absolute', inset: 0, right: 'auto', width: scale > 0 ? at(income) : '100%', bgcolor: 'control.main' }} />
        <Box sx={{ position: 'absolute', inset: 0, right: 'auto', width: at(Math.min(expense, income)), bgcolor: 'text.secondary' }} />
        {over > 0 && (
          <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: at(income), width: at(over), bgcolor: 'error.main' }} />
        )}
        {income > 0 && (
          <Box sx={{ position: 'absolute', top: -4, bottom: -4, left: at(income), width: '1px', bgcolor: 'text.primary' }} />
        )}
        {target > 0 && target < income && (
          <Box sx={{ position: 'absolute', top: -4, bottom: -4, left: at(income - target), width: '1px', bgcolor: 'accent.main' }} />
        )}
      </Box>

      {/* Legenda: cada amostra é a própria marca da régua, em tamanho menor. */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2.5, rowGap: 0.5, mt: 1.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box component="span" sx={{ width: 10, height: 6, bgcolor: 'text.secondary' }} />
          Saídas {formatBRL(expense)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box component="span" sx={{ width: '1px', height: 12, bgcolor: 'text.primary' }} />
          Entradas {formatBRL(income)}
        </Typography>
        {target > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box component="span" sx={{ width: '1px', height: 12, bgcolor: 'accent.main' }} />
            Meta de sobra {formatBRL(target)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// Uma célula da faixa de totais: rótulo em cinza em cima, valor em branco embaixo.
function Stat({ label, value, signed = false }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', px: { xs: 2, sm: 2.5 }, py: 2, minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
      <Typography sx={{ fontFamily: figures, fontSize: { xs: '1.125rem', sm: '1.375rem' }, fontWeight: 600, mt: 0.5, color: value === 0 ? 'text.secondary' : 'text.primary' }} noWrap>
        {signed ? formatSignedBRL(value) : formatBRL(value)}
      </Typography>
    </Box>
  );
}

export function SummaryCards({ summary, onUpdateCustomSurplus }) {
  const [isEditingSurplus, setIsEditingSurplus] = useState(false);
  const [surplusInput, setSurplusInput] = useState('');
  useBackClose(isEditingSurplus, () => setIsEditingSurplus(false));

  if (!summary) return null;

  const {
    totalIncome = 0,
    totalExpense = 0,
    netBalance = 0,
    creditCardExpenses = 0,
    fixedExpenses = 0,
    availableToSpend = 0,
    customSurplusTarget = null
  } = summary;

  // Sem meta definida, o servidor calcula o disponível com meta zero (entradas − saídas).
  const target = customSurplusTarget ?? 0;
  const hasTarget = customSurplusTarget !== null;
  const isOverBudget = availableToSpend < 0;

  const subline = isOverBudget
    ? (hasTarget ? 'Os gastos já passaram da meta de sobra do mês.' : 'Os gastos do mês já passaram das entradas.')
    : (hasTarget ? `Guardando a meta de sobra de ${formatBRL(target)}.` : 'Entradas menos saídas do mês.');

  const openSurplusEditor = () => {
    setSurplusInput(hasTarget ? formatAmountInput(target) : '');
    setIsEditingSurplus(true);
  };

  const saveSurplus = (value) => {
    onUpdateCustomSurplus?.(value);
    setIsEditingSurplus(false);
  };

  const adjustInput = (step) => {
    const current = parseAmount(surplusInput);
    setSurplusInput(formatAmountInput((Number.isFinite(current) ? current : target) + step));
  };

  const parsedSurplus = parseAmount(surplusInput);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* A resposta da tela: quanto ainda dá para gastar, e a régua que mostra por quê. */}
      <Card sx={{ p: { xs: 2, sm: 3 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 2.5, md: 6 }, alignItems: 'start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {isOverBudget ? 'Acima do limite' : 'Disponível para gastar'}
          </Typography>
          <Typography sx={{ fontFamily: figures, fontWeight: 600, fontSize: { xs: '2rem', sm: '2.25rem' }, lineHeight: 1.15, letterSpacing: '-0.01em', mt: 0.5, color: isOverBudget ? 'error.main' : 'text.primary' }}>
            {isOverBudget ? formatSignedBRL(availableToSpend) : formatBRL(availableToSpend)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{subline}</Typography>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <SpendingTrack income={totalIncome} expense={totalExpense} target={target} />

          {/* Meta de sobra: um toque para ajustar */}
          <ButtonBase
            onClick={openSurplusEditor}
            sx={{
              mt: 2,
              width: '100%',
              minHeight: 48,
              pt: 1.5,
              justifyContent: 'space-between',
              borderTop: '1px solid',
              borderColor: 'divider',
              textAlign: 'left'
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" component="div">Meta de sobra</Typography>
              <Typography variant="body2" fontWeight={600} color={hasTarget ? 'text.primary' : 'text.secondary'}>
                {hasTarget ? formatBRL(target) : 'Não definida'}
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center' }}>
              {hasTarget ? 'Ajustar' : 'Definir'} <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </Typography>
          </ButtonBase>
        </Box>
      </Card>

      {/* Totais do mês: um card dividido por linhas de 1px (o fundo aparece no vão entre as células). */}
      <Card
        component="section"
        aria-label="Totais do mês"
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '1px', bgcolor: 'divider', overflow: 'hidden' }}
      >
        <Stat label="Entradas" value={totalIncome} signed />
        <Stat label="Saídas" value={-totalExpense} signed />
        <Stat label="Faturas de cartão" value={creditCardExpenses} />
        <Stat label="Conta e Pix" value={fixedExpenses} />
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
            slotProps={{
              htmlInput: { inputMode: 'decimal' },
              input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> }
            }}
            helperText={`Sobra do mês sem meta: ${formatBRL(netBalance)}`}
            error={surplusInput !== '' && !Number.isFinite(parsedSurplus)}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            {[-500, -100, 100, 500].map(step => (
              <Button key={step} variant="outlined" color="inherit" onClick={() => adjustInput(step)} sx={{ minHeight: 44, px: 0 }}>
                {step > 0 ? `+${step}` : `−${Math.abs(step)}`}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
          {hasTarget && (
            <Button color="inherit" onClick={() => saveSurplus(null)} sx={{ minHeight: 44, mr: 'auto' }}>
              Remover meta
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

// Gastos por cartão/conta: toque abre a lista filtrada.
export function AccountBreakdown({ accounts = [], expensesByAccount = {}, onSelectAccount, onOpenManageAccounts }) {
  return (
    <Card component="section" aria-labelledby="accounts-heading" sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, sm: 2.5 }, minHeight: 48 }}>
        <Typography id="accounts-heading" component="h2" variant="subtitle1">Por cartão e conta</Typography>
        {onOpenManageAccounts && (
          <Button
            size="small"
            color="inherit"
            startIcon={<SettingsOutlinedIcon fontSize="small" />}
            onClick={onOpenManageAccounts}
            sx={{ minHeight: 40, mr: -1, color: 'text.secondary' }}
          >
            Gerenciar
          </Button>
        )}
      </Box>

      {accounts.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 2, sm: 2.5 }, pb: 1.5 }}>
          Nenhum cartão ou conta ainda. Sincronize um banco ou toque em Gerenciar.
        </Typography>
      )}

      {accounts.map(acc => {
        const amount = expensesByAccount[acc.name] || 0;
        return (
          <ButtonBase
            key={acc.id}
            onClick={() => onSelectAccount?.(acc.name)}
            sx={{ width: '100%', minHeight: 56, px: { xs: 2, sm: 2.5 }, gap: 1.5, justifyContent: 'flex-start', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: acc.color || 'text.secondary', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <Typography variant="body2" fontWeight={600} noWrap>{acc.name}</Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                {acc.type === 'credit_card' ? 'Fatura do cartão' : acc.type === 'cash' ? 'Dinheiro' : 'Conta e Pix'}
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={600} color={amount > 0 ? 'text.primary' : 'text.secondary'} sx={{ whiteSpace: 'nowrap' }}>
              {formatBRL(amount)}
            </Typography>
            <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary', mr: -0.5 }} />
          </ButtonBase>
        );
      })}
    </Card>
  );
}
