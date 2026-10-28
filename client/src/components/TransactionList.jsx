import React, { useMemo, useRef, useState } from 'react';
import {
  Card,
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  ButtonBase,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import TuneIcon from '@mui/icons-material/Tune';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { CategoryAvatar } from './CategoryAvatar';
import { Kbd } from './Kbd';
import { formatBRL, formatDayHeader, formatMonthShort, formatSignedBRL, parseAmount } from '../format';

// Transferências (pagamento de fatura, aplicação automática) não são gasto nem receita.
const amountColor = (type) => (type === 'income' ? 'secondary.main' : type === 'transfer' ? 'text.secondary' : 'text.primary');
const amountPrefix = (type) => (type === 'income' ? '+ ' : type === 'transfer' ? '⇄ ' : '− ');

const TYPE_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Entradas' },
  { value: 'transfer', label: 'Transferências' }
];

const SWIPE_THRESHOLD = 80;

// Filtro rápido: contorno neutro; o selecionado fica em branco com a linha jade na borda de baixo.
const filterChipSx = (selected) => ({
  height: 36,
  flexShrink: 0,
  color: selected ? 'text.primary' : 'text.secondary',
  ...(selected && { borderBottomColor: 'accent.main' })
});

// A parcela já aparece no selo "2/12": tira o "02/12" do fim da descrição.
const INSTALLMENT_SUFFIX = /\s*-?\s*(?:parcela\s*)?\d{1,2}\s*\/\s*\d{1,2}\s*$/i;
const displayDescription = (tx) => (tx.installment ? tx.description.replace(INSTALLMENT_SUFFIX, '') || tx.description : tx.description);

const secondaryLine = (tx) => {
  if (tx.type === 'income') return tx.account;
  if (tx.type === 'transfer') return `Transferência · ${tx.account}`;
  return `${tx.category} · ${tx.account}`;
};

// Linha que pode ser arrastada no celular: para a direita marca como pago, para a esquerda exclui.
// Posição atual da linha, inclusive no meio da animação de volta.
function currentTranslateX(el) {
  const transform = el ? getComputedStyle(el).transform : 'none';
  return transform && transform !== 'none' ? new DOMMatrixReadOnly(transform).m41 : 0;
}

function SwipeRow({ children, paid, onSwipeRight, onSwipeLeft }) {
  const [dx, setDx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const start = useRef(null);
  const dragging = useRef(false);
  const justSwiped = useRef(false);
  const content = useRef(null);

  const reset = () => {
    start.current = null;
    dragging.current = false;
    setIsDragging(false);
    setDx(0);
  };

  const handlers = {
    onPointerDown: (e) => {
      if (e.pointerType !== 'touch') return;
      // Interrompível: se a linha ainda está voltando ao lugar, o dedo a pega de onde ela está.
      const offset = currentTranslateX(content.current);
      start.current = { x: e.clientX - offset, y: e.clientY };
      dragging.current = Math.abs(offset) > 1;
      if (dragging.current) {
        setIsDragging(true);
        setDx(offset);
      }
    },
    onPointerMove: (e) => {
      if (!start.current) return;
      const deltaX = e.clientX - start.current.x;
      const deltaY = e.clientY - start.current.y;
      if (!dragging.current) {
        if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          dragging.current = true;
          setIsDragging(true);
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } else if (Math.abs(deltaY) > 12) {
          start.current = null;
          return;
        }
      }
      if (dragging.current) setDx(Math.max(-140, Math.min(140, deltaX)));
    },
    onPointerUp: () => {
      if (dragging.current) {
        justSwiped.current = true;
        setTimeout(() => { justSwiped.current = false; }, 50);
        if (dx > SWIPE_THRESHOLD) onSwipeRight();
        else if (dx < -SWIPE_THRESHOLD) onSwipeLeft();
      }
      reset();
    },
    onPointerCancel: reset,
    // Um arrasto não deve virar toque (abrir a edição).
    onClickCapture: (e) => {
      if (justSwiped.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    }
  };

  const reveal = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD);
  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', touchAction: 'pan-y' }} {...handlers}>
      {dx !== 0 && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: dx > 0 ? 'flex-start' : 'flex-end',
            px: 2.5,
            bgcolor: dx > 0 ? 'secondary.dark' : 'error.dark',
            opacity: 0.4 + reveal * 0.6,
            color: '#fff',
            fontWeight: 700
          }}
        >
          {dx > 0 ? (paid ? 'Pendente' : 'Pago') : 'Excluir'}
        </Box>
      )}
      <Box
        ref={content}
        sx={{
          position: 'relative',
          transform: `translateX(${dx}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          bgcolor: 'background.paper'
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function TransactionRow({ tx, categories, onEdit, onPickCategory, onTogglePaid, onDelete }) {
  const billedInOtherMonth = tx.date && tx.date.slice(0, 7) !== tx.month;

  // Lançamento novo ainda não confirmado pelo servidor (atualização otimista): visível, mas sem ações.
  if (tx.pending) {
    return (
      <Box aria-busy="true" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: { xs: 1.5, sm: 2 }, py: 1.25, minHeight: 68, opacity: 0.55 }}>
        <CategoryAvatar category={tx.category} categories={categories} type={tx.type} size={40} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }} noWrap>{tx.description}</Typography>
          <Typography variant="caption" color="text.secondary">Salvando…</Typography>
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: amountColor(tx.type), whiteSpace: 'nowrap' }}>
          {amountPrefix(tx.type)}{formatBRL(tx.amount)}
        </Typography>
      </Box>
    );
  }

  return (
    <SwipeRow paid={tx.paid} onSwipeRight={() => onTogglePaid(tx)} onSwipeLeft={() => onDelete(tx)}>
      <Box
        role="button"
        tabIndex={0}
        aria-label={`${tx.description}, ${amountPrefix(tx.type)}${formatBRL(tx.amount)}, ${tx.paid ? 'pago' : 'pendente'}. Toque para editar.`}
        onClick={() => onEdit(tx)}
        onKeyDown={(e) => { if (e.key === 'Enter') onEdit(tx); }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: { xs: 1.5, sm: 2 },
          py: 1.25,
          minHeight: 68,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'accent.main', outlineOffset: -2 }
        }}
      >
        <Tooltip title="Trocar categoria">
          <ButtonBase
            onClick={(e) => {
              e.stopPropagation();
              if (tx.type === 'expense') onPickCategory(tx);
            }}
            aria-label={`Categoria: ${tx.category}`}
            sx={{ borderRadius: '50%', p: 0.25 }}
          >
            <CategoryAvatar category={tx.category} categories={categories} type={tx.type} paid={tx.paid} size={40} />
          </ButtonBase>
        </Tooltip>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.95rem',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word'
            }}
          >
            {displayDescription(tx)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: '100%' }}>
              {secondaryLine(tx)}
            </Typography>
            {tx.installment && (
              <Chip label={`${tx.installment.current}/${tx.installment.total}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.75rem', color: 'text.secondary' }} />
            )}
            {billedInOtherMonth && (
              <Tooltip title="Compra feita em outro mês, cobrada na fatura deste mês">
                <Chip label={`fatura ${formatMonthShort(tx.month)}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.75rem', color: 'text.secondary' }} />
              </Tooltip>
            )}
          </Box>
        </Box>

        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: amountColor(tx.type), whiteSpace: 'nowrap' }}>
          {amountPrefix(tx.type)}{formatBRL(tx.amount)}
        </Typography>

        {/* No computador não há arrasto: ações visíveis. */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.5 }}>
          <Tooltip title={tx.paid ? 'Marcar como pendente' : 'Marcar como pago'}>
            <IconButton onClick={(e) => { e.stopPropagation(); onTogglePaid(tx); }}>
              {tx.paid ? <CheckCircleIcon color="secondary" /> : <RadioButtonUncheckedIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton onClick={(e) => { e.stopPropagation(); onDelete(tx); }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </SwipeRow>
  );
}

export function TransactionList({
  transactions = [],
  categories = [],
  searchInputId,
  accountFilter = '',
  onAccountFilterChange,
  categoryFilter = '',
  onCategoryFilterChange,
  onTogglePaid,
  onEdit,
  onDelete,
  onPickCategory
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'amount' | 'description'
  const [sortOrder, setSortOrder] = useState('desc');

  const hasAdvanced = Boolean(startDate || endDate || minAmount || maxAmount || sortBy !== 'date' || sortOrder !== 'desc');
  const hasAnyFilter = hasAdvanced || searchTerm || typeFilter !== 'all' || pendingOnly || accountFilter || categoryFilter;

  const clearAll = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setPendingOnly(false);
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('date');
    setSortOrder('desc');
    onAccountFilterChange?.('');
    onCategoryFilterChange?.('');
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const min = parseAmount(minAmount);
    const max = parseAmount(maxAmount);
    return transactions
      .filter(t => {
        if (term && ![t.description, t.category, t.account].some(v => v?.toLowerCase().includes(term))) return false;
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (pendingOnly && t.paid) return false;
        if (accountFilter && t.account !== accountFilter) return false;
        if (categoryFilter && (t.category !== categoryFilter || t.type !== 'expense')) return false;
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        if (Number.isFinite(min) && t.amount < min) return false;
        if (Number.isFinite(max) && t.amount > max) return false;
        return true;
      })
      .sort((a, b) => {
        let result = 0;
        if (sortBy === 'date') result = (a.date || '').localeCompare(b.date || '');
        else if (sortBy === 'amount') result = a.amount - b.amount;
        else result = (a.description || '').localeCompare(b.description || '');
        return sortOrder === 'asc' ? result : -result;
      });
  }, [transactions, searchTerm, typeFilter, pendingOnly, accountFilter, categoryFilter, startDate, endDate, minAmount, maxAmount, sortBy, sortOrder]);

  // Agrupado por dia quando ordenado por data; senão, um grupo só.
  const groups = useMemo(() => {
    if (sortBy !== 'date') return [{ key: 'all', title: null, items: filtered }];
    const byDay = [];
    for (const tx of filtered) {
      const last = byDay[byDay.length - 1];
      if (last && last.key === tx.date) last.items.push(tx);
      else byDay.push({ key: tx.date, title: formatDayHeader(tx.date), items: [tx] });
    }
    return byDay;
  }, [filtered, sortBy]);

  const balance = filtered.reduce((sum, t) => (t.type === 'transfer' ? sum : t.type === 'expense' ? sum - t.amount : sum + t.amount), 0);

  return (
    <Card sx={{ overflow: 'hidden' }}>
      {/* Busca e filtros */}
      <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar lançamento"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.querySelector('input')?.blur(); }}
            slotProps={{
              htmlInput: { id: searchInputId, 'aria-label': 'Buscar lançamento', enterKeyHint: 'search' },
              input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')} aria-label="Limpar busca">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : (
                <InputAdornment position="end"><Kbd sx={{ color: 'text.secondary' }}>/</Kbd></InputAdornment>
              )
              }
            }}
            sx={{ '& .MuiInputBase-root': { minHeight: 44 } }}
          />
          <IconButton
            onClick={() => setShowAdvanced(v => !v)}
            aria-label="Mais filtros"
            color={hasAdvanced ? 'secondary' : 'default'}
            sx={{ width: 44, height: 44, border: '1px solid', borderColor: hasAdvanced ? 'accent.main' : 'divider', borderRadius: '4px' }}
          >
            <TuneIcon />
          </IconButton>
        </Box>

        {/* Filtros rápidos: rolam na horizontal dentro do card, sem alargar a página */}
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mx: { xs: -1.5, sm: 0 }, px: { xs: 1.5, sm: 0 }, pb: 0.25, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {TYPE_FILTERS.map(f => (
            <Chip
              key={f.value}
              label={f.label}
              clickable
              variant="outlined"
              aria-pressed={typeFilter === f.value}
              onClick={() => setTypeFilter(f.value)}
              sx={filterChipSx(typeFilter === f.value)}
            />
          ))}
          <Chip
            label="Pendentes"
            clickable
            variant="outlined"
            aria-pressed={pendingOnly}
            onClick={() => setPendingOnly(v => !v)}
            sx={filterChipSx(pendingOnly)}
          />
        </Box>

        <Collapse in={showAdvanced}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, pt: 0.5 }}>
            <TextField label="De" type="date" size="small" value={startDate} onChange={(e) => setStartDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Até" type="date" size="small" value={endDate} onChange={(e) => setEndDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Valor mínimo" size="small" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} slotProps={{ htmlInput: { inputMode: 'decimal' }, input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> } }} />
            <TextField label="Valor máximo" size="small" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} slotProps={{ htmlInput: { inputMode: 'decimal' }, input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> } }} />
            <FormControl size="small">
              <InputLabel>Ordenar por</InputLabel>
              <Select value={sortBy} label="Ordenar por" onChange={(e) => setSortBy(e.target.value)}>
                <MenuItem value="date">Data</MenuItem>
                <MenuItem value="amount">Valor</MenuItem>
                <MenuItem value="description">Descrição</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Ordem</InputLabel>
              <Select value={sortOrder} label="Ordem" onChange={(e) => setSortOrder(e.target.value)}>
                <MenuItem value="desc">{sortBy === 'date' ? 'Mais recentes' : sortBy === 'amount' ? 'Maiores' : 'Z → A'}</MenuItem>
                <MenuItem value="asc">{sortBy === 'date' ? 'Mais antigos' : sortBy === 'amount' ? 'Menores' : 'A → Z'}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Collapse>

        {/* Filtros vindos da Visão Geral (conta, categoria) */}
        {(accountFilter || categoryFilter) && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {accountFilter && <Chip label={accountFilter} onDelete={() => onAccountFilterChange?.('')} variant="outlined" sx={{ height: 32, borderBottomColor: 'accent.main' }} />}
            {categoryFilter && <Chip label={categoryFilter} onDelete={() => onCategoryFilterChange?.('')} variant="outlined" sx={{ height: 32, borderBottomColor: 'accent.main' }} />}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, minHeight: 32 }}>
          <Typography variant="caption" color="text.secondary">
            {filtered.length} {filtered.length === 1 ? 'lançamento' : 'lançamentos'}
            {filtered.length > 0 && <> · saldo <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{formatSignedBRL(Math.round(balance * 100) / 100)}</Box></>}
          </Typography>
          {hasAnyFilter && (
            <Button size="small" color="inherit" onClick={clearAll} sx={{ minHeight: 32, color: 'text.secondary' }}>
              Limpar filtros
            </Button>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, mt: -0.75 }}>
          Toque para editar · deslize → pago · ← excluir
        </Typography>
      </Box>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Box sx={{ p: 5, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">Nenhum lançamento encontrado.</Typography>
          {hasAnyFilter && <Button onClick={clearAll} sx={{ mt: 1 }}>Limpar filtros</Button>}
        </Box>
      ) : (
        groups.map(group => {
          const dayExpenses = group.items.reduce((s, t) => (t.type === 'expense' ? s + t.amount : s), 0);
          return (
            <Box key={group.key}>
              {group.title && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: { xs: 1.5, sm: 2 }, pt: 2, pb: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">{group.title}</Typography>
                  {dayExpenses > 0 && <Typography variant="caption" color="text.secondary">− {formatBRL(dayExpenses)}</Typography>}
                </Box>
              )}
              {group.items.map((tx, i) => (
                <Box key={tx.id} sx={{ borderTop: i > 0 || !group.title ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <TransactionRow
                    tx={tx}
                    categories={categories}
                    onEdit={onEdit}
                    onPickCategory={onPickCategory}
                    onTogglePaid={onTogglePaid}
                    onDelete={onDelete}
                  />
                </Box>
              ))}
            </Box>
          );
        })
      )}
    </Card>
  );
}
