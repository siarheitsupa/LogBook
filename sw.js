const CACHE_NAME = 'driverlog-v1';

// На данном этапе мы просто обеспечиваем "устанавливаемость" приложения.
// Service Worker перехватывает запросы, чтобы гарантировать корректную загрузку оболочки.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Для навигационных запросов (переход по URL) всегда пробуем вернуть index.html, 
  // если запрос не к ассету (скрипту, картинке).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
  }
});