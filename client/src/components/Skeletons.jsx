import React from 'react';
import { Box, Card, Skeleton } from '@mui/material';

// Formato das telas enquanto os dados chegam, no lugar de um círculo girando.

export function OverviewSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} aria-busy="true" aria-label="Carregando resumo">
      <Card sx={{ p: { xs: 2, sm: 3 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 2.5, md: 6 } }}>
        <Box>
          <Skeleton width={150} height={20} />
          <Skeleton width={210} height={40} />
          <Skeleton width={240} height={20} />
        </Box>
        <Box>
          <Skeleton width="100%" height={20} />
          <Skeleton variant="rectangular" height={8} sx={{ my: 1.25 }} />
          <Skeleton width="60%" height={18} />
          <Skeleton variant="rectangular" height={48} sx={{ mt: 2 }} />
        </Box>
      </Card>
      <Card sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '1px', bgcolor: 'divider' }}>
        {[0, 1, 2, 3].map(i => (
          <Box key={i} sx={{ bgcolor: 'background.paper', px: 2.5, py: 2 }}>
            <Skeleton width={90} height={20} />
            <Skeleton width={120} height={28} />
          </Box>
        ))}
      </Card>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {[0, 1].map(card => (
          <Card key={card} sx={{ py: 1, px: 2.5 }}>
            <Skeleton width={140} height={28} sx={{ my: 1 }} />
            {[0, 1, 2].map(i => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 56 }}>
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" />
                  <Skeleton width="35%" />
                </Box>
                <Skeleton width={80} />
              </Box>
            ))}
          </Card>
        ))}
      </Box>
    </Box>
  );
}

export function ListSkeleton({ rows = 7 }) {
  return (
    <Card aria-busy="true" aria-label="Carregando lançamentos">
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Skeleton variant="rounded" height={44} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[64, 72, 80, 110].map(w => <Skeleton key={w} variant="rounded" width={w} height={36} />)}
        </Box>
      </Box>
      {Array.from({ length: rows }, (_, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.25, minHeight: 68, borderTop: '1px solid', borderColor: 'divider' }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width={`${55 + ((i * 17) % 35)}%`} />
            <Skeleton width="40%" />
          </Box>
          <Skeleton width={72} />
        </Box>
      ))}
    </Card>
  );
}

export function InstallmentsSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} aria-busy="true" aria-label="Carregando parcelas">
      <Skeleton variant="rounded" height={120} />
      {[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={150} />)}
    </Box>
  );
}
