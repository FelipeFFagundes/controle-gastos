import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { addMonths, formatMonthTitle } from '../months';
import { formatAmountInput, parseAmount } from '../format';

// Hoje, se o mês exibido for o atual; senão, dia 15 do mês exibido.
function defaultDate(month) {
  const today = new Date();
  const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  return month === todayMonth ? `${todayMonth}-${String(today.getDate()).padStart(2, '0')}` : `${month}-15`;
}

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Gasto', color: 'error' },
  { value: 'income', label: 'Entrada', color: 'secondary' },
  { value: 'transfer', label: 'Transferência', color: 'info' }
];

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  categories = [],
  accounts = [],
  currentMonth,
  editTransaction = null,
  saving = false
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState('');
  const [month, setMonth] = useState('');
  const [paid, setPaid] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [currentInstallment, setCurrentInstallment] = useState('1');
  const [totalInstallments, setTotalInstallments] = useState('2');
  const [generateFutureMonths, setGenerateFutureMonths] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    const tx = editTransaction;
    setDescription(tx?.description || '');
    setAmount(tx ? formatAmountInput(tx.amount) : '');
    setType(tx?.type || 'expense');
    setCategory(tx?.category || categories.find(c => c.name === 'Outros')?.name || categories[0]?.name || 'Outros');
    setAccountId(tx?.accountId || accounts[0]?.id || '');
    setDate(tx?.date || defaultDate(currentMonth));
    // Mês só vem preenchido se o usuário o fixou; senão o servidor calcula pela data e pelo cartão.
    setMonth(tx?.monthLocked ? tx.month : '');
    setPaid(Boolean(tx?.paid));
    setIsInstallment(Boolean(tx?.installment));
    setCurrentInstallment(String(tx?.installment?.current || 1));
    setTotalInstallments(String(tx?.installment?.total || 2));
    setGenerateFutureMonths(!tx);
    setErrors({});
  }, [editTransaction, isOpen, currentMonth, categories, accounts]);

  if (!isOpen) return null;

  // Opções do mês da fatura: do mês anterior à compra até 4 meses depois.
  const baseMonth = (date || defaultDate(currentMonth)).slice(0, 7);
  const monthOptions = Array.from({ length: 6 }, (_, i) => addMonths(baseMonth, i - 1));
  if (month && !monthOptions.includes(month)) monthOptions.push(month);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = parseAmount(amount);
    const nextErrors = {};
    if (!description.trim()) nextErrors.description = 'Informe a descrição.';
    if (!Number.isFinite(value) || value <= 0) nextErrors.amount = 'Informe um valor maior que zero.';
    if (!accountId) nextErrors.accountId = 'Escolha a conta ou cartão.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSave({
      description: description.trim(),
      amount: Math.round(value * 100) / 100,
      type,
      category: type === 'income' ? 'Salário & Entradas' : (category || 'Outros'),
      accountId,
      date,
      month: month || null,
      paid,
      isInstallment: type === 'expense' ? isInstallment : false,
      currentInstallment: parseInt(currentInstallment, 10),
      totalInstallments: parseInt(totalInstallments, 10),
      generateFutureMonths: type === 'expense' && isInstallment && !editTransaction ? generateFutureMonths : false
    });
  };

  const accent = TYPE_OPTIONS.find(o => o.value === type)?.color || 'primary';

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        <DialogTitle sx={{ p: 1.5, pl: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            {editTransaction ? 'Editar lançamento' : 'Novo lançamento'}
          </Typography>
          <IconButton onClick={onClose} aria-label="Fechar" sx={{ width: 44, height: 44 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={type}
            onChange={(e, value) => value && setType(value)}
            sx={{ '& .MuiToggleButton-root': { minHeight: 44, fontWeight: 600, textTransform: 'none' } }}
          >
            {TYPE_OPTIONS.map(o => (
              <ToggleButton key={o.value} value={o.value} color={o.color}>{o.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>

          <TextField
            label="Valor"
            fullWidth
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            autoFocus={!editTransaction}
            slotProps={{
              htmlInput: { inputMode: 'decimal', style: { fontSize: 22, fontWeight: 700 } },
              input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> }
            }}
            error={Boolean(errors.amount)}
            helperText={errors.amount}
          />

          <TextField
            label="Descrição"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'income' ? 'Ex.: Salário, Freelance' : 'Ex.: Supermercado, Farmácia'}
            slotProps={{ htmlInput: { autoCapitalize: 'sentences' } }}
            error={Boolean(errors.description)}
            helperText={errors.description}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.25 }}>
            <FormControl fullWidth error={Boolean(errors.accountId)}>
              <InputLabel>{type === 'income' ? 'Recebido em' : 'Conta ou cartão'}</InputLabel>
              <Select value={accountId} label={type === 'income' ? 'Recebido em' : 'Conta ou cartão'} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map(acc => <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>)}
              </Select>
            </FormControl>

            {type === 'expense' && (
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select value={category} label="Categoria" onChange={(e) => setCategory(e.target.value)}>
                  {categories.filter(c => c.name !== 'Salário & Entradas').map(c => (
                    <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label={type === 'income' ? 'Data do recebimento' : 'Data'}
              type="date"
              fullWidth
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <FormControl fullWidth>
              <InputLabel shrink>Mês da fatura</InputLabel>
              <Select
                value={month}
                label="Mês da fatura"
                displayEmpty
                notched
                onChange={(e) => setMonth(e.target.value)}
                renderValue={(v) => (v ? formatMonthTitle(v) : 'Automático')}
              >
                <MenuItem value="">Automático (pela data e fechamento)</MenuItem>
                {monthOptions.map(m => <MenuItem key={m} value={m}>{formatMonthTitle(m)}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {type === 'expense' && (
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid', borderColor: 'divider' }}>
              <FormControlLabel
                control={<Switch checked={isInstallment} onChange={(e) => setIsInstallment(e.target.checked)} />}
                label="Compra parcelada"
                sx={{ m: 0, width: '100%', justifyContent: 'space-between', flexDirection: 'row-reverse', minHeight: 44 }}
              />
              {isInstallment && (
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField label="Parcela atual" value={currentInstallment} onChange={(e) => setCurrentInstallment(e.target.value)} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
                    <TextField label="Total de parcelas" value={totalInstallments} onChange={(e) => setTotalInstallments(e.target.value)} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
                  </Box>
                  {!editTransaction && (
                    <FormControlLabel
                      control={<Switch size="small" checked={generateFutureMonths} onChange={(e) => setGenerateFutureMonths(e.target.checked)} />}
                      label={<Typography variant="body2" color="text.secondary">Criar as próximas parcelas nos meses seguintes</Typography>}
                      sx={{ m: 0, width: '100%', justifyContent: 'space-between', flexDirection: 'row-reverse', minHeight: 44 }}
                    />
                  )}
                </Box>
              )}
            </Box>
          )}

          <FormControlLabel
            control={<Switch checked={paid} onChange={(e) => setPaid(e.target.checked)} color="secondary" />}
            label="Já está pago"
            sx={{ m: 0, px: 1.5, justifyContent: 'space-between', flexDirection: 'row-reverse', minHeight: 44 }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          {editTransaction && onDelete && (
            <Button
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => onDelete(editTransaction)}
              sx={{ minHeight: 48, mr: 'auto' }}
            >
              Excluir
            </Button>
          )}
          {!fullScreen && <Button onClick={onClose} color="inherit" sx={{ minHeight: 48 }}>Cancelar</Button>}
          <Button
            type="submit"
            variant="contained"
            color={accent}
            disabled={saving}
            sx={{ minHeight: 48, flex: { xs: editTransaction ? '0 0 50%' : 1, sm: '0 0 auto' }, px: 3 }}
          >
            {editTransaction ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
