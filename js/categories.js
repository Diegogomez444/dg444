/* ============================================================
   categories.js — CRUD de categorías
   ============================================================ */

import { getState, saveState } from './state.js';
import { toast, openModal, closeModal, EMOJI_OPTIONS } from './ux.js';
import { renderAll } from './render.js';

const escHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function openManageCategories() {
  const s = getState();
  let newEmojiIdx = 0;
  const counts = id => s.habits.filter(h => h.cat === id).length;

  const sheet = openModal(`
    <div class="modal-title">Gestionar categorías</div>
    <div class="modal-subtitle">Crea, organiza y elimina tus categorías</div>

    <div id="catList">
      ${s.categories.map(c => `
        <div class="cat-manage-item">
          <span class="cat-manage-ico">${c.icon}</span>
          <div class="cat-manage-info">
            <div class="cat-manage-name">${escHtml(c.name)}</div>
            <div class="cat-manage-count">${counts(c.id)} hábito${counts(c.id) === 1 ? '' : 's'}</div>
          </div>
          <button class="cat-manage-del" data-del-cat="${c.id}">🗑️</button>
        </div>`).join('')}
    </div>

    <div class="field-label" style="margin-top:18px">Crear nueva categoría</div>
    <div class="inline-create">
      <button class="inline-emoji" id="catEmojiBtn">${EMOJI_OPTIONS[0]}</button>
      <input class="field-input" id="catName" placeholder="Nombre de la categoría" maxlength="28"/>
      <button class="btn btn-primary btn-sm" id="catAdd">+</button>
    </div>

    <button class="btn btn-ghost btn-block" style="margin-top:16px" data-action="close-modal">Cerrar</button>
  `);

  // Ciclo de emojis con tap
  sheet.querySelector('#catEmojiBtn').addEventListener('click', () => {
    newEmojiIdx = (newEmojiIdx + 1) % EMOJI_OPTIONS.length;
    sheet.querySelector('#catEmojiBtn').textContent = EMOJI_OPTIONS[newEmojiIdx];
  });

  // Crear
  sheet.querySelector('#catAdd').addEventListener('click', () => {
    const name = sheet.querySelector('#catName').value.trim();
    if (!name) { toast('Ponle un nombre a la categoría', 'error'); return; }
    const id = 'c' + Date.now();
    s.categories.push({ id, icon: EMOJI_OPTIONS[newEmojiIdx], name });
    saveState();
    toast('Categoría creada ✓', 'success');
    openManageCategories(); // re-render del modal
    renderAll();
  });

  // Eliminar
  sheet.querySelector('#catList').addEventListener('click', e => {
    const b = e.target.closest('[data-del-cat]'); if (!b) return;
    const id = b.dataset.delCat;
    if (counts(id) > 0) { toast('No puedes eliminar una categoría con hábitos', 'error'); return; }
    s.categories = s.categories.filter(c => c.id !== id);
    saveState();
    toast('Categoría eliminada', 'success');
    openManageCategories();
    renderAll();
  });
}
