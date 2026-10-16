import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Stack
} from '@mui/material';
import PieChartIcon from '@mui/icons-material/PieChart';

export function CategoryBreakdown({ expensesByCategory = {}, categories = [], totalExpense = 0 }) {
  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const categoryEntries = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);

  if (categoryEntries.length === 0 || totalExpense === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PieChartIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: 'text.secondary' }}>
              Distribuição por Categoria
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {categoryEntries.length} ativas
          </Typography>
        </Box>

        <Stack spacing={2}>
          {categoryEntries.map(([catName, amount]) => {
            const categoryObj = categories.find(c => c.name === catName);
            const color = categoryObj?.color || '#3b82f6';
            const percentage = Math.round((amount / totalExpense) * 100);

            return (
              <Box key={catName}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                    <Typography variant="body2" fontWeight={500}>
                      {catName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {formatBRL(amount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28, textAlign: 'right' }}>
                      {percentage}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  sx={{
                    height: 5,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: color,
                      borderRadius: 2.5
                    }
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
