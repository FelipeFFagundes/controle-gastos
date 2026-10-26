import React, { useState, useMemo } from 'react';
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
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  TableSortLabel,
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
import FilterListIcon from '@mui/icons-material/FilterList';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import SwapVertIcon from '@mui/icons-material/SwapVert';

// Transferências (pagamento de fatura, aplicação automática) não são gasto nem receita.
const amountColor = (type) => type === 'income' ? 'secondary.main' : type === 'transfer' ? 'text.secondary' : 'error.main';
const amountPrefix = (type) => type === 'income' ? '+ ' : type === 'transfer' ? '⇄ ' : '- ';

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
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'expense' | 'income' | 'transfer'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'pending'
  
  // Filtros avançados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Ordenação
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'amount' | 'description'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  const handleSort = (property) => {
    const isAsc = sortBy === property && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(property);
  };

  const hasActiveAdvancedFilters = Boolean(
    startDate || endDate || minAmount || maxAmount || categoryFilter
  );

  const clearAllFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setCategoryFilter('');
    if (onSelectAccountFilter) onSelectAccountFilter('');
  };

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

  // Filtragem e Ordenação com useMemo
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const descMatch = t.description?.toLowerCase().includes(term);
          const catMatch = t.category?.toLowerCase().includes(term);
          const accMatch = t.account?.toLowerCase().includes(term);
          if (!descMatch && !catMatch && !accMatch) return false;
        }

        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (statusFilter === 'paid' && !t.paid) return false;
        if (statusFilter === 'pending' && t.paid) return false;
        if (selectedAccountFilter && t.account !== selectedAccountFilter) return false;
        if (categoryFilter && t.category !== categoryFilter) return false;

        // Filtro por Data
        if (startDate && t.date && t.date < startDate) return false;
        if (endDate && t.date && t.date > endDate) return false;

        // Filtro por Valor
        const amountNum = Number(t.amount || 0);
        if (minAmount !== '' && !isNaN(Number(minAmount)) && amountNum < Number(minAmount)) return false;
        if (maxAmount !== '' && !isNaN(Number(maxAmount)) && amountNum > Number(maxAmount)) return false;

        return true;
      })
      .sort((a, b) => {
        let result = 0;
        if (sortBy === 'date') {
          result = (a.date || '').localeCompare(b.date || '');
        } else if (sortBy === 'amount') {
          result = Number(a.amount || 0) - Number(b.amount || 0);
        } else if (sortBy === 'description') {
          result = (a.description || '').localeCompare(b.description || '');
        }
        return sortOrder === 'asc' ? result : -result;
      });
  }, [
    transactions,
    searchTerm,
    typeFilter,
    statusFilter,
    selectedAccountFilter,
    categoryFilter,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    sortBy,
    sortOrder
  ]);

  // Soma dos valores filtrados
  const filteredTotal = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const val = Number(t.amount || 0);
      if (t.type === 'transfer') return acc;
      return t.type === 'expense' ? acc - val : acc + val;
    }, 0);
  }, [filteredTransactions]);

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

          {/* Botão de Filtros Avançados */}
          <Button
            size="small"
            variant={showAdvancedFilters || hasActiveAdvancedFilters ? 'contained' : 'outlined'}
            color={hasActiveAdvancedFilters ? 'secondary' : 'inherit'}
            startIcon={<FilterListIcon />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            sx={{ whiteSpace: 'nowrap', minWidth: 120, textTransform: 'none' }}
          >
            {hasActiveAdvancedFilters ? 'Filtros (Ativos)' : 'Filtrar'}
          </Button>

          {/* Chips de Filtro Rápido */}
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: { xs: 0.5, sm: 0 }, alignItems: 'center' }}>
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
            <Chip
              label="Transferências"
              clickable
              size="small"
              color={typeFilter === 'transfer' ? 'info' : 'default'}
              variant={typeFilter === 'transfer' ? 'filled' : 'outlined'}
              onClick={() => setTypeFilter('transfer')}
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

        {/* Painel Expansível de Filtros Avançados */}
        <Collapse in={showAdvancedFilters}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
              {/* Filtro por Data Inicial */}
              <TextField
                label="Data inicial"
                type="date"
                size="small"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              {/* Filtro por Data Final */}
              <TextField
                label="Data final"
                type="date"
                size="small"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              {/* Filtro por Valor Mínimo */}
              <TextField
                label="Valor mínimo (R$)"
                type="number"
                size="small"
                placeholder="Ex.: 50"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                fullWidth
              />

              {/* Filtro por Valor Máximo */}
              <TextField
                label="Valor máximo (R$)"
                type="number"
                size="small"
                placeholder="Ex.: 500"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
                {/* Filtro de Categoria */}
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={categoryFilter}
                    label="Categoria"
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Todas as categorias</em>
                    </MenuItem>
                    {categories.map((c) => {
                      return (
                        <MenuItem key={c.id} value={c.name}>
                          {c.name}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                {/* Ordenação para mobile */}
                {isMobile && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel>Ordenar por</InputLabel>
                      <Select
                        value={sortBy}
                        label="Ordenar por"
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <MenuItem value="date">Data</MenuItem>
                        <MenuItem value="amount">Valor</MenuItem>
                        <MenuItem value="description">Descrição</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      startIcon={<SwapVertIcon />}
                      sx={{ textTransform: 'none' }}
                    >
                      {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Botão de Limpar Filtros */}
              {(hasActiveAdvancedFilters || searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || selectedAccountFilter) && (
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  startIcon={<FilterAltOffIcon />}
                  onClick={clearAllFilters}
                  sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                  Limpar todos os filtros
                </Button>
              )}
            </Box>
          </Box>
        </Collapse>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              Mostrando <strong>{filteredTransactions.length}</strong> de <strong>{transactions.length}</strong> lançamentos
            </Typography>
            {hasActiveAdvancedFilters && (
              <Chip
                size="small"
                label="Filtros personalizados aplicados"
                color="secondary"
                variant="outlined"
                onDelete={clearAllFilters}
                sx={{ height: 22, fontSize: '0.72rem' }}
              />
            )}
            {selectedAccountFilter && (
              <Chip
                size="small"
                label={`Conta: ${selectedAccountFilter}`}
                onDelete={() => onSelectAccountFilter && onSelectAccountFilter('')}
                color="primary"
                variant="outlined"
                sx={{ height: 22, fontSize: '0.72rem' }}
              />
            )}
          </Box>

          {/* Subtotal dos lançamentos filtrados */}
          {filteredTransactions.length > 0 && (
            <Typography variant="caption" fontWeight={600} color={filteredTotal >= 0 ? 'secondary.main' : 'error.main'}>
              Total filtrado: {formatBRL(Math.abs(filteredTotal))} {filteredTotal >= 0 ? '(Saldo positivo)' : '(Despesas)'}
            </Typography>
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
                    color={amountColor(tx.type)}
                  >
                    {amountPrefix(tx.type)}{formatBRL(tx.amount)}
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
                <TableCell sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortBy === 'description'}
                    direction={sortBy === 'description' ? sortOrder : 'asc'}
                    onClick={() => handleSort('description')}
                  >
                    Descrição & Categoria
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Conta / Cartão</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortBy === 'date'}
                    direction={sortBy === 'date' ? sortOrder : 'asc'}
                    onClick={() => handleSort('date')}
                  >
                    Data
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortBy === 'amount'}
                    direction={sortBy === 'amount' ? sortOrder : 'asc'}
                    onClick={() => handleSort('amount')}
                  >
                    Valor
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ width: 100, fontWeight: 700 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.map((tx) => {
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
                        color={amountColor(tx.type)}
                      >
                        {amountPrefix(tx.type)}{formatBRL(tx.amount)}
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
