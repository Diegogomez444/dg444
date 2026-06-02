/* ============================================================
   rewards.js — Canje de recompensas, historial, modo deuda
   ============================================================ */

import { getState, saveState } from './state.js';
import { toast, xpPop, vibrate, HAPTIC, openModal, closeModal, EMOJI_OPTIONS } from './ux.js';
import { renderAll } from './render.js';

const escHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function redeemReward(id) {
  const s = getState();
  const r = s.rewards.find(x => x.id === id);
  if (!r) return;

  const affordable = s.totalPoints >= r.cost;
  const debt = s.settings.debtRewardsEnabled;

  if (!affordable && !debt) {
    toast('No tienes suficientes puntos', 'error');
    return;
  }

  if (!affordable && debt) {
    const deficit = r.cost - s.totalPoints;
    openModal(`
      <div class="modal-title">Canjear en deuda</div>
      <div class="modal-subtitle">No alcanzas para <b>${escHtml(r.name)}</b>. Quedarás con un déficit de <b style="color:var(--red)">${deficit.toLocaleString()} XP</b>.</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="close-modal">Cancelar</button>
        <button class="btn btn-danger" data-action="redeem-confirm" data-id="${id}">Canjear igual</button>
      </div>
    `);
    return;
  }

  doRedeem(r);
}

export function doRedeem(rOrId) {
  const s = getState();
  const r = typeof rOrId === 'string' ? s.rewards.find(x => x.id === rOrId) : rOrId;
  if (!r) return;
  s.totalPoints -= r.cost;
  s.rewardHistory[r.id] = (s.rewardHistory[r.id] || 0) + 1;
  saveState();
  closeModal();
  vibrate(HAPTIC.reward);
  xpPop(-r.cost);
  toast(`${r.emoji} ¡${escHtml(r.name)} canjeado! Disfrútalo.`, 'success');
  renderAll();
}

// Agregar recompensa personalizada
export function openRewardModal() {
  const s = getState();
  let emojiIdx = 0;
  const sheet = openModal(`
    <div class="modal-title">Nueva recompensa</div>
    <div class="modal-subtitle">Define un premio que puedas canjear con XP</div>

    <div class="field">
      <label class="field-label">Emoji + Nombre</label>
      <div class="inline-create">
        <button class="inline-emoji" id="rwEmoji">${EMOJI_OPTIONS[0]}</button>
        <input class="field-input" id="rwName" placeholder="Ej: Salir con amigos" maxlength="32"/>
      </div>
    </div>
    <div class="field">
      <label class="field-label">Costo en puntos (XP)</label>
      <input class="field-input" id="rwCost" type="number" inputmode="numeric" placeholder="500" min="1"/>
    </div>
    <div class="field">
      <label class="field-label">Descripción (opcional)</label>
      <input class="field-input" id="rwDesc" placeholder="Mereces este premio" maxlength="60"/>
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="close-modal">Cancelar</button>
      <button class="btn btn-primary" id="rwSave">Crear</button>
    </div>
  `);

  sheet.querySelector('#rwEmoji').addEventListener('click', () => {
    emojiIdx = (emojiIdx + 1) % EMOJI_OPTIONS.length;
    sheet.querySelector('#rwEmoji').textContent = EMOJI_OPTIONS[emojiIdx];
  });
  sheet.querySelector('#rwSave').addEventListener('click', () => {
    const name = sheet.querySelector('#rwName').value.trim();
    const cost = parseInt(sheet.querySelector('#rwCost').value, 10);
    const desc = sheet.querySelector('#rwDesc').value.trim();
    if (!name) { toast('Ponle un nombre', 'error'); return; }
    if (!cost || cost < 1) { toast('Pon un costo válido', 'error'); return; }
    s.rewards.push({ id: 'r' + Date.now(), name, emoji: EMOJI_OPTIONS[emojiIdx], cost, desc });
    saveState();
    closeModal();
    toast('Recompensa creada ✓', 'success');
    renderAll();
  });
}
