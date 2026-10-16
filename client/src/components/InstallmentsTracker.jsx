import React, { useState, useMemo } from 'react';
import {
  Grid,
  Card,
  CardContent,
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
  Button,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

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

  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

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
      map[acc.name] = acc.color || '#3b82f6';
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
          color: accountColorMap[acc] || '#eab308',
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
            alignItems: 'center',
            gap: 2,
            width: '100%'
          }}
        >
          {/* Campo de Busca centralizado */}
          <TextField
            size="small"
            placeholder="Buscar compras parceladas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              width: '100%',
              maxWidth: 480,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                bgcolor: 'rgba(255, 255, 255, 0.03)'
              }
            }}
            InputProps={{
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
            }}
          />

          {/* Chips de Cartões / Contas Centralizados */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              width: '100%',
              py: 0.5
            }}
          >
            <Chip
              label={`Todos (${installments.length})`}
              size="small"
              clickable
              color={selectedAccount === 'ALL' ? 'primary' : 'default'}
              variant={selectedAccount === 'ALL' ? 'filled' : 'outlined'}
              onClick={() => setSelectedAccount('ALL')}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                px: 0.5,
                transition: 'all 0.2s ease'
              }}
            />
            {accountOptions.map(accName => {
              const count = installments.filter(i => i.account === accName).length;
              const isSelected = selectedAccount === accName;
              const accColor = accountColorMap[accName] || '#3b82f6';
              return (
                <Chip
                  key={accName}
                  label={`${accName} (${count})`}
                  size="small"
                  clickable
                  variant={isSelected ? 'filled' : 'outlined'}
                  onClick={() => setSelectedAccount(isSelected ? 'ALL' : accName)}
                  icon={
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: isSelected ? '#fff' : accColor,
                        ml: 0.75
                      }}
                    />
                  }
                  sx={{
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 0.5,
                    borderColor: isSelected ? accColor : 'divider',
                    bgcolor: isSelected ? accColor : 'transparent',
                    color: isSelected ? '#fff' : 'text.primary',
                    '&:hover': {
                      bgcolor: isSelected ? accColor : 'rgba(255, 255, 255, 0.05)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Barra de Totais Filtrados com estilo de pílula integrada centralizada */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: { xs: 2, sm: 4 },
            pt: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(255, 255, 255, 0.015)',
            borderRadius: 1.5,
            px: 2,
            py: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main' }} />
            <Typography variant="caption" color="text.secondary">
              Neste mês:{' '}
              <Typography component="span" variant="caption" fontWeight={700} color="warning.main">
                {formatBRL(totalMonthlyCommitment)}
              </Typography>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'info.main' }} />
            <Typography variant="caption" color="text.secondary">
              Saldo futuro:{' '}
              <Typography component="span" variant="caption" fontWeight={700} color="info.light">
                {formatBRL(totalFutureDebt)}
              </Typography>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Total a quitar:{' '}
              <Typography component="span" variant="caption" fontWeight={700} color="text.primary">
                {formatBRL(totalInstallmentsDebt)}
              </Typography>
            </Typography>
          </Box>
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
                bgcolor: 'rgba(255, 255, 255, 0.02)',
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
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: group.color, flexShrink: 0 }} />
                <Typography variant="subtitle1" fontWeight={800} letterSpacing={-0.3}>
                  {group.accountName}
                </Typography>
                <Chip
                  label={`${group.items.length} ${group.items.length === 1 ? 'compra' : 'compras'}`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  Neste mês:{' '}
                  <Typography component="span" variant="caption" fontWeight={700} color="warning.main">
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
  accountColor = '#3b82f6'
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
        bgcolor: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
        transition: 'background-color 0.15s ease',
        '&:hover': {
          bgcolor: 'rgba(255, 255, 255, 0.03)'
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
                  fontSize: '0.65rem',
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
                sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(255, 255, 255, 0.06)' }}
              />
            )}

            {isFinalMonth ? (
              <Chip
                icon={<TaskAltIcon sx={{ fontSize: '13px !important' }} />}
                label={projectionText}
                size="small"
                color="success"
                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
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
            color={isFinalMonth ? 'success' : 'info'}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.08)'
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
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
              PARCELA NESTE MÊS
            </Typography>
            <Typography variant="body1" fontWeight={800} color="warning.main">
              {formatBRL(item.amountThisMonth || item.amountPerInstallment)}
            </Typography>
          </Box>

          {/* Saldo Restante */}
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
              SALDO A PAGAR
            </Typography>
            <Typography
              variant="body2"
              fontWeight={700}
              color={isFinalMonth ? 'success.main' : 'text.primary'}
            >
              {isFinalMonth ? 'Quita agora' : formatBRL(item.remainingDebt)}
            </Typography>
            {!isFinalMonth && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
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
                bgcolor: isExpanded ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
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
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
              Cronograma das {total} Parcelas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Valor Total Contratado: <strong>{formatBRL(item.totalAmount)}</strong>
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
                        ? 'rgba(34, 197, 94, 0.3)'
                        : 'divider',
                    bgcolor: isCurrent
                      ? 'rgba(245, 158, 11, 0.1)'
                      : isPast
                        ? 'rgba(34, 197, 94, 0.05)'
                        : 'rgba(255, 255, 255, 0.02)',
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
                    {parcelNum}/{total} {isCurrent ? '★ Atual' : isPast ? '✓ Pago' : ''}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
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
