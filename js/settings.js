/* ============================================================
   settings.js — Toggles, nombre, reset, export/import, notificaciones
   ============================================================ */

import { getState, saveState, resetState, exportState, importState } from './state.js';
import { toast, openModal, closeModal } from './ux.js';
import { renderAll } from './render.js';
import { scheduleReminders, requestNotificationPermission } from './notify.js';

export function toggleSetting(key) {
  const s = getState();
  s.settings[key] = !s.settings[key];
  saveState();
  renderAll();
  if (key === 'remindersEnabled') {
    if (s.settings[key]) scheduleReminders();
    else toast('Recordatorios desactivados');
  }
}

export function setPlayerName(name) {
  const s = getState();
  s.settings.playerName = name.trim() || 'Jugador';
  saveState();
}

export function setPhrasePack(pack) {
  const s = getState();
  s.settings.phrasePack = pack;
  saveState();
  renderAll();
}

const escHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function openGoalsEditor() {
  const s = getState();
  const renderList = () => s.goals.length
    ? s.goals.map((g, i) => `<div class="goal-chip"><span>🎯 ${escHtml(g)}</span><button data-goal-del="${i}">✕</button></div>`).join('')
    : `<div class="onb-hint">Aún no tienes metas. Agrega las que te inspiren.</div>`;

  const sheet = openModal(`
    <div class="modal-title">Mis metas</div>
    <div class="modal-subtitle">Tus metas aparecen en el dashboard para recordarte el porqué.</div>
    <div class="inline-create">
      <input class="field-input" id="goalInput" maxlength="60" placeholder="Ej: Sacar 6-pack, ahorrar $5M..."/>
      <button class="btn btn-primary btn-sm" id="goalAdd">+</button>
    </div>
    <div class="goal-list" id="goalList" style="margin-top:14px">${renderList()}</div>
    <button class="btn btn-ghost btn-block" style="margin-top:16px" data-action="close-modal">Listo</button>
  `);

  const input = sheet.querySelector('#goalInput');
  const refresh = () => { sheet.querySelector('#goalList').innerHTML = renderList(); renderAll(); };
  const add = () => {
    const v = input.value.trim();
    if (!v) return;
    if (s.goals.length >= 6) { toast('Máximo 6 metas', 'error'); return; }
    s.goals.push(v); input.value = ''; saveState(); refresh();
  };
  sheet.querySelector('#goalAdd').addEventListener('click', add);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  sheet.querySelector('#goalList').addEventListener('click', e => {
    const b = e.target.closest('[data-goal-del]'); if (!b) return;
    s.goals.splice(+b.dataset.goalDel, 1); saveState(); refresh();
  });
}

export function confirmReset() {
  openModal(`
    <div class="modal-title">¿Resetear todo?</div>
    <div class="modal-subtitle">Se borrará <b>todo tu progreso</b>: XP, racha, hábitos personalizados, recompensas e historial. Esto no se puede deshacer.</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="close-modal">Cancelar</button>
      <button class="btn btn-danger" data-action="reset-confirm">Sí, resetear</button>
    </div>
  `);
}

export function doReset() {
  resetState();
  closeModal();
  toast('Progreso reseteado', 'success');
  renderAll();
}

// ---------- Export / Import ----------
export function exportProgress() {
  const data = exportState();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dg444-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Respaldo descargado ✓', 'success');
}

export function importProgress() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importState(reader.result);
        toast('Progreso importado ✓', 'success');
        renderAll();
      } catch (e) {
        toast('Archivo inválido', 'error');
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

export async function enableNotifications() {
  const granted = await requestNotificationPermission();
  if (granted) {
    toast('Notificaciones activadas 🔔', 'success');
    scheduleReminders();
  } else {
    toast('Permiso de notificaciones denegado', 'error');
  }
}
