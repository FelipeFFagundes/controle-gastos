// Service Worker do PWA.
// - Arquivos do app: responde do cache na hora e atualiza em segundo plano (stale-while-revalidate).
//   Se a página principal mudou (novo deploy), avisa a aba para oferecer "Atualizar".
// - Arquivos com hash no nome (/assets/...) nunca mudam: cache primeiro.
// - A API nunca passa por aqui: os dados ficam com o React Query.
const CACHE_NAME = 'gastos-pwa-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

async function notifyUpdate() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage({ type: 'update-available' }));
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event, cacheKey) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(cacheKey);

  const network = fetch(event.request)
    .then(async (response) => {
      if (!response.ok) return response;
      if (cached && event.request.mode === 'navigate') {
        const [oldText, newText] = await Promise.all([cached.clone().text(), response.clone().text()]);
        if (oldText !== newText) notifyUpdate();
      }
      await cache.put(cacheKey, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  // Todas as rotas do app são a mesma página.
  const cacheKey = event.request.mode === 'navigate' ? '/' : event.request;
  event.respondWith(staleWhileRevalidate(event, cacheKey));
});
