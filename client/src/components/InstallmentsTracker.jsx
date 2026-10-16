import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Divider,
  Stack
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CreditCardIcon from '@mui/icons-material/CreditCard';

export function InstallmentsTracker({ installments = [], currentMonth = '2026-10' }) {
  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (!installments || installments.length === 0) {
    return (
      <Card sx={{ p: 6, textAlign: 'center' }}>
        <LayersIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
        <Typography variant="body1" fontWeight={600} color="text.secondary">
          Nenhum parcelamento ativo encontrado.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Ao registrar compras com parcelas (ex: 1/10), elas aparecerão aqui automaticamente.
        </Typography>
      </Card>
    );
  }

  const totalInstallmentsDebt = installments.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalMonthlyCommitment = installments.reduce((acc, curr) => acc + (curr.amountPerInstallment || 0), 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Resumo Geral de Parcelas */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ borderColor: 'rgba(245, 158, 11, 0.2)' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Impacto Mensal dos Parcelamentos
                  </Typography>
                  <Typography variant="h5" color="warning.main" sx={{ mt: 1, fontWeight: 700 }}>
                    {formatBRL(totalMonthlyCommitment)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total das parcelas devidas neste mês
                  </Typography>
                </div>
                <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(245, 158, 11, 0.1)', color: 'warning.main' }}>
                  <CalendarMonthIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card sx={{ borderColor: 'rgba(99, 102, 241, 0.2)' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Valor Total Contratado em Parcelas
                  </Typography>
                  <Typography variant="h5" color="info.light" sx={{ mt: 1, fontWeight: 700 }}>
                    {formatBRL(totalInstallmentsDebt)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {installments.length} compras parceladas ativas
                  </Typography>
                </div>
                <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(99, 102, 241, 0.1)', color: 'info.main' }}>
                  <LayersIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cards de Cada Parcela Ativa */}
      <Grid container spacing={2}>
        {installments.map((item, idx) => {
          const current = item.currentInstallment || 1;
          const total = item.totalInstallments || 1;
          const percentage = Math.min(100, Math.round((current / total) * 100));
          const remaining = Math.max(0, total - current);
          const remainingDebt = item.amountPerInstallment * remaining;

          return (
            <Grid item xs={12} md={6} key={idx}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <div>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {item.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <CreditCardIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {item.account} • {item.category}
                        </Typography>
                      </Box>
                    </div>

                    <Chip
                      label={`Parcela ${current} de ${total}`}
                      size="small"
                      color="info"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>

                  {/* Barra de Progresso */}
                  <Box sx={{ mt: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Progresso de Quitação
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {percentage}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      color="info"
                      sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.08)' }}
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Valores Detalhados */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Valor da Parcela
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {formatBRL(item.amountPerInstallment)}
                      </Typography>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Restam
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="warning.main">
                        {remaining} {remaining === 1 ? 'mês' : 'meses'}
                      </Typography>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Saldo Devedor
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="text.secondary">
                        {formatBRL(remainingDebt)}
                      </Typography>
                    </div>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
