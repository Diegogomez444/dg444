// api/cron.js — Envía notificaciones push a todos los suscriptores
// Se dispara automáticamente por Vercel Cron en horarios de Bogotá (UTC-5)
import { kv } from '@vercel/kv';
import webpush from 'web-push';

webpush.setVapidDetails(
  `mailto:${process.env.CONTACT_EMAIL || 'hola@dg444.app'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

// Hora actual en Colombia (UTC-5)
function bogotaHour() {
  return (new Date().getUTCHours() + 24 - 5) % 24;
}

// Mensajes según hora del día
const MESSAGES = {
  8:  { title: 'DG444 ⚡', body: '¡Buenos días! Ya es hora de arrancar tus hábitos.' },
  12: { title: 'DG444 💪', body: 'Mitad del día. ¿Cómo van tus hábitos? Todavía hay tiempo.' },
  19: { title: 'DG444 🔥', body: 'Quedan pocas horas. ¡No rompas la racha de hoy!' },
  21: { title: 'DG444 ⚠️', body: 'Son las 9PM. Último aviso antes de medianoche. ¡Entra ahora!' },
};

export default async function handler(req, res) {
  // Vercel agrega automáticamente el header Authorization con CRON_SECRET
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const hour = bogotaHour();
  const msg = MESSAGES[hour];
  if (!msg) return res.json({ skipped: true, hour, note: 'No hay mensaje para esta hora' });

  const subscribers = await kv.smembers('subscribers');
  if (!subscribers?.length) return res.json({ sent: 0, hour, note: 'Sin suscriptores' });

  let sent = 0, failed = 0, cleaned = 0;

  for (const userId of subscribers) {
    const subscription = await kv.get(`sub:${userId}`);
    if (!subscription) { cleaned++; await kv.srem('subscribers', userId); continue; }

    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ ...msg, url: 'https://dg444.vercel.app' }),
      );
      sent++;
    } catch (e) {
      failed++;
      // 410 = suscripción expirada (usuario desinstalió la app o revocó permisos)
      if (e.statusCode === 410 || e.statusCode === 404) {
        await kv.del(`sub:${userId}`);
        await kv.srem('subscribers', userId);
        cleaned++;
      }
    }
  }

  return res.json({ ok: true, sent, failed, cleaned, hour, total: subscribers.length });
}
