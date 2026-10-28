import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import './index.css'
import App from './App.jsx'
import { ThemeModeProvider } from './themeMode.jsx'
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
        <ThemeModeProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ThemeModeProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
