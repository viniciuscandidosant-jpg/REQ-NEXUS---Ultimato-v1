// NEXUS Requisições — Service Worker
// Estratégia: NUNCA cachear código (index.html) nem dados (Supabase).
// O shell visual (logo/ícones) fica em cache apenas para exibição offline.
// Bump o CACHE_NAME sempre que quiser forçar limpeza total nos clientes.
const CACHE_NAME = 'nexus-req-v2';
const APP_SHELL = [
  './manifest.webmanifest',
  './logo-ilha.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Permite que a página mande o SW ativar na hora
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // NUNCA intercepta chamadas ao Supabase nem a outras APIs externas:
  // deixa passar direto pra rede, sempre em tempo real.
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) {
    return;
  }

  // Navegação e o próprio HTML/JS: SEMPRE rede primeiro (código nunca vem de cache).
  // Só cai no cache se estiver realmente offline.
  const isDocument = req.mode === 'navigate' ||
                     url.pathname.endsWith('/') ||
                     url.pathname.endsWith('index.html');
  if (isDocument) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Estáticos visuais (logo, ícones, manifest): rede primeiro, cache como fallback offline.
  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
