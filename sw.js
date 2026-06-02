/* ============================================================
   sw.js — Service Worker: cache offline + notificaciones
   ============================================================ */

const CACHE = 'dg444-v4'; // bumped — fuerza reinstalación limpia

const ASSETS = [
  // Sin './' — Vercel lo redirige a index.html y iOS cachea el redirect y se rompe
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

// Instalar: precachear app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: nunca cachear redirects (causa el error en iOS Safari)
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API endpoints: nunca interceptar
  if (url.pathname.startsWith('/api/')) return;

  // Google Fonts: stale-while-revalidate, sin cachear redirects
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then(res => {
          if (res.ok) cache.put(request, res.clone()); // solo cachear 200
          return res;
        }).catch(() => null);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Assets propios: cache-first, SOLO cachear respuestas 200 (nunca redirects)
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          // res.ok = status 200-299. Ignorar redirects (301/302) — iOS los rechaza
          if (res.ok) {
            caches.open(CACHE).then(c => c.put(request, res.clone()));
          }
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});

// Push del servidor → mostrar notificación (app cerrada/background)
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

// Click en notificación → enfocar/abrir app
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
