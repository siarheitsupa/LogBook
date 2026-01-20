const CACHE_NAME = 'driverlog-pro-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Кэшируем только критические файлы, не падаем если иконок нет
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('SW: Cache addAll warning', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Для API запросов и Supabase используем только сеть
  if (event.request.url.includes('supabase.co') || event.request.url.includes('google')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Если это картинка (иконка), которой нет, возвращаем пустой ответ вместо 404
        if (event.request.destination === 'image') {
          return new Response('', { status: 404 });
        }
      });
    })
  );
});