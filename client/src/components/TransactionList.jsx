import React, { useState } from 'react';
import {
  Card,
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Divider,
  Stack,
  useMediaQuery,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CreditCardIcon from '@mui/icons-material/CreditCard';

export function TransactionList({
  transactions = [],
  accounts = [],
  categories = [],
  selectedAccountFilter = '',
  onSelectAccountFilter,
  onTogglePaid,
  onEdit,
  onDelete
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'pending'

  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Filtragem
  const filteredTransactions = transactions.filter(t => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const descMatch = t.description.toLowerCase().includes(term);
      const catMatch = t.category.toLowerCase().includes(term);
      const accMatch = t.account.toLowerCase().includes(term);
      if (!descMatch && !catMatch && !accMatch) return false;
    }

    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (statusFilter === 'paid' && !t.paid) return false;
    if (statusFilter === 'pending' && t.paid) return false;
    if (selectedAccountFilter && t.account !== selectedAccountFilter) return false;

    return true;
  });

  return (
    <Card>
      {/* Barra de Busca e Filtros */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
          {/* Busca */}
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar por descrição, cartão ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {/* Chips de Filtro */}
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: { xs: 0.5, sm: 0 } }}>
            <Chip
              label="Todas"
              clickable
              size="small"
              color={typeFilter === 'all' ? 'primary' : 'default'}
              variant={typeFilter === 'all' ? 'filled' : 'outlined'}
              onClick={() => setTypeFilter('all')}
            />
            <Chip
              label="Despesas"
              clickable
              size="small"
              color={typeFilter === 'expense' ? 'error' : 'default'}
              variant={typeFilter === 'expense' ? 'filled' : 'outlined'}
              onClick={() => setTypeFilter('expense')}
            />
            <Chip
              label="Receitas"
              clickable
              size="small"
              color={typeFilter === 'income' ? 'secondary' : 'default'}
              variant={typeFilter === 'income' ? 'filled' : 'outlined'}
              onClick={() => setTypeFilter('income')}
            />
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Chip
              label="Pagas"
              clickable
              size="small"
              color={statusFilter === 'paid' ? 'secondary' : 'default'}
              variant={statusFilter === 'paid' ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
            />
            <Chip
              label="Pendentes"
              clickable
              size="small"
              color={statusFilter === 'pending' ? 'warning' : 'default'}
              variant={statusFilter === 'pending' ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            />
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Mostrando <strong>{filteredTransactions.length}</strong> de <strong>{transactions.length}</strong> lançamentos
          </Typography>
          {selectedAccountFilter && (
            <Chip
              size="small"
              label={`Conta: ${selectedAccountFilter}`}
              onDelete={() => onSelectAccountFilter('')}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      <Divider />

      {/* Lista de Transações */}
      {filteredTransactions.length === 0 ? (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Nenhum lançamento encontrado com os filtros selecionados.
          </Typography>
        </Box>
      ) : isMobile ? (
        /* Versão Otimizada para Celular (Card List) */
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredTransactions.map((tx) => {
            const isIncome = tx.type === 'income';
            return (
              <Box
                key={tx.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5
                }}
              >
                <Checkbox
                  checked={Boolean(tx.paid)}
                  onChange={() => onTogglePaid(tx.id)}
                  icon={<RadioButtonUncheckedIcon fontSize="small" />}
                  checkedIcon={<CheckCircleIcon fontSize="small" color="secondary" />}
                  sx={{ p: 0.5 }}
                />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {tx.description}
                    </Typography>
                    {tx.installment && (
                      <Chip
                        label={`${tx.installment.current}/${tx.installment.total}`}
                        size="small"
                        color="info"
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {tx.account} • {formatDate(tx.date)}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={isIncome ? 'secondary.main' : 'error.main'}
                  >
                    {isIncome ? '+ ' : '- '}{formatBRL(tx.amount)}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
                    <IconButton size="small" onClick={() => onEdit(tx)} sx={{ p: 0.5 }}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => onDelete(tx.id)} sx={{ p: 0.5, color: 'error.main' }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        /* Versão Tabela para Desktop / Tablet */
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
              <TableRow>
                <TableCell align="center" sx={{ width: 60, fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Descrição & Categoria</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Conta / Cartão</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Valor</TableCell>
                <TableCell align="right" sx={{ width: 100, fontWeight: 700 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <TableRow key={tx.id} hover sx={{ opacity: tx.paid ? 0.9 : 1 }}>
                    <TableCell align="center">
                      <Checkbox
                        checked={Boolean(tx.paid)}
                        onChange={() => onTogglePaid(tx.id)}
                        icon={<RadioButtonUncheckedIcon fontSize="small" />}
                        checkedIcon={<CheckCircleIcon fontSize="small" color="secondary" />}
                        sx={{ p: 0.5 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={600}>
                          {tx.description}
                        </Typography>
                        {tx.installment && (
                          <Chip
                            label={`Parcela ${tx.installment.current}/${tx.installment.total}`}
                            size="small"
                            color="info"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        <Chip
                          label={tx.category}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <CreditCardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {tx.account}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(tx.date)}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={isIncome ? 'secondary.main' : 'error.main'}
                      >
                        {isIncome ? '+ ' : '- '}{formatBRL(tx.amount)}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <IconButton size="small" onClick={() => onEdit(tx)} sx={{ mr: 0.5 }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => onDelete(tx.id)} sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
}
