/* ============================================================
   sw.js — Service Worker: cache offline + notificaciones
   ============================================================ */

const CACHE = 'dg444-v5';

const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/state.js',
  '/js/auth.js',
  '/js/onboarding.js',
  '/js/game.js',
  '/js/render.js',
  '/js/habits.js',
  '/js/rewards.js',
  '/js/categories.js',
  '/js/settings.js',
  '/js/notify.js',
  '/js/ux.js',
  '/js/rituals.js',
  '/js/share-card.js',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Nunca interceptar llamadas a la API
  if (url.pathname.startsWith('/api/')) return;

  // Google Fonts: stale-while-revalidate
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(request);
        const fetchP = fetch(request).then(res => {
          if (res.ok && !res.redirected) cache.put(request, res.clone());
          return res;
        }).catch(() => null);
        return cached || fetchP;
      })
    );
    return;
  }

  // Assets propios: cache-first con manejo seguro de redirects para iOS
  if (url.origin === location.origin) {
    event.respondWith(handleFetch(request));
  }
});

async function handleFetch(request) {
  // 1. Caché primero
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);

    // iOS Safari error fix: si la respuesta fue redirigida, re-fetchear la URL final
    // directamente para obtener una respuesta 200 sin redirect
    if (res.redirected) {
      const finalRes = await fetch(res.url);
      if (finalRes.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, finalRes.clone());
      }
      return finalRes;
    }

    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch (_) {
    // Sin conexión: servir index.html desde caché
    return caches.match('/index.html')
      || new Response('Sin conexión', { status: 503 });
  }
}

// Push → notificación nativa (app cerrada)
self.addEventListener('push', event => {
  let data = { title: 'DG444', body: 'Revisa tus hábitos de hoy 💪', url: '/' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'dg444-reminder',
      renotify: true,
      data: { url: data.url || '/' },
    })
  );
});

// Click en notificación → abrir app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
