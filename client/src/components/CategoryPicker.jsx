import React from 'react';
import { Box, ButtonBase, SwipeableDrawer, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { CategoryAvatar } from './CategoryAvatar';

// Folha que sobe de baixo para trocar a categoria de um lançamento com um toque.
// Fecha arrastando para baixo (SwipeableDrawer), tocando fora ou com o botão voltar.
// No iOS o gesto de voltar do navegador conflita com o arrasto a partir da borda: por isso disableDiscovery.
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
export function CategoryPicker({ transaction, categories = [], onSelect, onClose }) {
  const options = categories.filter(c => c.name !== 'Salário & Entradas');

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={Boolean(transaction)}
      onClose={onClose}
      onOpen={() => {}}
      disableSwipeToOpen
      disableDiscovery={isIOS}
      disableBackdropTransition={!isIOS}
      ModalProps={{ keepMounted: false }}
      slotProps={{ paper: {
        sx: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '80vh',
          pb: 'calc(8px + env(safe-area-inset-bottom))'
        }
      } }}
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
                  bgcolor: selected ? 'action.selected' : 'transparent'
                }}
              >
                <CategoryAvatar category={category.name} categories={categories} size={36} />
                <Typography variant="body1" sx={{ flex: 1, textAlign: 'left' }}>{category.name}</Typography>
                {selected && <CheckIcon sx={{ color: 'accent.main' }} />}
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </SwipeableDrawer>
  );
}
