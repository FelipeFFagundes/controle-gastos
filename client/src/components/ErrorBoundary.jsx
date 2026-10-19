import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            bgcolor: '#090e17',
            color: '#f8fafc'
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 4,
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              borderRadius: 3,
              bgcolor: '#111927',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Ocorreu um erro inesperado na tela
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {this.state.error?.message || 'Algo inesperado aconteceu ao renderizar este componente.'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={this.handleReload}
              sx={{ textTransform: 'none', px: 3, py: 1 }}
            >
              Recarregar Aplicativo
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
