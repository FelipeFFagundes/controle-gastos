import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline, ThemeProvider } from '@mui/material'
import './index.css'
import App from './App.jsx'
import { theme } from './theme'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { ConfirmProvider } from './components/ConfirmDialog.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => error?.status !== 401 && error?.status !== 400 && count < 2,
      refetchOnWindowFocus: true
    }
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
