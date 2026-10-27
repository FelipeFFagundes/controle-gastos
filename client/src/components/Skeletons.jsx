import React from 'react';
import { Box, Card, Skeleton } from '@mui/material';

// Formato das telas enquanto os dados chegam, no lugar de um círculo girando.

export function OverviewSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} aria-busy="true" aria-label="Carregando resumo">
      <Card sx={{ p: 2.25 }}>
        <Skeleton width={150} height={22} />
        <Skeleton width={210} height={52} />
        <Skeleton width={180} height={20} />
        <Skeleton variant="rounded" height={8} sx={{ mt: 2 }} />
        <Skeleton variant="rounded" height={52} sx={{ mt: 2 }} />
      </Card>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        {[0, 1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={74} />)}
      </Box>
      <Card sx={{ p: 1.5 }}>
        <Skeleton width={140} height={28} sx={{ mb: 1 }} />
        {[0, 1, 2].map(i => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25 }}>
            <Skeleton variant="circular" width={12} height={12} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="60%" />
              <Skeleton width="35%" />
            </Box>
            <Skeleton width={80} />
          </Box>
        ))}
      </Card>
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
