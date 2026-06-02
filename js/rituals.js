/* ============================================================
   rituals.js — Rituales diarios
   • Nunca Falles Dos Veces (James Clear)
   • Intención Matutina (Gollwitzer)
   • Revisión Dominical
   ============================================================ */

import { getState, saveState, todayISO } from './state.js';
import { todayHabits } from './game.js';
import { toast, openModal, closeModal } from './ux.js';
import { renderAll } from './render.js';

const escHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---------- Nunca Falles Dos Veces ----------
// Se llama desde app.js después del día reset, si hay hábitos fallidos
export function showNeverMissTwice(missedHabits) {
  if (!missedHabits?.length) return;
  const s = getState();
  const today = todayISO();
  // ¿Ya mostrado hoy?
  if (s.commitments.some(c => c.date === today && c.type === 'nmt')) return;

  openModal(`
    <div class="modal-title">⚠️ Regla de oro</div>
    <div class="modal-subtitle" style="color:var(--gold2)">Nunca falles <b>dos veces</b> seguidas.</div>
    <div class="nmt-body">
      <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Ayer no completaste:</p>
      <div class="nmt-missed">
        ${missedHabits.map(h => `<div class="nmt-item">${h.emoji} ${escHtml(h.name)}</div>`).join('')}
      </div>
      <p style="font-size:13px;color:var(--text);margin:16px 0 8px">¿Qué vas a hacer diferente hoy para no fallar de nuevo?</p>
      <input class="field-input" id="nmtCommit" maxlength="80"
        placeholder="Ej: Lo haré a las 7am antes de revisar el teléfono..."/>
    </div>
    <div class="modal-actions" style="margin-top:16px">
      <button class="btn btn-ghost" data-action="close-modal">Omitir</button>
      <button class="btn btn-primary" id="nmtSave">💪 Me comprometo</button>
    </div>
  `);

  const sheet = document.getElementById('modalSheet');
  sheet.querySelector('#nmtSave').addEventListener('click', () => {
    const text = sheet.querySelector('#nmtCommit').value.trim();
    s.commitments.push({
      date: today,
      type: 'nmt',
      text: text || 'Sin texto',
      habits: missedHabits.map(h => h.name),
    });
    // Mantener solo los últimos 30 compromisos
    if (s.commitments.length > 30) s.commitments = s.commitments.slice(-30);
    saveState();
    closeModal();
    toast('Compromiso guardado. ¡Hoy sí, campeón!', 'success');
    renderAll();
  });
}

// ---------- Intención Matutina (Implementation Intentions) ----------
// Mostrar una sola vez por día, entre 5am y 12pm
export function checkMorningIntention() {
  const s = getState();
  const today = todayISO();
  const hour = new Date().getHours();

  if (hour < 5 || hour >= 12) return;
  if (s.dailyIntention?.date === today) return; // ya se puso hoy

  const pending = todayHabits(s).filter(h => !s.completedToday[h.id]);
  if (!pending.length) return;

  // Priorizar el keystone, o el más difícil
  const keystone = pending.find(h => h.isKeystone);
  const target = keystone || pending.find(h => h.difficulty === 'hard') || pending[0];

  setTimeout(() => showIntentionModal(target, today), 1500);
}

function showIntentionModal(habit, today) {
  const s = getState();
  const hours = ['6am','7am','8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm'];
  const escH = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  openModal(`
    <div class="intention-icon">🌅</div>
    <div class="modal-title">Intención del día</div>
    <div class="modal-subtitle">Los que escriben <b>cuándo</b> lo harán tienen el doble de probabilidad de completarlo.</div>
    <div class="intention-habit">${habit.emoji} ${escH(habit.name)}</div>
    <p style="font-size:13px;color:var(--text2);margin:16px 0 8px">¿A qué hora lo vas a hacer hoy?</p>
    <div class="time-grid">
      ${hours.map(h => `<button class="time-btn" data-time="${h}">${h}</button>`).join('')}
    </div>
    <div class="modal-actions" style="margin-top:16px">
      <button class="btn btn-ghost" data-action="close-modal">Ahora no</button>
    </div>
  `);

  const sheet = document.getElementById('modalSheet');
  sheet.querySelector('.time-grid').addEventListener('click', e => {
    const b = e.target.closest('[data-time]'); if (!b) return;
    const time = b.dataset.time;
    s.dailyIntention = { date: today, habitId: habit.id, habitName: habit.name, habitEmoji: habit.emoji, time };
    saveState();
    closeModal();
    toast(`✅ Intención registrada: ${habit.emoji} ${habit.name} a las ${time}`, 'success');
    renderAll();
  });
}

// ---------- Revisión Dominical ----------
const REVIEW_QUESTIONS = [
  '¿Qué funcionó bien esta semana?',
  '¿Qué no funcionó? ¿Qué te frenó?',
  '¿Qué voy a cambiar o ajustar la próxima semana?',
  '¿Cuál es mi hábito prioritario para la próxima semana?',
  'Del 1 al 10, ¿qué tan alineado estuve con quien quiero ser?',
];

export function checkSundayReview() {
  const s = getState();
  const today = todayISO();
  const dayOfWeek = new Date().getDay(); // 0=Domingo
  if (dayOfWeek !== 0) return;
  // ¿Ya hizo el review esta semana?
  const lastReview = s.weeklyReviews[s.weeklyReviews.length - 1];
  if (lastReview?.date === today) return;
  // Mostrar después de un momento para no interrumpir al cargar
  setTimeout(showWeeklyReview, 2500);
}

export function showWeeklyReview() {
  const s = getState();
  const today = todayISO();
  const answers = Array(REVIEW_QUESTIONS.length).fill('');
  let step = 0;
  let rating = 0;

  function paint() {
    const isLast = step === REVIEW_QUESTIONS.length - 1;
    const q = REVIEW_QUESTIONS[step];
    const isRating = step === 4;
    const answerHtml = isRating
      ? `<div class="rating-row">${[1,2,3,4,5,6,7,8,9,10].map(n =>
          `<button class="rating-btn ${rating === n ? 'selected' : ''}" data-r="${n}">${n}</button>`).join('')}</div>`
      : `<textarea class="field-input review-ta" id="revAnswer" rows="3" maxlength="200" placeholder="Escribe aquí...">${answers[step]}</textarea>`;

    openModal(`
      <div class="modal-title">📋 Revisión semanal</div>
      <div class="onb-dots">
        ${REVIEW_QUESTIONS.map((_,i) => `<div class="onb-dot ${i===step?'active':''} ${i<step?'done':''}"></div>`).join('')}
      </div>
      <div class="review-q">${q}</div>
      ${answerHtml}
      <div class="modal-actions" style="margin-top:16px">
        ${step > 0 ? `<button class="btn btn-ghost" id="revBack">Atrás</button>` : ''}
        <button class="btn btn-primary" id="revNext" style="flex:2">${isLast ? 'Guardar revisión ✓' : 'Siguiente'}</button>
      </div>
    `);

    const sheet = document.getElementById('modalSheet');
    if (isRating) {
      sheet.querySelector('.rating-row').addEventListener('click', e => {
        const b = e.target.closest('[data-r]'); if (!b) return;
        rating = +b.dataset.r;
        sheet.querySelectorAll('.rating-btn').forEach(x => x.classList.toggle('selected', +x.dataset.r === rating));
      });
    }
    if (step > 0) sheet.querySelector('#revBack').addEventListener('click', () => { step--; paint(); });
    sheet.querySelector('#revNext').addEventListener('click', () => {
      if (!isRating) answers[step] = sheet.querySelector('#revAnswer').value.trim();
      if (isLast) {
        s.weeklyReviews.push({ date: today, answers, rating });
        if (s.weeklyReviews.length > 52) s.weeklyReviews = s.weeklyReviews.slice(-52);
        saveState();
        closeModal();
        toast('✅ Revisión guardada. ¡Gran semana!', 'success');
        renderAll();
      } else { step++; paint(); }
    });
  }
  paint();
}
