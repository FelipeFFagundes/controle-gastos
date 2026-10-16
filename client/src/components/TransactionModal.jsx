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
  Checkbox,
  Box,
  Grid,
  Typography,
  InputAdornment,
  ButtonGroup,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  categories = [],
  accounts = [],
  currentMonth = '2026-10',
  editTransaction = null
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [date, setDate] = useState('');
  const [paid, setPaid] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [currentInstallment, setCurrentInstallment] = useState(1);
  const [totalInstallments, setTotalInstallments] = useState(2);
  const [generateFutureMonths, setGenerateFutureMonths] = useState(true);

  useEffect(() => {
    if (editTransaction) {
      setDescription(editTransaction.description || '');
      setAmount(editTransaction.amount ? String(editTransaction.amount) : '');
      setType(editTransaction.type || 'expense');
      setCategory(editTransaction.category || (categories[0]?.name || 'Outros'));
      setAccount(editTransaction.account || (accounts[0]?.name || 'Fatura XP'));
      setDate(editTransaction.date || `${currentMonth}-15`);
      setPaid(Boolean(editTransaction.paid));
      if (editTransaction.installment) {
        setIsInstallment(true);
        setCurrentInstallment(editTransaction.installment.current || 1);
        setTotalInstallments(editTransaction.installment.total || 2);
        setGenerateFutureMonths(false);
      } else {
        setIsInstallment(false);
        setCurrentInstallment(1);
        setTotalInstallments(2);
      }
    } else {
      setDescription('');
      setAmount('');
      setType('expense');
      setCategory(categories[0]?.name || 'Outros');
      setAccount(accounts[0]?.name || 'Fatura XP');
      setDate(`${currentMonth}-15`);
      setPaid(false);
      setIsInstallment(false);
      setCurrentInstallment(1);
      setTotalInstallments(2);
      setGenerateFutureMonths(true);
    }
  }, [editTransaction, isOpen, currentMonth, categories, accounts]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim() || !amount) {
      alert('Por favor, informe a descrição e o valor.');
      return;
    }

    const payload = {
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      category,
      account,
      date,
      paid,
      isInstallment,
      currentInstallment: parseInt(currentInstallment, 10),
      totalInstallments: parseInt(totalInstallments, 10),
      generateFutureMonths: isInstallment && !editTransaction ? generateFutureMonths : false
    };

    onSave(payload);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {editTransaction ? <EditIcon color="primary" /> : <AddCircleIcon color="primary" />}
          <Typography variant="h6" fontWeight={700}>
            {editTransaction ? 'Editar Lançamento' : 'Nova Compra / Lançamento'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Seletor Tipo: Despesa vs Receita */}
          <ButtonGroup fullWidth variant="outlined" size="small">
            <Button
              variant={type === 'expense' ? 'contained' : 'outlined'}
              color="error"
              onClick={() => setType('expense')}
              sx={{ fontWeight: 600 }}
            >
              Gasto no Cartão / Despesa
            </Button>
            <Button
              variant={type === 'income' ? 'contained' : 'outlined'}
              color="secondary"
              onClick={() => {
                setType('income');
                if (!category) setCategory('Salário & Entradas');
              }}
              sx={{ fontWeight: 600 }}
            >
              Salário / Receita Prevista
            </Button>
          </ButtonGroup>

          {/* Descrição e Valor */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Descrição da Compra"
                fullWidth
                size="small"
                required
                placeholder="Ex.: Discos, Supermercado, Farm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Valor (R$)"
                fullWidth
                size="small"
                required
                type="number"
                inputProps={{ step: '0.01', min: '0.01' }}
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>
                }}
              />
            </Grid>
          </Grid>

          {/* Conta/Cartão e Categoria */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Conta / Cartão</InputLabel>
                <Select
                  value={account}
                  label="Conta / Cartão"
                  onChange={(e) => setAccount(e.target.value)}
                >
                  {accounts.map(acc => (
                    <MenuItem key={acc.id} value={acc.name}>
                      {acc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={category}
                  label="Categoria"
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Data */}
          <TextField
            label="Data"
            type="date"
            fullWidth
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {/* Parcelamento */}
          {type === 'expense' && (
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid', borderColor: 'divider' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isInstallment}
                    onChange={(e) => setIsInstallment(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={600}>
                    Compra Parcelada (ex.: 1/6)
                  </Typography>
                }
              />

              {isInstallment && (
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Parcela Atual"
                        type="number"
                        size="small"
                        fullWidth
                        inputProps={{ min: 1, max: totalInstallments }}
                        value={currentInstallment}
                        onChange={(e) => setCurrentInstallment(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Total de Parcelas"
                        type="number"
                        size="small"
                        fullWidth
                        inputProps={{ min: 2, max: 48 }}
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  {!editTransaction && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={generateFutureMonths}
                          onChange={(e) => setGenerateFutureMonths(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="caption" color="text.secondary">
                          Gerar automaticamente as parcelas nos meses subsequentes
                        </Typography>
                      }
                    />
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Status Já Pago? */}
          <FormControlLabel
            control={
              <Checkbox
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                color="secondary"
              />
            }
            label={
              <Typography variant="body2" fontWeight={600}>
                Já está pago / liquidado?
              </Typography>
            }
          />
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" color="primary">
            {editTransaction ? 'Salvar Alterações' : 'Registrar Compra'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
