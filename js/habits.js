/* ============================================================
   habits.js — CRUD de hábitos + toggle (full / MVH) + keystone
   ============================================================ */

import {
  getState, saveState, getDayCode, XP_PER_LEVEL,
} from './state.js';
import {
  todayHabits, isCompleted, isMVH, dayCounts, habitXP, bumpWeekData, applyXP, checkBadgeUnlocks,
} from './game.js';
import { XP_PERFECT_BONUS } from './state.js';
import { toast, xpPop, confetti, vibrate, HAPTIC, openModal, closeModal, EMOJI_OPTIONS, showBadgeUnlocks } from './ux.js';
import { renderAll, flashPenalty } from './render.js';

const DAY_ORDER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const escAttr = s => String(s).replace(/"/g, '&quot;');
const escHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---------- Toggle (full o mvh) ----------
export function toggleHabit(id, evt, mode = 'full') {
  const s = getState();
  const habit = s.habits.find(h => h.id === id);
  if (!habit) return;

  const code = getDayCode();
  const isToday = habit.days.includes(code);
  if (!isToday) { toast('Este hábito no está programado para hoy', 'error'); return; }

  const wasDone = isCompleted(id, s);
  const rect = evt?.target?.getBoundingClientRect?.();
  const x = rect ? rect.left + rect.width / 2 : undefined;
  const y = rect ? rect.top : undefined;

  if (wasDone) {
    // Undo: descontar XP del modo en que se completó
    const prevMode = s.completedToday[id];
    const xpDelta = prevMode === 'mvh' ? -25 : -habitXP(habit, 'full');
    delete s.completedToday[id];
    s.totalPoints += xpDelta;
    s.totalCompleted = Math.max(0, s.totalCompleted - 1);
    bumpWeekData(-1);
    // Descontar de identity
    s.habitCompletions[id] = Math.max(0, (s.habitCompletions[id] || 0) - 1);
    s.categoryCompletions[habit.cat] = Math.max(0, (s.categoryCompletions[habit.cat] || 0) - 1);
    saveState();
    xpPop(xpDelta, x, y);
    vibrate(20);
  } else {
    // Completar — calcular XP
    let xp = habitXP(habit, mode);
    let bonusMsg = '';

    // Variable reward 2x
    const isLucky = s.variableRewardHabitId === id;
    if (isLucky) { xp *= 2; bonusMsg = ' 🎲 ¡DOBLE!'; }

    // Keystone bonus (si es el keystone y no se había completado hoy)
    let keystoneBonus = 0;
    if (habit.isKeystone && !s.keystoneCompleted) {
      keystoneBonus = 100;
      s.keystoneCompleted = true;
    }

    s.completedToday[id] = mode;
    s.totalPoints += xp + keystoneBonus;
    s.totalCompleted += 1;
    bumpWeekData(1);

    // Actualizar identity
    s.habitCompletions[id] = (s.habitCompletions[id] || 0) + 1;
    s.categoryCompletions[habit.cat] = (s.categoryCompletions[habit.cat] || 0) + 1;

    saveState();
    xpPop(xp + keystoneBonus, x, y);
    vibrate(mode === 'mvh' ? 25 : HAPTIC.check);

    if (isLucky) toast(`🎲 ¡Día de suerte! ${habit.emoji} valió 2x XP${bonusMsg}`, 'success');
    if (keystoneBonus) setTimeout(() => xpPop(keystoneBonus, x, (y || 0) - 60), 400);

    // Animación burst
    const row = document.querySelector(`.habit[data-habit="${id}"]`);
    if (row) { row.classList.add('burst'); setTimeout(() => row.classList.remove('burst'), 350); }

    // Día perfecto
    const { done, total } = dayCounts(s);
    if (total > 0 && done === total) handlePerfectDay();

    // Badges nuevos
    const newBadges = checkBadgeUnlocks();
    if (newBadges.length) setTimeout(() => showBadgeUnlocks(newBadges), done === total ? 2000 : 800);
  }
  renderAll();
}

function handlePerfectDay() {
  const s = getState();
  const { leveledUp, newLevel } = applyXP(XP_PERFECT_BONUS);
  s.perfectDays += 1;
  saveState();
  vibrate(HAPTIC.perfect);
  confetti();
  setTimeout(() => xpPop(XP_PERFECT_BONUS), 300);

  const { total } = dayCounts(s);
  openModal(`
    <div class="celebrate">
      <div class="celebrate-crown">👑</div>
      <div class="celebrate-title">¡DÍA PERFECTO!</div>
      <div class="celebrate-sub">Así se construyen los imperios, ${escHtml(s.settings.playerName)}. Completaste todos tus hábitos de hoy.</div>
      <div class="celebrate-stats">
        <div><div class="celebrate-stat-val">${total}</div><div class="celebrate-stat-label">hábitos</div></div>
        <div><div class="celebrate-stat-val">+${XP_PERFECT_BONUS}</div><div class="celebrate-stat-label">XP bonus</div></div>
        <div><div class="celebrate-stat-val">${s.perfectDays}</div><div class="celebrate-stat-label">días perfectos</div></div>
      </div>
      ${leveledUp ? `<div class="levelup-banner">🎖️ ¡SUBISTE AL NIVEL ${newLevel}!</div>` : ''}
      <button class="btn btn-primary btn-block" data-action="close-modal">¡Brutal! 🔥</button>
    </div>
  `);
}

// ---------- Modal CREAR / EDITAR ----------
export function openHabitModal(editId = null) {
  const s = getState();
  const editing = editId ? s.habits.find(h => h.id === editId) : null;
  const keystoneExists = s.habits.some(h => h.isKeystone && h.id !== editId);

  const sel = {
    name: editing?.name || '',
    emoji: editing?.emoji || EMOJI_OPTIONS[0],
    days: editing ? [...editing.days] : [...DAY_ORDER],
    cat: editing?.cat || s.categories[0]?.id || 'salud',
    difficulty: editing?.difficulty || 'normal',
    anchor: editing?.anchor || '',
    mvh: editing?.mvh || '',
    isKeystone: editing?.isKeystone || false,
  };

  const diffBtns = ['easy', 'normal', 'hard'].map(d => {
    const labels = { easy: '😌 Fácil +30', normal: '⚡ Normal +50', hard: '🔥 Difícil +80' };
    return `<button class="day-opt ${sel.difficulty === d ? 'selected' : ''}" data-diff="${d}" style="flex:1">${labels[d]}</button>`;
  }).join('');

  const sheet = openModal(`
    <div class="modal-title">${editing ? 'Editar hábito' : 'Nuevo hábito'}</div>

    <div class="field">
      <label class="field-label">Nombre</label>
      <input class="field-input" id="hName" value="${escAttr(sel.name)}" maxlength="40" placeholder="Ej: Leer 10 páginas"/>
    </div>

    <div class="field">
      <label class="field-label">Emoji</label>
      <div class="emoji-picker" id="hEmoji">
        ${EMOJI_OPTIONS.map(e => `<button class="emoji-opt ${e === sel.emoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>`).join('')}
      </div>
    </div>

    <div class="field">
      <label class="field-label">Dificultad (XP que ganas)</label>
      <div class="day-picker" id="hDiff">${diffBtns}</div>
    </div>

    <div class="field">
      <label class="field-label">Días</label>
      <div class="day-picker" id="hDays">
        ${DAY_ORDER.map(d => `<button class="day-opt ${sel.days.includes(d) ? 'selected' : ''}" data-day="${d}">${d}</button>`).join('')}
      </div>
    </div>

    <div class="field">
      <label class="field-label">Categoría</label>
      <div class="cat-select" id="hCat">
        ${s.categories.map(c => `<button class="cat-opt ${c.id === sel.cat ? 'selected' : ''}" data-cat="${c.id}">${c.icon} ${escHtml(c.name.split(' ')[0])}</button>`).join('')}
      </div>
    </div>

    <div class="field">
      <label class="field-label">⚓ Ancla — ¿Después de qué lo harás? <span style="color:var(--text3)">(de James Clear, opcional)</span></label>
      <input class="field-input" id="hAnchor" value="${escAttr(sel.anchor)}" maxlength="50" placeholder="Ej: Después de lavarme los dientes..."/>
    </div>

    <div class="field">
      <label class="field-label">🆘 Versión de emergencia — modo 2 min <span style="color:var(--text3)">(de BJ Fogg, opcional)</span></label>
      <input class="field-input" id="hMvh" value="${escAttr(sel.mvh)}" maxlength="50" placeholder="Ej: Solo 5 minutos, 1 página..."/>
    </div>

    ${!keystoneExists || sel.isKeystone ? `
    <div class="field">
      <div class="setting-row" style="border-radius:11px;padding:12px 14px">
        <div class="setting-info">
          <div class="setting-name">⭐ Hábito Piedra Angular</div>
          <div class="setting-desc">El hábito que activa todos los demás. Solo puede haber uno. +100 XP bonus.</div>
        </div>
        <div class="toggle ${sel.isKeystone ? 'on' : ''}" id="hKeystone"></div>
      </div>
    </div>` : ''}

    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="close-modal">Cancelar</button>
      <button class="btn btn-primary" id="hSave">${editing ? 'Guardar' : 'Crear hábito'}</button>
    </div>
  `);

  sheet.querySelector('#hEmoji').addEventListener('click', e => {
    const b = e.target.closest('[data-emoji]'); if (!b) return;
    sheet.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected'); sel.emoji = b.dataset.emoji;
  });
  sheet.querySelector('#hDiff').addEventListener('click', e => {
    const b = e.target.closest('[data-diff]'); if (!b) return;
    sheet.querySelectorAll('[data-diff]').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected'); sel.difficulty = b.dataset.diff;
  });
  sheet.querySelector('#hDays').addEventListener('click', e => {
    const b = e.target.closest('[data-day]'); if (!b) return;
    const d = b.dataset.day;
    if (sel.days.includes(d)) { sel.days = sel.days.filter(x => x !== d); b.classList.remove('selected'); }
    else { sel.days.push(d); b.classList.add('selected'); }
  });
  sheet.querySelector('#hCat').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    sheet.querySelectorAll('.cat-opt').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected'); sel.cat = b.dataset.cat;
  });
  const ksToggle = sheet.querySelector('#hKeystone');
  if (ksToggle) ksToggle.addEventListener('click', () => {
    sel.isKeystone = !sel.isKeystone;
    ksToggle.classList.toggle('on', sel.isKeystone);
  });
  sheet.querySelector('#hSave').addEventListener('click', () => {
    const name = sheet.querySelector('#hName').value.trim();
    if (!name) { toast('Ponle un nombre al hábito', 'error'); return; }
    if (sel.days.length === 0) { toast('Selecciona al menos un día', 'error'); return; }
    sel.anchor = sheet.querySelector('#hAnchor').value.trim();
    sel.mvh = sheet.querySelector('#hMvh').value.trim();
    saveHabit({ id: editId, name, emoji: sel.emoji, days: sel.days, cat: sel.cat,
                difficulty: sel.difficulty, anchor: sel.anchor, mvh: sel.mvh, isKeystone: sel.isKeystone });
  });
}

function saveHabit({ id, name, emoji, days, cat, difficulty, anchor, mvh, isKeystone }) {
  const s = getState();
  if (isKeystone) s.habits.forEach(h => { if (h.id !== id) h.isKeystone = false; });
  if (id) {
    const h = s.habits.find(x => x.id === id);
    Object.assign(h, { name, emoji, days, cat, difficulty, anchor, mvh, isKeystone });
    toast('Hábito actualizado ✓', 'success');
  } else {
    s.habits.push({ id: String(Date.now()), name, emoji, days, cat, difficulty, anchor, mvh, isKeystone });
    toast('Hábito creado ✓', 'success');
  }
  saveState();
  closeModal();
  renderAll();
}

// ---------- Modo emergencia (MVH) ----------
export function triggerMVH(id, evt) {
  const s = getState();
  const h = s.habits.find(x => x.id === id);
  if (!h) return;
  if (isCompleted(id, s)) { toast('Ya completaste este hábito hoy', 'error'); return; }

  const mvhDesc = h.mvh || 'La versión más pequeña posible';
  openModal(`
    <div class="modal-title">🆘 Modo Emergencia</div>
    <div class="modal-subtitle">No hay excusas para el cero. Haz la versión mínima y protege tu racha.</div>
    <div class="mvh-card">
      <div class="mvh-habit-name">${h.emoji} ${escHtml(h.name)}</div>
      <div class="mvh-version">👉 ${escHtml(mvhDesc)}</div>
      <div class="mvh-xp">Solo +${25} XP, pero la racha sigue.</div>
    </div>
    <div class="modal-actions" style="margin-top:20px">
      <button class="btn btn-ghost" data-action="close-modal">Cancelar</button>
      <button class="btn btn-primary" data-action="confirm-mvh" data-id="${id}">✓ Lo hice</button>
    </div>
  `);
}

export function confirmMVH(id, evt) {
  closeModal();
  toggleHabit(id, evt, 'mvh');
}

// ---------- Menú contextual ----------
export function openHabitMenu(id) {
  const s = getState();
  const h = s.habits.find(x => x.id === id);
  if (!h) return;
  const ksLabel = h.isKeystone ? 'Quitar Piedra Angular' : 'Marcar como Piedra Angular ⭐';
  openModal(`
    <div class="modal-title">${h.emoji} ${escHtml(h.name)}</div>
    <div style="margin-top:12px">
      <div class="ctx-item" data-action="edit-habit" data-id="${id}"><span class="ctx-ico">✏️</span> Editar hábito</div>
      <div class="ctx-item" data-action="toggle-keystone" data-id="${id}"><span class="ctx-ico">⭐</span> ${ksLabel}</div>
      ${h.mvh ? `<div class="ctx-item" data-action="mvh-menu" data-id="${id}"><span class="ctx-ico">🆘</span> Usar modo emergencia</div>` : ''}
      <div class="ctx-item danger" data-action="delete-habit" data-id="${id}"><span class="ctx-ico">🗑️</span> Eliminar hábito</div>
    </div>
    <button class="btn btn-ghost btn-block" style="margin-top:16px" data-action="close-modal">Cancelar</button>
  `);
}

export function toggleKeystone(id) {
  const s = getState();
  const h = s.habits.find(x => x.id === id);
  if (!h) return;
  const making = !h.isKeystone;
  if (making) s.habits.forEach(x => { x.isKeystone = false; });
  h.isKeystone = making;
  saveState();
  closeModal();
  toast(making ? `⭐ ${h.name} es tu Piedra Angular` : 'Piedra Angular eliminada', 'success');
  renderAll();
}

export function confirmDeleteHabit(id) {
  const s = getState();
  const h = s.habits.find(x => x.id === id);
  if (!h) return;
  openModal(`
    <div class="modal-title">¿Eliminar hábito?</div>
    <div class="modal-subtitle">Se eliminará <b>${escHtml(h.name)}</b>. Tu XP acumulado no cambia.</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="close-modal">Cancelar</button>
      <button class="btn btn-danger" data-action="delete-habit-confirm" data-id="${id}">Eliminar</button>
    </div>
  `);
}

export function deleteHabit(id) {
  const s = getState();
  s.habits = s.habits.filter(h => h.id !== id);
  delete s.completedToday[id];
  saveState();
  closeModal();
  toast('Hábito eliminado', 'success');
  renderAll();
}
