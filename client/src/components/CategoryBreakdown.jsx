import React, { useState } from 'react';
import { Card, Typography, Box, ButtonBase } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { categoryVisual } from './CategoryAvatar';
import { formatBRL, formatPercent } from '../format';

// Quantas categorias aparecem antes de "Outras": o card fica da mesma altura que o de cartões ao lado.
const VISIBLE = 5;

// Gastos do mês por categoria, do maior para o menor. Tocar numa categoria abre a lista filtrada por ela.
// Cada linha leva uma barra fina proporcional ao maior gasto: cinza, com a primeira em branco.
export function CategoryBreakdown({ expensesByCategory = {}, categories = [], totalExpense = 0, onSelectCategory }) {
  const [showAll, setShowAll] = useState(false);
  const entries = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0 || totalExpense === 0) return null;

  const largest = entries[0][1];
  const collapsible = entries.length > VISIBLE + 1;
  const visible = collapsible && !showAll ? entries.slice(0, VISIBLE) : entries;
  const rest = entries.slice(VISIBLE);
  const restTotal = rest.reduce((sum, [, amount]) => sum + amount, 0);

  return (
    <Card component="section" aria-labelledby="categories-heading" sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, sm: 2.5 }, minHeight: 48 }}>
        <Typography id="categories-heading" component="h2" variant="subtitle1">Por categoria</Typography>
        <Typography variant="body2" color="text.secondary">{formatBRL(totalExpense)}</Typography>
      </Box>

      {visible.map(([name, amount], i) => {
        const { Icon } = categoryVisual(name, categories);
        return (
          <ButtonBase
            key={name}
            onClick={() => onSelectCategory?.(name)}
            sx={{ width: '100%', minHeight: 56, px: { xs: 2, sm: 2.5 }, gap: 1.5, alignItems: 'center', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Icon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography variant="body2" fontWeight={600} noWrap>{name}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                  <Box component="span" sx={{ fontWeight: 600 }}>{formatBRL(amount)}</Box>
                  <Box component="span" sx={{ color: 'text.secondary', display: 'inline-block', minWidth: '4.5em', textAlign: 'right' }}>
                    {formatPercent(amount / totalExpense)}
                  </Box>
                </Typography>
              </Box>
              <Box sx={{ mt: 0.75, height: 2, width: `${(amount / largest) * 100}%`, bgcolor: i === 0 ? 'text.primary' : 'text.secondary', opacity: i === 0 ? 1 : 0.5 }} />
            </Box>
          </ButtonBase>
        );
      })}

      {collapsible && (
        <ButtonBase
          onClick={() => setShowAll(v => !v)}
          aria-expanded={showAll}
          sx={{ width: '100%', minHeight: 56, px: { xs: 2, sm: 2.5 }, gap: 1.5, justifyContent: 'flex-start', '&:hover': { bgcolor: 'action.hover' } }}
        >
          <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary', transform: showAll ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, textAlign: 'left' }}>
            {showAll ? 'Mostrar menos' : `Outras ${rest.length} categorias`}
          </Typography>
          {!showAll && (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {formatBRL(restTotal)}
              <Box component="span" sx={{ display: 'inline-block', minWidth: '4.5em', textAlign: 'right' }}>{formatPercent(restTotal / totalExpense)}</Box>
            </Typography>
          )}
        </ButtonBase>
      )}
    </Card>
  );
}
