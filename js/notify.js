/* ============================================================
   notify.js — Notificaciones de hábitos + banner de racha en peligro
   ============================================================ */

import { getState, getActiveUser } from './state.js';
import { todayHabits, isCompleted, dayCounts } from './game.js';

// Clave pública VAPID (pública — segura de exponer en el cliente)
const VAPID_PUBLIC_KEY = 'BPBRbvTEywSy_qSg2JqGVIvDfhb-UgCth2McNdntxR_kTtCAu1S989NsuGV3mJzej6cTl8KaVoQii4CP_-bHKE8';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

// Suscribirse a Web Push (notificaciones en background, app cerrada)
export async function subscribeToWebPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    const granted = await requestNotificationPermission();
    if (!granted) return false;

    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    // Si ya existe suscripción, renovar en el servidor de todas formas
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const userId = getActiveUser() || 'anon';
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, userId }),
    });

    return true;
  } catch (e) {
    console.warn('Web Push falló:', e);
    return false;
  }
}

function pendingCount() {
  const s = getState();
  return todayHabits(s).filter(h => !isCompleted(h.id, s)).length;
}

function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then(reg => reg.showNotification(title, {
        body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'dg444-reminder',
      }));
    } else {
      new Notification(title, { body, icon: 'icons/icon-192.png' });
    }
  } catch (e) { /* noop */ }
}

let reminderTimer = null;

// Recordatorios cada 2h entre 8AM y 10PM, solo si hay pendientes.
// (Mientras la pestaña/PWA esté viva. Para push real en background ver sw.js + backend.)
export function scheduleReminders() {
  const s = getState();
  if (reminderTimer) clearInterval(reminderTimer);
  if (!s.settings.remindersEnabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  let lastHourNotified = -1;
  reminderTimer = setInterval(() => {
    const now = new Date();
    const h = now.getHours();
    if (h < 8 || h > 22) return;
    // Disparar en horas pares (8,10,12,...,22)
    if (h % 2 !== 0 || h === lastHourNotified) return;
    const pending = pendingCount();
    if (pending > 0) {
      notify('DG444', `¡${getState().settings.playerName}! Tienes ${pending} hábito${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} hoy 💪`);
      lastHourNotified = h;
    }
  }, 60 * 1000); // revisa cada minuto
}

// ---------- Banner de racha en peligro ----------
let dangerTimer = null;
let dangerNotified = false;

export function initStreakDanger() {
  if (dangerTimer) clearInterval(dangerTimer);
  checkStreakDanger();
  dangerTimer = setInterval(checkStreakDanger, 10 * 60 * 1000); // cada 10 min

  document.getElementById('streakDangerClose').addEventListener('click', () => {
    document.getElementById('streakDanger').classList.add('hidden');
    sessionStorage.setItem('dg444_danger_dismissed', '1');
  });
}

export function checkStreakDanger() {
  const s = getState();
  const banner = document.getElementById('streakDanger');
  const dismissed = sessionStorage.getItem('dg444_danger_dismissed') === '1';

  const { done, total } = dayCounts(s);
  const pending = total - done;
  const hour = new Date().getHours();

  const danger =
    s.settings.streakWarningEnabled &&
    s.streak > 0 &&
    pending > 0 &&
    hour >= 21 && // 9PM
    !dismissed;

  if (danger) {
    document.getElementById('streakDangerText').innerHTML =
      `¡Racha de <b>${s.streak} días</b> en peligro! Te faltan <b>${pending}</b> hábito${pending === 1 ? '' : 's'}. Complétalos antes de medianoche.`;
    banner.classList.remove('hidden');
    // Notificación push (si hay permiso) — solo una vez por sesión de peligro
    if (!dangerNotified && Notification?.permission === 'granted') {
      notify('🔥 ¡Racha en peligro!', `Te faltan ${pending} hábitos para no perder tu racha de ${s.streak} días.`);
      dangerNotified = true;
    }
  } else {
    banner.classList.add('hidden');
    dangerNotified = false;
  }
}
