import React from 'react';
import { Card, Typography, Box, LinearProgress, ButtonBase } from '@mui/material';
import { CategoryAvatar, categoryVisual } from './CategoryAvatar';
import { formatBRL } from '../format';

// Gastos do mês por categoria. Tocar numa categoria abre a lista filtrada por ela.
export function CategoryBreakdown({ expensesByCategory = {}, categories = [], totalExpense = 0, onSelectCategory }) {
  const entries = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0 || totalExpense === 0) return null;

  return (
    <Card sx={{ p: { xs: 1, sm: 1.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 1, pt: 0.5, pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>Por categoria</Typography>
        <Typography variant="caption" color="text.secondary">toque para ver os lançamentos</Typography>
      </Box>

      {entries.map(([name, amount]) => {
        const { color } = categoryVisual(name, categories);
        const percentage = Math.round((amount / totalExpense) * 100);
        return (
          <ButtonBase
            key={name}
            onClick={() => onSelectCategory?.(name)}
            sx={{ width: '100%', minHeight: 60, px: 1, py: 1, borderRadius: '10px', gap: 1.5, alignItems: 'center' }}
          >
            <CategoryAvatar category={name} categories={categories} size={36} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
                <Typography variant="body2" fontWeight={600} noWrap>{name}</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                  {formatBRL(amount)} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>· {percentage}%</Box>
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={percentage}
                sx={{
                  height: 6,
                  borderRadius: '12px',
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: '12px' }
                }}
              />
            </Box>
          </ButtonBase>
        );
      })}
    </Card>
  );
}
