/* ============================================================
   sw.js — Service Worker: cache offline + notificaciones
   ============================================================ */

const CACHE = 'dg444-v3';

const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/state.js',
  './js/auth.js',
  './js/onboarding.js',
  './js/game.js',
  './js/render.js',
  './js/habits.js',
  './js/rewards.js',
  './js/categories.js',
  './js/settings.js',
  './js/notify.js',
  './js/ux.js',
  './js/rituals.js',
  './js/share-card.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Instalar: precachear el app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first para assets propios, stale-while-revalidate para fuentes
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Google Fonts: cachear para modo offline
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(request);
        const network = fetch(request).then(res => { cache.put(request, res.clone()); return res; }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // App propio: cache-first con fallback a red
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});

// Recibir push del servidor y mostrar notificación (app cerrada/en background)
self.addEventListener('push', event => {
  let data = { title: 'DG444', body: 'Revisa tus hábitos de hoy 💪', url: '/' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'dg444-reminder',
      renotify: true,
      data: { url: data.url || '/' },
    })
  );
});

// Click en notificación: enfocar/abrir la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});
