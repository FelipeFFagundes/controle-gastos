// Cliente do React Query com o cache guardado no aparelho (stale-while-revalidate):
// ao abrir o app, os dados da última visita aparecem na hora e a versão nova é buscada em seguida.
// O cache é apagado ao bloquear o app ou quando a sessão expira (ver clearPersistedData).
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const CACHE_KEY = 'gastos-cache';
// Mude ao alterar o formato das respostas da API, para descartar caches antigos.
export const CACHE_BUSTER = 'v1';
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => error?.status !== 401 && error?.status !== 400 && count < 2,
      refetchOnWindowFocus: true,
      gcTime: CACHE_MAX_AGE
    }
  }
});

function safeStorage() {
  try {
    const probe = '__probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return undefined; // modo privado ou armazenamento bloqueado: o app funciona sem cache
  }
}

export const persister = createSyncStoragePersister({ storage: safeStorage(), key: CACHE_KEY, throttleTime: 1000 });

export function clearPersistedData() {
  queryClient.clear();
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignora
  }
}
