import React, { useState, useMemo } from 'react';
import {
  Card,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Divider,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Collapse,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { formatBRL } from '../format';

// Helpers de data
function addMonths(monthStr, count) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1 + count, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthShort(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
  const cleanName = monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');
  return `${cleanName}/${String(year).slice(-2)}`;
}

function formatMonthLong(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
}

export function InstallmentsTracker({
  installments = [],
  currentMonth = '2026-10',
  accounts = []
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('ALL');
  const [expandedKeys, setExpandedKeys] = useState({});

  const toggleExpand = (key) => {
    setExpandedKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Mapeamento de cor da conta
  const accountColorMap = useMemo(() => {
    const map = {};
    (accounts || []).forEach(acc => {
      map[acc.name] = acc.color || '#7D8B86';
    });
    return map;
  }, [accounts]);

  // Lista de contas disponíveis nos parcelamentos
  const accountOptions = useMemo(() => {
    const set = new Set();
    installments.forEach(i => {
      if (i.account) set.add(i.account);
    });
    return Array.from(set).sort();
  }, [installments]);

  // Filtragem
  const filteredInstallments = useMemo(() => {
    return installments.filter(item => {
      if (selectedAccount !== 'ALL' && item.account !== selectedAccount) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchDesc = (item.description || '').toLowerCase().includes(term);
        const matchCat = (item.category || '').toLowerCase().includes(term);
        const matchAcc = (item.account || '').toLowerCase().includes(term);
        if (!matchDesc && !matchCat && !matchAcc) return false;
      }
      return true;
    });
  }, [installments, selectedAccount, searchTerm]);

  // Totais Consolidados (para visualização compacta)
  const totalMonthlyCommitment = useMemo(() => {
    return filteredInstallments.reduce((acc, curr) => acc + (curr.amountThisMonth || 0), 0);
  }, [filteredInstallments]);

  const totalFutureDebt = useMemo(() => {
    return filteredInstallments.reduce((acc, curr) => acc + (curr.remainingDebt || 0), 0);
  }, [filteredInstallments]);

  const totalInstallmentsDebt = useMemo(() => {
    return totalMonthlyCommitment + totalFutureDebt;
  }, [totalMonthlyCommitment, totalFutureDebt]);

  // Agrupamento por conta
  const groupedInstallments = useMemo(() => {
    const groups = {};
    filteredInstallments.forEach(item => {
      const acc = item.account || 'Outros';
      if (!groups[acc]) {
        groups[acc] = {
          accountName: acc,
          color: accountColorMap[acc] || '#7D8B86',
          items: [],
          totalThisMonth: 0,
          totalRemainingDebt: 0
        };
      }
      groups[acc].items.push(item);
      groups[acc].totalThisMonth += (item.amountThisMonth || 0);
      groups[acc].totalRemainingDebt += (item.remainingDebt || 0);
    });
    return Object.values(groups);
  }, [filteredInstallments, accountColorMap]);

  if (!installments || installments.length === 0) {
    return (
      <Card sx={{ p: 6, textAlign: 'center' }}>
        <LayersIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
        <Typography variant="body1" fontWeight={600} color="text.secondary">
          Nenhum parcelamento ativo encontrado.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Ao registrar compras parceladas ou sincronizar seus cartões via Pluggy, suas parcelas aparecerão organizadas aqui.
        </Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* BARRA DE FILTROS & BUSCA INTEGRADA E HARMÔNICA */}
      <Card
        sx={{
          p: { xs: 2, sm: 2.25 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none'
        }}
      >
        {/* Linha de Busca: Centralizada ou proporcional */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 2,
            width: '100%'
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar compras parceladas"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: '100%', '& .MuiInputBase-root': { minHeight: 44 } }}
            slotProps={{ input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')} edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            } }}
          />

          {/* Filtro por cartão/conta: o selecionado fica em branco com a linha jade na borda de baixo */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              flexWrap: 'wrap',
              width: '100%'
            }}
          >
            <Chip
              label={`Todos (${installments.length})`}
              clickable
              variant="outlined"
              aria-pressed={selectedAccount === 'ALL'}
              onClick={() => setSelectedAccount('ALL')}
              sx={{
                height: 36,
                color: selectedAccount === 'ALL' ? 'text.primary' : 'text.secondary',
                ...(selectedAccount === 'ALL' && { borderBottomColor: 'accent.main' })
              }}
            />
            {accountOptions.map(accName => {
              const count = installments.filter(i => i.account === accName).length;
              const isSelected = selectedAccount === accName;
              const accColor = accountColorMap[accName] || '#7D8B86';
              return (
                <Chip
                  key={accName}
                  label={`${accName} (${count})`}
                  clickable
                  variant="outlined"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedAccount(isSelected ? 'ALL' : accName)}
                  icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accColor, ml: 0.75 }} />}
                  sx={{
                    height: 36,
                    color: isSelected ? 'text.primary' : 'text.secondary',
                    ...(isSelected && { borderBottomColor: 'accent.main' })
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Totais do filtro atual: rótulo em cinza em cima, valor em branco embaixo */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 2,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider'
          }}
        >
          {[
            ['Neste mês', totalMonthlyCommitment],
            ['Saldo futuro', totalFutureDebt],
            ['Total a quitar', totalInstallmentsDebt]
          ].map(([label, value]) => (
            <Box key={label} sx={{ minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
              <Typography sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 600, mt: 0.25 }} noWrap>{formatBRL(value)}</Typography>
            </Box>
          ))}
        </Box>
      </Card>

      {/* 3. LISTAGEM PRINCIPAL DAS PARCELAS (SEMPRE AGRUPADA POR CARTÃO) */}
      {filteredInstallments.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            Nenhuma compra parcelada encontrada com os filtros atuais.
          </Typography>
        </Card>
      ) : (
        groupedInstallments.map(group => (
          <Card key={group.accountName} sx={{ overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            {/* Cabeçalho do Cartão */}
            <Box
              sx={{
                p: 2,
                px: 2.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 1.5
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: group.color, flexShrink: 0 }} />
                <Typography component="h2" variant="subtitle1">
                  {group.accountName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {group.items.length} {group.items.length === 1 ? 'compra' : 'compras'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  Neste mês:{' '}
                  <Typography component="span" variant="caption" fontWeight={700} color="text.primary">
                    {formatBRL(group.totalThisMonth)}
                  </Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Saldo futuro:{' '}
                  <Typography component="span" variant="caption" fontWeight={700} color="text.primary">
                    {formatBRL(group.totalRemainingDebt)}
                  </Typography>
                </Typography>
              </Box>
            </Box>

            {/* Linhas de Compras Parceladas do Cartão */}
            <Stack divider={<Divider />}>
              {group.items.map((item, idx) => (
                <InstallmentRowItem
                  key={item.key || `${item.description}-${idx}`}
                  item={item}
                  currentMonth={currentMonth}
                  isExpanded={Boolean(expandedKeys[item.key || `${item.description}-${idx}`])}
                  onToggleExpand={() => toggleExpand(item.key || `${item.description}-${idx}`)}
                  formatBRL={formatBRL}
                  isMobile={isMobile}
                  isTablet={isTablet}
                />
              ))}
            </Stack>
          </Card>
        ))
      )}
    </Box>
  );
}

// COMPONENTE DE LINHA EMPILHADA E ALINHADA (ROW ITEM)
function InstallmentRowItem({
  item,
  currentMonth,
  isExpanded,
  onToggleExpand,
  formatBRL,
  isMobile,
  isTablet,
  showAccountBadge = false,
  accountColor = '#7D8B86'
}) {
  const current = item.currentInstallment || 1;
  const total = item.totalInstallments || 1;
  const percentage = Math.min(100, Math.round((current / total) * 100));
  const remaining = item.remainingInstallments !== undefined ? item.remainingInstallments : Math.max(0, total - current);
  const isFinalMonth = remaining === 0;

  // Projeção de término
  let projectionText = '';
  if (isFinalMonth) {
    projectionText = 'Última parcela neste mês!';
  } else if (remaining === 1) {
    projectionText = `Termina em ${formatMonthShort(addMonths(currentMonth, 1))} (1 mês restante)`;
  } else {
    projectionText = `Termina em ${formatMonthShort(addMonths(currentMonth, remaining))} (${remaining} meses restantes)`;
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        bgcolor: isExpanded ? 'action.hover' : 'transparent',
        transition: 'background-color 0.15s ease',
        '&:hover': {
          bgcolor: 'action.hover'
        }
      }}
    >
      {/* LINHA PRINCIPAL HORIZONTAL */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 2, md: 3 }
        }}
      >
        {/* COLUNA 1: NOME DA COMPRA & CATEGORIA / PROJEÇÃO */}
        <Box sx={{ flex: { md: '2 1 0' }, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body1" fontWeight={700} sx={{ wordBreak: 'break-word', color: 'text.primary' }}>
              {item.description}
            </Typography>
            {showAccountBadge && (
              <Chip
                label={item.account}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderColor: accountColor,
                  color: accountColor
                }}
                variant="outlined"
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
            {item.category && (
              <Chip
                label={item.category}
                size="small"
                sx={{ height: 20, fontSize: '0.8125rem', bgcolor: 'action.selected' }}
              />
            )}

            {isFinalMonth ? (
              <Chip
                icon={<TaskAltIcon sx={{ fontSize: '13px !important' }} />}
                label={projectionText}
                size="small"
                color="success"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.8125rem', fontWeight: 600 }}
              />
            ) : (
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {projectionText}
              </Typography>
            )}
          </Box>
        </Box>

        {/* COLUNA 2: BARRA DE PROGRESSO & PARCELA X DE Y */}
        <Box sx={{ flex: { md: '1.5 1 0' }, width: { xs: '100%', md: 'auto' }, minWidth: { md: 180 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.primary">
              Parcela {current} de {total}
            </Typography>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {percentage}% pago
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={percentage}
            color={isFinalMonth ? 'success' : 'inherit'}
            sx={{
              height: 4,
              bgcolor: 'divider',
              color: 'text.secondary',
              '& .MuiLinearProgress-bar': isFinalMonth ? undefined : { bgcolor: 'text.secondary' }
            }}
          />
        </Box>

        {/* COLUNA 3: VALORES (PARCELA ATUAL & SALDO DEVEDOR) + BOTÃO DETALHES */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'space-between', md: 'flex-end' },
            width: { xs: '100%', md: 'auto' },
            gap: { xs: 2, sm: 4 },
            flexShrink: 0
          }}
        >
          {/* Valor da Parcela Deste Mês */}
          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Parcela neste mês
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {formatBRL(item.amountThisMonth || item.amountPerInstallment)}
            </Typography>
          </Box>

          {/* Saldo Restante */}
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Saldo a pagar
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              color={isFinalMonth ? 'success.main' : 'text.primary'}
            >
              {isFinalMonth ? 'Quita agora' : formatBRL(item.remainingDebt)}
            </Typography>
            {!isFinalMonth && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.8125rem' }}>
                {remaining}x de {formatBRL(item.amountPerInstallment)}
              </Typography>
            )}
          </Box>

          {/* Botão para Expandir Histórico das Parcelas */}
          <Tooltip title={isExpanded ? 'Recolher detalhes' : 'Ver todas as parcelas'}>
            <IconButton
              size="small"
              onClick={onToggleExpand}
              sx={{
                bgcolor: isExpanded ? 'action.selected' : 'transparent',
                border: '1px solid',
                borderColor: isExpanded ? 'divider' : 'transparent'
              }}
            >
              {isExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ÁREA EXPANDIDA: CRONOGRAMA COMPLETO DE PARCELAS */}
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            mt: 2,
            pt: 2,
            borderTop: '1px dashed',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Cronograma das {total} parcelas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Valor total contratado: <strong>{formatBRL(item.totalAmount)}</strong>
            </Typography>
          </Box>

          {/* Grid / Trilha de Parcelas */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Array.from({ length: total }, (_, i) => {
              const parcelNum = i + 1;
              const isPast = parcelNum < current;
              const isCurrent = parcelNum === current;
              const isFuture = parcelNum > current;

              // Tenta localizar o mês no histórico ou projeta a partir do mês atual
              const historyItem = item.history?.find(h => h.current === parcelNum);
              const estimatedMonth = historyItem
                ? historyItem.month
                : addMonths(currentMonth, parcelNum - current);

              return (
                <Box
                  key={parcelNum}
                  sx={{
                    p: 1,
                    px: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: isCurrent
                      ? 'warning.main'
                      : isPast
                        ? 'rgba(108, 203, 122, 0.3)'
                        : 'divider',
                    bgcolor: isCurrent
                      ? 'rgba(235, 181, 74, 0.1)'
                      : isPast
                        ? 'rgba(108, 203, 122, 0.06)'
                        : 'action.hover',
                    minWidth: 100,
                    textAlign: 'center'
                  }}
                >
                  <Typography
                    variant="caption"
                    display="block"
                    fontWeight={isCurrent ? 800 : 600}
                    color={isCurrent ? 'warning.main' : isPast ? 'success.main' : 'text.secondary'}
                  >
                    {parcelNum}/{total} {isCurrent ? '· atual' : isPast ? '· paga' : ''}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                    {formatMonthShort(estimatedMonth)}
                  </Typography>
                  <Typography variant="caption" display="block" fontWeight={700} sx={{ mt: 0.25 }}>
                    {formatBRL(item.amountPerInstallment)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
