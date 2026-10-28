import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import { api, saveToken } from '../api';

export function PinLockScreen({ onUnlock }) {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  // Manipular clique nos números virtuais ou teclado
  const handleDigit = (digit) => {
    if (loading) return;
    setError('');
    const firstEmptyIndex = pin.findIndex(d => d === '');
    if (firstEmptyIndex !== -1) {
      const nextPin = [...pin];
      nextPin[firstEmptyIndex] = String(digit);
      setPin(nextPin);

      // Se preencheu o 6º dígito, dispara a validação automaticamente
      if (firstEmptyIndex === 5) {
        submitPin(nextPin.join(''));
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setError('');
    // Acha o último preenchido
    let lastFilledIndex = -1;
    for (let i = pin.length - 1; i >= 0; i--) {
      if (pin[i] !== '') {
        lastFilledIndex = i;
        break;
      }
    }
    if (lastFilledIndex !== -1) {
      const nextPin = [...pin];
      nextPin[lastFilledIndex] = '';
      setPin(nextPin);
    }
  };

  const handleClear = () => {
    if (loading) return;
    setPin(['', '', '', '', '', '']);
    setError('');
  };

  // Escuta teclado físico também (desktop ou mobile com teclado)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading]);

  const submitPin = async (fullPin) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.login(fullPin);
      saveToken(data.token, data.expiresAt);
      onUnlock();
    } catch (err) {
      triggerError(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    setPin(['', '', '', '', '', '']);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 400,
          overflow: 'hidden',
          animation: shake ? 'shake 0.4s ease-in-out' : 'none',
          '@keyframes shake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '20%, 60%': { transform: 'translateX(-10px)' },
            '40%, 80%': { transform: 'translateX(10px)' }
          }
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
          {/* Ícone e Cabeçalho */}
          <LockOutlinedIcon sx={{ fontSize: 28, color: 'accent.main', display: 'block', mx: 'auto', mb: 2 }} />

          <Typography variant="h6" fontWeight={800} letterSpacing={-0.3} gutterBottom>
            Acesso Protegido
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Digite seu PIN de 6 dígitos para acessar o controle financeiro.
          </Typography>

          {/* Indicadores Visuais das Bolinhas do PIN */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.75, mb: 3 }}>
            {pin.map((digit, idx) => {
              const isFilled = digit !== '';
              return (
                <Box
                  key={idx}
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: isFilled ? 'accent.main' : 'control.main',
                    bgcolor: isFilled ? 'accent.main' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                />
              );
            })}
          </Box>

          {/* Mensagem de Erro */}
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.8rem', py: 0.5 }}>
              {error}
            </Alert>
          )}

          {/* Teclado Numérico Estilo App de Banco */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1.5,
              maxWidth: 290,
              margin: '0 auto',
              mt: 1
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outlined"
                onClick={() => handleDigit(num)}
                disabled={loading}
                sx={{
                  height: 56,
                  borderRadius: 3,
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: 'text.primary',
                  borderColor: 'action.selected',
                  bgcolor: 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected',
                    borderColor: 'accent.main'
                  },
                  '&:active': {
                    transform: 'scale(0.96)'
                  }
                }}
              >
                {num}
              </Button>
            ))}

            {/* Botão Limpar */}
            <Button
              variant="text"
              onClick={handleClear}
              disabled={loading}
              sx={{
                height: 56,
                borderRadius: 3,
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase'
              }}
            >
              Limpar
            </Button>

            {/* Número 0 */}
            <Button
              variant="outlined"
              onClick={() => handleDigit(0)}
              disabled={loading}
              sx={{
                height: 56,
                borderRadius: 3,
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'text.primary',
                borderColor: 'action.selected',
                bgcolor: 'action.hover',
                '&:hover': {
                  bgcolor: 'action.selected',
                  borderColor: 'accent.main'
                },
                '&:active': {
                  transform: 'scale(0.96)'
                }
              }}
            >
              0
            </Button>

            {/* Botão Backspace / Apagar */}
            <IconButton
              onClick={handleBackspace}
              disabled={loading}
              sx={{
                height: 56,
                borderRadius: 3,
                color: 'text.secondary',
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'transparent',
                '&:hover': {
                  bgcolor: 'action.selected',
                  color: 'error.light'
                }
              }}
            >
              <BackspaceOutlinedIcon />
            </IconButton>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                Verificando PIN...
              </Typography>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 3, fontSize: '0.8125rem' }}>
            Sessão salva por 30 dias neste dispositivo
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
