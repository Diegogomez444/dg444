/* ============================================================
   app.js — Flujo de sesión + navegación + todos los action handlers
   ============================================================ */

import { getState, getActiveUser } from './state.js';
import { checkDayReset, checkVariableReward, checkBadgeUnlocks } from './game.js';
import { toast, xpPop, vibrate, HAPTIC, closeModal, initModalDismiss, showBadgeUnlocks } from './ux.js';
import { renderAll, setPage, getPage, setFilter, flashPenalty } from './render.js';
import {
  toggleHabit, openHabitModal, openHabitMenu, confirmDeleteHabit, deleteHabit,
  triggerMVH, confirmMVH, toggleKeystone,
} from './habits.js';
import { redeemReward, doRedeem, openRewardModal } from './rewards.js';
import { openManageCategories } from './categories.js';
import {
  toggleSetting, setPlayerName, setPhrasePack, openGoalsEditor,
  confirmReset, doReset, exportProgress, importProgress, enableNotifications,
} from './settings.js';
import { scheduleReminders, initStreakDanger, checkStreakDanger, subscribeToWebPush } from './notify.js';
import { signup, login, logout, restoreSession, listUsernames, validateUsername, getUserAvatar } from './auth.js';
import { startOnboarding } from './onboarding.js';
import {
  showNeverMissTwice, checkMorningIntention, checkSundayReview, showWeeklyReview,
} from './rituals.js';
import { shareCard } from './share-card.js';

let appWired = false;
let globalsWired = false;

// ============ INIT ============
function init() {
  initModalDismiss();
  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.classList.add('fade-out');
    setTimeout(() => splash.remove(), 500);
    route();
  }, 2200);
}

function route() {
  const acc = restoreSession();
  if (!acc) { showAuth(); return; }
  const s = getState();
  if (!s.onboarded) { showOnboarding(acc); return; }
  showApp({ runDayReset: true });
}

function hideAll() {
  ['auth', 'onboarding', 'app'].forEach(id => document.getElementById(id).classList.add('hidden'));
}

// ============ AUTH SCREEN ============
function showAuth(prefillUser = '') {
  hideAll();
  const el = document.getElementById('auth');
  el.classList.remove('hidden');
  let mode = 'login';

  function formHtml() {
    return mode === 'signup'
      ? `<div class="auth-field"><label>Usuario</label><input class="auth-input" id="auUser" autocomplete="username" maxlength="20" placeholder="elige_tu_usuario" value="${prefillUser}"/></div>
         <div class="auth-field"><label>Contraseña</label><input class="auth-input" id="auPass" type="password" autocomplete="new-password" placeholder="mínimo 4 caracteres"/></div>`
      : `<div class="auth-field"><label>Usuario</label><input class="auth-input" id="auUser" autocomplete="username" maxlength="20" placeholder="tu_usuario" value="${prefillUser}"/></div>
         <div class="auth-field"><label>Contraseña</label><input class="auth-input" id="auPass" type="password" autocomplete="current-password" placeholder="tu contraseña"/></div>`;
  }

  function accountsHtml() {
    const users = listUsernames();
    if (!users.length) return '';
    const chips = users.map(u => {
      const av = getUserAvatar(u);
      let avHtml;
      if (av && av.startsWith('data:')) {
        avHtml = `<img src="${av}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" alt=""/>`;
      } else {
        avHtml = `<span style="font-size:22px">${av || '👤'}</span>`;
      }
      return `<button class="auth-chip" data-user="${u}">${avHtml} ${u}</button>`;
    }).join('');
    return `<div class="auth-accounts">
      <div class="auth-accounts-label">CUENTAS EN ESTE DISPOSITIVO</div>
      <div class="auth-chips">${chips}</div>
    </div>`;
  }

  function paint() {
    el.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">DG<span>444</span></div>
        <div class="auth-tagline">HABIT &amp; LEVEL SYSTEM</div>
        <div class="auth-box">
          <div class="auth-tabs">
            <button class="auth-tab ${mode === 'login' ? 'active' : ''}" data-tab="login">Entrar</button>
            <button class="auth-tab ${mode === 'signup' ? 'active' : ''}" data-tab="signup">Crear cuenta</button>
          </div>
          <div id="authForm">${formHtml()}</div>
          <div class="auth-error" id="authError"></div>
          <button class="btn btn-primary btn-block" id="authSubmit">${mode === 'signup' ? 'Crear mi personaje 🚀' : 'Entrar'}</button>
          ${mode === 'login' ? accountsHtml() : ''}
        </div>
        <div class="auth-note">🔒 Todo se guarda solo en este dispositivo. Sin servidores.<br>Usa Ajustes → Exportar para llevar tu progreso a otro dispositivo.</div>
      </div>`;
    wireAuth();
  }

  function wireAuth() {
    el.querySelectorAll('.auth-tab').forEach(t =>
      t.addEventListener('click', () => { mode = t.dataset.tab; paint(); }));

    const submit = el.querySelector('#authSubmit');
    const err = el.querySelector('#authError');

    async function doSubmit() {
      const u = el.querySelector('#auUser').value.trim();
      const p = el.querySelector('#auPass').value;
      err.textContent = '';
      submit.disabled = true;
      try {
        if (mode === 'signup') {
          const ve = validateUsername(u);
          if (ve) throw new Error(ve);
          const acc = await signup(u, p, u);
          showOnboarding(acc);
        } else {
          const acc = await login(u, p);
          const s = getState();
          if (!s.onboarded) showOnboarding(acc); else showApp({ runDayReset: true });
        }
      } catch (e) { err.textContent = e.message || 'Error'; submit.disabled = false; }
    }

    submit.addEventListener('click', doSubmit);
    el.querySelectorAll('#auUser, #auPass').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') doSubmit(); }));
    el.querySelectorAll('[data-user]').forEach(c => c.addEventListener('click', () => {
      el.querySelector('#auUser').value = c.dataset.user;
      el.querySelector('#auPass').focus();
    }));
  }

  paint();
}

// ============ ONBOARDING ============
function showOnboarding(acc) {
  hideAll();
  document.getElementById('onboarding').classList.remove('hidden');
  startOnboarding(acc, () => showApp({ runDayReset: false }));
}

// ============ APP ============
function showApp({ runDayReset }) {
  hideAll();
  document.getElementById('app').classList.remove('hidden');
  document.querySelectorAll('.navbtn').forEach(b => b.classList.toggle('active', b.dataset.page === 'dashboard'));
  setPage('dashboard');
  setFilter('all');

  let reset = { changed: false, missedHabits: [] };
  if (runDayReset) {
    reset = checkDayReset();
  } else {
    checkVariableReward();
  }

  renderAll();

  // Feedback de penalización / racha rota
  if (reset.changed) {
    setTimeout(() => {
      if (reset.freezeUsed) {
        toast(`🧊 ¡Freeze usado! Tu racha de ${getState().streak} días se salvó.`, 'success');
      } else if (reset.recoveryCompleted) {
        xpPop(0); vibrate(HAPTIC.perfect);
        toast('🔄 ¡Racha recuperada! ¡Regreso épico!', 'success');
      } else if (reset.recoveryStarted) {
        toast(`💪 Racha rota. Tienes 7 días para recuperarla: completa ${3} días seguidos.`, 'error');
      } else if (reset.streakBroken) {
        toast('Tu racha se rompió. ¡A reconstruir! 🔥', 'error');
      }
      if (reset.penaltyPoints > 0) {
        flashPenalty();
        xpPop(-reset.penaltyPoints);
        vibrate(HAPTIC.error);
        toast(`Perdiste ${reset.penalized} hábito${reset.penalized === 1 ? '' : 's'} ayer (−${reset.penaltyPoints} XP)`, 'error');
      }
      if (reset.leveledUp) {
        toast(`🎖️ ¡SUBISTE AL NIVEL ${reset.newLevel}!`, 'success');
      }
    }, 800);

    // "Nunca Falles Dos Veces"
    if (reset.missedHabits?.length) {
      setTimeout(() => showNeverMissTwice(reset.missedHabits), 3000);
    }

    // Badges desbloqueados por la racha / XP del día anterior
    const newBadges = checkBadgeUnlocks();
    if (newBadges.length) setTimeout(() => showBadgeUnlocks(newBadges), 4500);
  }

  // Rituales diarios
  checkMorningIntention();
  checkSundayReview();

  if (!appWired) { wireNav(); wireActions(); appWired = true; }
  if (!globalsWired) {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !document.getElementById('app').classList.contains('hidden')) {
        const r = checkDayReset();
        if (r.changed) { renderAll(); if (r.missedHabits?.length) setTimeout(() => showNeverMissTwice(r.missedHabits), 1000); }
        checkStreakDanger();
      }
    });
    registerSW();
    globalsWired = true;
  }
  initStreakDanger();
  scheduleReminders();

  // Auto-suscribir a Web Push si ya tiene permiso concedido (silencioso, sin popup)
  if (Notification?.permission === 'granted') {
    subscribeToWebPush().catch(() => {}); // silencioso — no bloquear si falla
  }
}

// ---------- Navegación ----------
function wireNav() {
  document.querySelectorAll('.navbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page === getPage()) return;
      document.querySelectorAll('.navbtn').forEach(b => b.classList.toggle('active', b === btn));
      setPage(page);
      if (page === 'habits') setFilter('all');
      vibrate(10);
      renderAll();
    });
  });
}

// ---------- Delegación de acciones ----------
function wireActions() {
  document.body.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const id = el.dataset.id;

    switch (action) {
      // Hábitos
      case 'toggle':               toggleHabit(id, e); break;
      case 'mvh':                  triggerMVH(id, e); break;
      case 'confirm-mvh':          confirmMVH(id, e); break;
      case 'habit-menu':           openHabitMenu(id); break;
      case 'edit-habit':           closeModal(); openHabitModal(id); break;
      case 'delete-habit':         closeModal(); confirmDeleteHabit(id); break;
      case 'delete-habit-confirm': deleteHabit(id); break;
      case 'new-habit':            openHabitModal(); break;
      case 'mvh-menu':             closeModal(); triggerMVH(id, e); break;
      case 'toggle-keystone':      toggleKeystone(id); break;
      case 'filter':               setFilter(el.dataset.cat); renderAll(); break;
      case 'manage-cats':          openManageCategories(); break;

      // Recompensas
      case 'redeem':               redeemReward(id); break;
      case 'redeem-confirm':       doRedeem(id); break;
      case 'new-reward':           openRewardModal(); break;

      // Settings
      case 'toggle-setting':       toggleSetting(el.dataset.key); break;
      case 'set-pack':             setPhrasePack(el.dataset.pack); break;
      case 'edit-goals':           openGoalsEditor(); break;
      case 'reset':                confirmReset(); break;
      case 'reset-confirm':        doReset(); break;
      case 'export':               exportProgress(); break;
      case 'import':               importProgress(); break;
      case 'notify-perm':          enableNotifications(); break;

      // Rituales y stats
      case 'share-card':           shareCard(); break;
      case 'weekly-review':        showWeeklyReview(); break;

      // Sesión
      case 'logout':               doLogout(); break;
      case 'switch-account':       doLogout(); break;

      case 'close-modal':          closeModal(); break;
    }
  });

  document.body.addEventListener('change', e => {
    if (e.target.id === 'playerNameInput') {
      setPlayerName(e.target.value);
      renderAll();
      toast('Nombre actualizado ✓', 'success');
    }
  });
}

function doLogout() { closeModal(); logout(); showAuth(); }

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW falló', err));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
