import React, { useState } from 'react';
import { useIsMobile } from '../useIsMobile';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  FormHelperText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

// Mesma família de tons da paleta do app (ver palette.js), com o roxo e o laranja dos bancos.
const COLOR_OPTIONS = [
  { label: 'Roxo / Nubank', value: '#9E6AD3' },
  { label: 'Laranja / Itaú', value: '#EC7000' },
  { label: 'Açafrão', value: '#BF8418' },
  { label: 'Jade', value: '#34C3A2' },
  { label: 'Verde', value: '#6CCB7A' },
  { label: 'Azul', value: '#4A82D6' },
  { label: 'Ciano', value: '#1FA3B8' },
  { label: 'Rosa', value: '#D45A9E' },
  { label: 'Coral', value: '#D9634F' },
  { label: 'Cinza', value: '#7D8B86' }
];

export function AccountManagementModal({
  isOpen,
  onClose,
  accounts = [],
  onSaveAccount,
  onDeleteAccount
}) {
  const isMobile = useIsMobile();
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('credit_card');
  const [color, setColor] = useState('#BF8418');
  const [billingCycle, setBillingCycle] = useState('same_month');
  const [closingDay, setClosingDay] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleStartEdit = (acc) => {
    setEditingId(acc.id);
    setName(acc.name);
    setType(acc.type || 'credit_card');
    setColor(acc.color || '#4A82D6');
    setBillingCycle(acc.billingCycle || (acc.monthOffset === -1 ? 'previous_month' : 'same_month'));
    setClosingDay(acc.closingDay ? String(acc.closingDay) : '');
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setEditingId('new');
    setName('');
    setType('credit_card');
    setColor('#BF8418');
    setBillingCycle('same_month');
    setClosingDay('');
    setIsCreating(true);
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setName('');
    setBillingCycle('same_month');
    setClosingDay('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveAccount({
      id: isCreating ? null : editingId,
      name: name.trim(),
      type,
      color,
      closingDay: type === 'credit_card' && closingDay ? parseInt(closingDay, 10) : null,
      billingCycle,
      monthOffset: billingCycle === 'previous_month' ? -1 : billingCycle === 'next_month' ? 1 : 0
    });

    handleCancelForm();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CreditCardIcon sx={{ color: 'accent.main' }} />
          <Typography variant="h6" fontWeight={700}>
            Gerenciar Cartões & Contas
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Formulário de Adição / Edição */}
        {editingId ? (
          <Box
            component="form"
            onSubmit={handleSave}
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'accent.main',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="accent.main">
              {isCreating ? 'Novo Cartão / Conta' : 'Editar Cartão / Conta'}
            </Typography>

            <TextField
              label="Nome do Cartão ou Banco"
              fullWidth
              size="small"
              required
              placeholder="Ex.: Fatura Itaú, Nubank, XP..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select value={type} label="Tipo" onChange={(e) => setType(e.target.value)}>
                  <MenuItem value="credit_card">Cartão de Crédito (Fatura)</MenuItem>
                  <MenuItem value="bank_account">Conta Bancária / Salário / PIX</MenuItem>
                  <MenuItem value="cash">Despesa Fixa / Dinheiro</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Cor da Tag</InputLabel>
                <Select value={color} label="Cor da Tag" onChange={(e) => setColor(e.target.value)}>
                  {COLOR_OPTIONS.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: c.value }} />
                        <span>{c.label}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {type === 'credit_card' && (
              <>
                <TextField
                  label="Dia de Fechamento da Fatura (1 a 31)"
                  type="number"
                  size="small"
                  fullWidth
                  placeholder="Ex.: 28, 29, 30"
                  slotProps={{ htmlInput: { min: 1, max: 31, inputMode: 'numeric' } }}
                  value={closingDay}
                  onChange={(e) => setClosingDay(e.target.value)}
                  helperText="Compras feitas a partir deste dia caem automaticamente na fatura do mês seguinte (ex.: compras no dia 30/09 entram na fatura de Outubro)."
                />

                <FormControl fullWidth size="small">
                  <InputLabel>Ciclo de Fatura / Mês de Competência</InputLabel>
                  <Select
                    value={billingCycle}
                    label="Ciclo de Fatura / Mês de Competência"
                    onChange={(e) => setBillingCycle(e.target.value)}
                  >
                    <MenuItem value="same_month">Padrão (mês original da data da compra)</MenuItem>
                    <MenuItem value="previous_month">Antecipar 1 mês (-1) (Nubank - fatura projetada para mês anterior)</MenuItem>
                    <MenuItem value="next_month">Postergar 1 mês (+1)</MenuItem>
                  </Select>
                  <FormHelperText sx={{ fontSize: '0.8125rem' }}>
                    {billingCycle === 'previous_month'
                      ? 'Recomendado para Nubank: parcelas que o banco projeta para o mês seguinte entram na competência deste mês.'
                      : 'Usa a data original registrada pelo banco (ideal para Itaú e cartões tradicionais).'}
                  </FormHelperText>
                </FormControl>
              </>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button size="small" onClick={handleCancelForm} color="inherit">
                Cancelar
              </Button>
              <Button size="small" type="submit" variant="contained" color="primary">
                Salvar
              </Button>
            </Box>
          </Box>
        ) : (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddCircleIcon />}
            onClick={handleStartCreate}
            fullWidth
            sx={{ py: 1 }}
          >
            Adicionar Novo Cartão / Conta
          </Button>
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* Lista de Contas Cadastradas */}
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
          Cartões & Contas Cadastrados ({accounts.length})
        </Typography>

        <List sx={{ p: 0 }}>
          {accounts.map(acc => (
            <ListItem
              key={acc.id}
              sx={{
                mb: 1,
                borderRadius: 2,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                px: 2,
                py: 1
              }}
            >
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: acc.color || 'accent.main', mr: 2, flexShrink: 0 }} />
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" fontWeight={700}>
                      {acc.name}
                    </Typography>
                    <Chip
                      label={acc.type === 'credit_card' ? 'Cartão de Crédito' : 'Conta / PIX'}
                      size="small"
                      sx={{ height: 20, fontSize: '0.8125rem' }}
                      color={acc.type === 'credit_card' ? 'warning' : 'info'}
                      variant="outlined"
                    />
                    {(acc.billingCycle === 'previous_month' || acc.monthOffset === -1) && (
                      <Chip
                        label="Ciclo Nubank (-1m)"
                        size="small"
                        sx={{ height: 20, fontSize: '0.8125rem', borderColor: 'info.main', color: 'info.light' }}
                        variant="outlined"
                      />
                    )}
                    {acc.closingDay && (
                      <Chip
                        label={`Fecha dia ${acc.closingDay}`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.8125rem' }}
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton size="small" onClick={() => handleStartEdit(acc)} title="Editar">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDeleteAccount(acc.id, acc.name)}
                  title="Excluir"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="inherit">
          Concluir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
