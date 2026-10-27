import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import './index.css'
import App from './App.jsx'
import { theme } from './theme'
import { queryClient, persister, CACHE_BUSTER, CACHE_MAX_AGE } from './queryClient'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { ConfirmProvider } from './components/ConfirmDialog.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: CACHE_BUSTER }}
      >
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
