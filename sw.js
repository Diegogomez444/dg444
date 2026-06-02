/* ============================================================
   sw.js — Service Worker minimal
   Solo maneja push notifications. Sin interceptar fetch.
   (El fetch cache causaba el error de redirects en iOS Safari)
   ============================================================ */

const CACHE = 'dg444-v6';

self.addEventListener('install', event => {
  // Tomar control inmediatamente, sin precaché
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  // Limpiar todos los caches viejos que causaban el error en iOS
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// SIN listener de fetch — el navegador maneja todo directamente.
// Esto elimina el error "Response served by service worker has redirections" en iOS.

// Push del servidor → mostrar notificación (app cerrada/background)
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

// Click en notificación → abrir/enfocar la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
