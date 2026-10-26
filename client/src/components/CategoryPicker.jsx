import React from 'react';
import { Box, ButtonBase, Drawer, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { CategoryAvatar } from './CategoryAvatar';

// Folha que sobe de baixo para trocar a categoria de um lançamento com um toque.
export function CategoryPicker({ transaction, categories = [], onSelect, onClose }) {
  const options = categories.filter(c => c.name !== 'Salário & Entradas');

  return (
    <Drawer
      anchor="bottom"
      open={Boolean(transaction)}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '80vh',
          pb: 'calc(8px + env(safe-area-inset-bottom))'
        }
      }}
    >
      {transaction && (
        <Box sx={{ pt: 1 }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mb: 1.5 }} />
          <Box sx={{ px: 2.5, pb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>Categoria</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>{transaction.description}</Typography>
            <Typography variant="caption" color="text.secondary">
              A escolha vale também para as próximas compras desta loja.
            </Typography>
          </Box>
          {options.map(category => {
            const selected = category.name === transaction.category;
            return (
              <ButtonBase
                key={category.id}
                onClick={() => onSelect(transaction, category.name)}
                sx={{
                  width: '100%',
                  minHeight: 56,
                  px: 2.5,
                  gap: 2,
                  justifyContent: 'flex-start',
                  bgcolor: selected ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                }}
              >
                <CategoryAvatar category={category.name} categories={categories} size={36} />
                <Typography variant="body1" sx={{ flex: 1, textAlign: 'left' }}>{category.name}</Typography>
                {selected && <CheckIcon color="primary" />}
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </Drawer>
  );
}
