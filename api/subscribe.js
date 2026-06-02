// api/subscribe.js — Guarda/elimina suscripción de push por usuario
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { subscription, userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId requerido' });

  if (req.method === 'DELETE') {
    await kv.del(`sub:${userId}`);
    await kv.srem('subscribers', userId);
    return res.json({ ok: true, action: 'unsubscribed' });
  }

  if (req.method !== 'POST') return res.status(405).end();
  if (!subscription) return res.status(400).json({ error: 'subscription requerida' });

  // TTL de 1 año — se renueva cada vez que el usuario abre la app
  await kv.set(`sub:${userId}`, subscription, { ex: 365 * 24 * 60 * 60 });
  await kv.sadd('subscribers', userId);

  return res.json({ ok: true, action: 'subscribed' });
}
