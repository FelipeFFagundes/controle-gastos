import React from 'react';
import { Box } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import SavingsIcon from '@mui/icons-material/Savings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CategoryIcon from '@mui/icons-material/Category';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckIcon from '@mui/icons-material/Check';

// Os nomes de ícone gravados nas categorias vêm da versão antiga (lucide); aqui viram ícones do MUI.
const ICONS = {
  Utensils: RestaurantIcon,
  Bike: DirectionsBikeIcon,
  ShoppingBag: ShoppingBagIcon,
  FileText: ReceiptLongIcon,
  BookOpen: MenuBookIcon,
  HeartPulse: LocalHospitalIcon,
  PiggyBank: SavingsIcon,
  TrendingUp: TrendingUpIcon,
  Layers: CategoryIcon
};

const TRANSFER = { color: '#7D8B86', Icon: SwapHorizIcon };

export function categoryVisual(categoryName, categories = [], type = 'expense') {
  if (type === 'transfer') return TRANSFER;
  const category = categories.find(c => c.name === categoryName);
  return { color: category?.color || '#7D8B86', Icon: ICONS[category?.icon] || CategoryIcon };
}

// Círculo com o ícone e a cor da categoria. `paid` mostra um selo de "pago".
export function CategoryAvatar({ category, categories, type, size = 40, paid = false }) {
  const { color, Icon } = categoryVisual(category, categories, type);
  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: `${color}26`,
        color
      }}
    >
      <Icon sx={{ fontSize: size * 0.5 }} />
      {paid && (
        <Box
          sx={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            bgcolor: 'secondary.main',
            color: '#fff',
            border: '2px solid',
            borderColor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CheckIcon sx={{ fontSize: 12 }} />
        </Box>
      )}
    </Box>
  );
}
