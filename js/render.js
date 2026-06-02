/* ============================================================
   render.js — Renderizado de páginas (puro: state → DOM)
   ============================================================ */

import { getState, DAY_ORDER, getDayCode, getActiveUser } from './state.js';
import {
  getLevel, getLevelProgress, getRank, nextRank, todayHabits,
  isCompleted, isMVH, dayCounts, unlockedBadges, getWeekIndex,
  identityScores, compoundProjections, RANKS,
} from './game.js';
import { getQuote, mascotFor, mascotForGoggins, PHRASE_PACKS, avatarHtml } from './ux.js';

let currentPage = 'dashboard';
let activeFilter = 'all';

export function setPage(p) { currentPage = p; }
export function getPage() { return currentPage; }
export function setFilter(f) { activeFilter = f; }
export function getFilter() { return activeFilter; }

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Top bar ----------
export function renderTop() {
  const s = getState();
  document.getElementById('topStreakNum').textContent = s.streak;
  // Mostrar freezes si tiene
  const streakEl = document.getElementById('topStreak');
  if (s.freezes > 0) {
    streakEl.innerHTML = `<span class="flame">🔥</span><span id="topStreakNum">${s.streak}</span><span class="freeze-badge" title="Escudos de racha">🧊×${s.freezes}</span>`;
  } else {
    streakEl.innerHTML = `<span class="flame">🔥</span><span id="topStreakNum">${s.streak}</span>`;
  }
  const { done, total, pct } = dayCounts(s);
  const fill = document.getElementById('dayProgressFill');
  fill.style.width = pct + '%';
  fill.classList.toggle('full', pct >= 100);
  document.getElementById('dayProgressLabel').textContent =
    `${done} completado${done === 1 ? '' : 's'} · ${total} hábito${total === 1 ? '' : 's'} hoy`;
}

// ---------- Master render ----------
export function renderAll() {
  renderTop();
  const screen = document.getElementById('screen');
  let html = '';
  switch (currentPage) {
    case 'dashboard': html = renderDashboard(); break;
    case 'habits':    html = renderHabits(); break;
    case 'stats':     html = renderStats(); break;
    case 'rewards':   html = renderRewards(); break;
    case 'settings':  html = renderSettings(); break;
  }
  screen.innerHTML = `<div class="page">${html}</div>`;
  screen.scrollTop = 0;
  window.scrollTo(0, 0);
}

// ============ DASHBOARD ============
function renderDashboard() {
  const s = getState();
  const lvl = getLevel(s.totalPoints);
  const prog = getLevelProgress(s.totalPoints);
  const rank = getRank(s.totalPoints);
  const next = nextRank(s.totalPoints);
  const { done, total, pct } = dayCounts(s);
  const mascot = s.settings.gogginsMode
    ? mascotForGoggins(pct, s.settings.playerName)
    : mascotFor(pct, s.settings.playerName);

  const ringR = 34, ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (prog / 500) * ringC;

  const pending = todayHabits(s).filter(h => !isCompleted(h.id, s));
  const todayAll = todayHabits(s);

  return `
    ${recoveryCard(s)}
    ${commitmentCard(s)}
    ${intentionCard(s)}

    <div class="hero" id="heroCard">
      <div class="hero-top">
        <div>
          <div class="hero-greeting">${greeting()}</div>
          <div class="hero-name-row">
            <span class="hero-avatar-wrap">${avatarHtml(s.settings.avatar, 38, 'hero-avatar')}</span>
            <span class="hero-name">${esc(s.settings.playerName)}</span>
          </div>
        </div>
        <div class="hero-rank"><span class="rico">${rank.icon}</span>${rank.name}</div>
      </div>
      <div class="level-row">
        <div class="ring-wrap">
          <svg width="84" height="84" viewBox="0 0 84 84">
            <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#c9a84c"/><stop offset="1" stop-color="#f0c060"/>
            </linearGradient></defs>
            <circle class="ring-bg" cx="42" cy="42" r="${ringR}"/>
            <circle class="ring-fill" cx="42" cy="42" r="${ringR}"
              stroke-dasharray="${ringC.toFixed(1)}" stroke-dashoffset="${ringOffset.toFixed(1)}"/>
          </svg>
          <div class="ring-center">
            <div class="ring-lvl-label">NIVEL</div>
            <div class="ring-lvl-num">${lvl}</div>
          </div>
        </div>
        <div class="xp-block">
          <div class="xp-vals">
            <div class="xp-total">${s.totalPoints.toLocaleString()} <small>XP</small></div>
            <div class="xp-next">${prog}/500</div>
          </div>
          <div class="xp-bar"><div class="xp-bar-fill" style="width:${(prog/500*100).toFixed(1)}%"></div></div>
          <div class="xp-next" style="margin-top:6px">${next ? `${(next.min - s.totalPoints).toLocaleString()} XP para ${next.name} ${next.icon}` : 'Rango máximo alcanzado 🔱'}</div>
        </div>
      </div>
      <div class="mascot">
        <div class="mascot-avatar">${mascot.avatar}</div>
        <div class="mascot-bubble">${mascot.msg}</div>
      </div>
    </div>

    <div class="quote-card"><div class="quote-text">"${getQuote(s.quoteIndex, s.settings.phrasePack, s.settings.playerName)}"</div></div>

    ${s.goals?.length ? `
    <div class="goals-card">
      <div class="goals-card-title">🎯 TUS METAS</div>
      ${s.goals.map(g => `<div class="goals-card-item">▸ ${esc(g)}</div>`).join('')}
    </div>` : ''}

    <div class="section-title">Hábitos de hoy <span style="font-size:13px;color:var(--text2);font-family:'DM Sans'">${done}/${total}</span></div>
    ${todayAll.length === 0
      ? `<div class="card" style="text-align:center;color:var(--text2)">No hay hábitos programados para hoy.</div>`
      : pending.length === 0
        ? `<div class="card" style="text-align:center;color:var(--green)">🎉 ¡Todos los hábitos de hoy completados!</div>`
        : `<div class="habit-list">${pending.map(h => habitRow(h, s, false)).join('')}</div>`}
  `;
}

function recoveryCard(s) {
  if (!s.recovery?.active) return '';
  const { daysCompleted, daysNeeded, originalStreak } = s.recovery;
  const pct = Math.round((daysCompleted / daysNeeded) * 100);
  return `
    <div class="recovery-card">
      <div class="recovery-header">
        <span>🔄 Reto de recuperación</span>
        <span class="recovery-days">${daysCompleted}/${daysNeeded} días</span>
      </div>
      <div class="recovery-body">Completa ${daysNeeded} días seguidos para recuperar ${Math.floor(originalStreak/2)} días de racha.</div>
      <div class="xp-bar" style="margin-top:8px"><div class="xp-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,#5294e0,#82b4ff)"></div></div>
    </div>`;
}

function commitmentCard(s) {
  const today = s.commitments?.slice(-1)[0];
  if (!today || today.type !== 'nmt') return '';
  const todayStr = new Date().toISOString().slice(0, 10);
  if (today.date !== todayStr) return '';
  return `
    <div class="commitment-card">
      <div class="commitment-label">💪 Tu compromiso de hoy</div>
      <div class="commitment-text">"${esc(today.text)}"</div>
    </div>`;
}

function intentionCard(s) {
  const today = new Date().toISOString().slice(0, 10);
  const i = s.dailyIntention;
  if (!i || i.date !== today) return '';
  return `
    <div class="intention-card">
      <span>🌅 ${i.habitEmoji || ''} <b>${esc(i.habitName)}</b> a las <b>${i.time}</b></span>
    </div>`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días,';
  if (h < 19) return 'Buenas tardes,';
  return 'Buenas noches,';
}

// ============ HABITS ============
function renderHabits() {
  const s = getState();
  const code = getDayCode();
  const chips = `
    <div class="chips">
      <button class="chip ${activeFilter === 'all' ? 'active' : ''}" data-action="filter" data-cat="all">📋 Todas</button>
      ${s.categories.map(c => `<button class="chip ${activeFilter === c.id ? 'active' : ''}" data-action="filter" data-cat="${c.id}">${c.icon} ${esc(c.name.split(' ')[0])}</button>`).join('')}
    </div>`;

  let list = s.habits.filter(h => activeFilter === 'all' || h.cat === activeFilter);
  list.sort((a, b) => {
    if (a.isKeystone !== b.isKeystone) return a.isKeystone ? -1 : 1;
    return (b.days.includes(code) ? 1 : 0) - (a.days.includes(code) ? 1 : 0);
  });

  const body = list.length === 0
    ? `<div class="empty"><div class="empty-ico">📭</div><div class="empty-text">No hay hábitos en esta categoría.</div></div>`
    : `<div class="habit-list">${list.map(h => habitRow(h, s, true)).join('')}</div>`;

  return `
    <div class="section-title">Mis Hábitos
      <button class="btn btn-primary btn-sm" data-action="new-habit">+ Nuevo</button>
    </div>
    ${chips}
    ${body}
    <button class="btn btn-ghost btn-block" style="margin-top:16px" data-action="manage-cats">🗂️ Gestionar categorías</button>
  `;
}

function habitRow(h, s, showMenu) {
  const code = getDayCode();
  const isToday = h.days.includes(code);
  const done = isCompleted(h.id, s);
  const mvh = isMVH(h.id, s);
  const isLucky = s.variableRewardHabitId === h.id && !done;
  const cat = s.categories.find(c => c.id === h.cat);
  const xpLabel = done ? '' : ({ easy: '30', normal: '50', hard: '80' }[h.difficulty || 'normal']);
  const hStreak = s.habitStreaks?.[h.id]?.streak || 0;
  const daysHtml = DAY_ORDER.map(d =>
    `<span class="habit-day ${h.days.includes(d) ? 'active' : ''}">${d}</span>`).join('');
  const diffColor = { easy: 'var(--text3)', normal: 'var(--blue)', hard: 'var(--gold)' }[h.difficulty || 'normal'];

  return `
    <div class="habit ${done ? 'done' : ''} ${mvh ? 'mvh-done' : ''} ${!isToday ? 'habit-offday' : ''} ${h.isKeystone ? 'keystone' : ''} ${isLucky ? 'lucky' : ''}" data-habit="${h.id}">
      <div class="habit-emoji">${h.emoji}${h.isKeystone ? '<span class="keystone-star">⭐</span>' : ''}</div>
      <div class="habit-info">
        <div class="habit-name">${esc(h.name)} ${isLucky ? '<span class="lucky-badge">2x🎲</span>' : ''} ${mvh ? '<span class="mvh-badge">mín</span>' : ''}</div>
        <div class="habit-meta">
          <span>${cat ? cat.icon + ' ' + esc(cat.name.split(' ')[0]) : ''}</span>
          <span style="color:${diffColor};font-size:10px">${xpLabel ? '+'+xpLabel+' XP' : ''}</span>
          ${hStreak >= 2 ? `<span class="habit-streak-badge">🔥${hStreak}</span>` : ''}
          <span class="habit-days">${daysHtml}</span>
        </div>
        ${h.anchor && !done ? `<div class="habit-anchor">⚓ ${esc(h.anchor)}</div>` : ''}
      </div>
      <div class="habit-actions">
        ${showMenu ? `<button class="habit-menu-btn" data-action="habit-menu" data-id="${h.id}">⋮</button>` : ''}
        ${!done && h.mvh && isToday ? `<button class="mvh-btn" data-action="mvh" data-id="${h.id}" title="Modo emergencia">🆘</button>` : ''}
        <button class="habit-check" data-action="toggle" data-id="${h.id}" ${!isToday ? 'data-offday="1"' : ''}>✓</button>
      </div>
    </div>`;
}

// ============ STATS ============
function renderStats() {
  const s = getState();
  const lvl = getLevel(s.totalPoints);
  const badges = unlockedBadges(s);
  const max = Math.max(1, ...s.weekData);
  const todayIdx = getWeekIndex();
  const identity = identityScores(s);
  const projections = compoundProjections(s);

  const weekHtml = DAY_ORDER.map((d, i) => {
    const v = s.weekData[i] || 0;
    const h = Math.round((v / max) * 100);
    const isToday = i === todayIdx;
    return `<div class="weekbar-wrap">
      <div class="weekbar-val">${v}</div>
      <div class="weekbar ${isToday ? 'today' : ''}" style="height:${h}%"></div>
      <div class="weekbar-day ${isToday ? 'today' : ''}">${d}</div>
    </div>`;
  }).join('');

  const identityHtml = identity.filter(c => c.count > 0).map(c => `
    <div class="identity-row">
      <span class="identity-cat">${c.icon} ${esc(c.name.split(' ')[0])}</span>
      <div class="identity-bar-wrap"><div class="identity-bar" style="width:${c.score}%"></div></div>
      <span class="identity-pct">${c.score}%</span>
    </div>`).join('') || `<div class="empty-text" style="padding:12px">Completa hábitos para ver tu identidad.</div>`;

  const projHtml = projections.map(p => `
    <div class="proj-row"><span class="proj-label">${p.label}</span><span class="proj-val">${p.value}</span></div>
  `).join('');

  return `
    <div class="section-title">Estadísticas</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-ico">⚡</div><div class="stat-val gold">${s.totalPoints.toLocaleString()}</div><div class="stat-label">XP Total</div></div>
      <div class="stat-card"><div class="stat-ico">🎖️</div><div class="stat-val blue">${lvl}</div><div class="stat-label">Nivel</div></div>
      <div class="stat-card"><div class="stat-ico">🔥</div><div class="stat-val red">${s.streak}</div><div class="stat-label">Racha (días)</div></div>
      <div class="stat-card"><div class="stat-ico">👑</div><div class="stat-val green">${s.perfectDays}</div><div class="stat-label">Días perfectos</div></div>
    </div>

    <div class="section-title">Esta semana</div>
    <div class="card"><div class="weekchart">${weekHtml}</div></div>

    <div class="section-title">Tu identidad <span style="font-size:12px;color:var(--text2);font-family:'DM Sans'">(de Atomic Habits)</span></div>
    <div class="card identity-card">${identityHtml}</div>

    ${projections.length ? `
    <div class="section-title">Efecto compuesto <span style="font-size:12px;color:var(--text2);font-family:'DM Sans'">(a este ritmo...)</span></div>
    <div class="card proj-card">${projHtml}</div>` : ''}

    <div class="section-title">Logros</div>
    <div class="badge-grid">
      ${badges.map(b => `
        <div class="badge ${b.unlocked ? 'unlocked' : ''}">
          <div class="badge-ico">${b.icon}</div>
          <div class="badge-info"><div class="badge-name">${b.name}</div><div class="badge-cond">${b.unlocked ? '✓ Desbloqueado' : '🔒 Bloqueado'}</div></div>
        </div>`).join('')}
    </div>

    ${s.weeklyReviews?.length ? reviewHistoryHtml(s.weeklyReviews) : ''}

    <div class="section-title">Tarjeta semanal</div>
    <div class="card" style="text-align:center;padding:20px">
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">Genera una imagen con tus stats para compartir a WhatsApp o IG Stories.</div>
      <button class="btn btn-primary" data-action="share-card">📸 Generar y compartir</button>
    </div>

    <div class="section-title">Revisión semanal</div>
    <div class="card" style="text-align:center;padding:20px">
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">5 preguntas, 2 minutos. El hábito que cambia todos los demás.</div>
      <button class="btn btn-ghost" data-action="weekly-review">📋 Hacer revisión</button>
    </div>
  `;
}

// ============ REWARDS ============
function renderRewards() {
  const s = getState();
  const pts = s.totalPoints;
  const history = Object.entries(s.rewardHistory).filter(([, n]) => n > 0);
  return `
    <div class="section-title">Premios</div>
    <div class="balance-card">
      <div class="balance-label">BALANCE DISPONIBLE</div>
      <div class="balance-val ${pts < 0 ? 'debt' : ''}">${pts.toLocaleString()}</div>
      <div class="balance-sub">${pts < 0 ? '⚠️ Estás en deuda de XP' : 'puntos para canjear'}</div>
    </div>
    <div class="reward-grid" style="margin-top:16px">
      ${s.rewards.map(r => rewardCard(r, s)).join('')}
    </div>
    <button class="btn btn-ghost btn-block" style="margin-top:16px" data-action="new-reward">+ Agregar recompensa</button>
    ${history.length ? `
      <div class="section-title">Historial de canjes</div>
      <div class="history-list">
        ${history.map(([id, n]) => {
          const r = s.rewards.find(x => x.id === id);
          return r ? `<div class="history-item"><span class="history-emoji">${r.emoji}</span><span class="history-name">${esc(r.name)}</span><span class="history-count">×${n}</span></div>` : '';
        }).join('')}
      </div>` : ''}
  `;
}

function rewardCard(r, s) {
  const affordable = s.totalPoints >= r.cost;
  const debt = s.settings.debtRewardsEnabled;
  const count = s.rewardHistory[r.id] || 0;
  const cls = affordable ? 'affordable' : (debt ? 'debt-mode' : '');
  const btnLabel = affordable ? 'Canjear' : (debt ? 'Canjear (deuda)' : 'No alcanza');
  const btnCls = affordable ? 'btn-primary' : (debt ? 'btn-danger' : 'btn-ghost');
  const disabled = (!affordable && !debt) ? 'disabled' : '';
  return `
    <div class="reward ${cls}">
      ${count ? `<div class="reward-redeemed">×${count}</div>` : ''}
      <div class="reward-emoji">${r.emoji}</div>
      <div class="reward-name">${esc(r.name)}</div>
      <div class="reward-desc">${esc(r.desc || '')}</div>
      <div class="reward-cost">⚡ ${r.cost.toLocaleString()}</div>
      <button class="btn ${btnCls} btn-sm reward-redeem-btn" data-action="redeem" data-id="${r.id}" ${disabled}>${btnLabel}</button>
    </div>`;
}

// ============ SETTINGS ============
function renderSettings() {
  const s = getState();
  const st = s.settings;
  const toggle = (key, name, desc) => `
    <div class="setting-row">
      <div class="setting-info"><div class="setting-name">${name}</div><div class="setting-desc">${desc}</div></div>
      <div class="toggle ${st[key] ? 'on' : ''}" data-action="toggle-setting" data-key="${key}"></div>
    </div>`;

  const packBtns = Object.entries(PHRASE_PACKS).map(([id, p]) =>
    `<button class="cat-opt ${st.phrasePack === id ? 'selected' : ''}" data-action="set-pack" data-pack="${id}">${p.icon} ${p.label}</button>`).join('');

  return `
    <div class="section-title">Ajustes</div>

    <div class="account-badge">
      <span class="account-badge-av">${avatarHtml(st.avatar, 40, 'account-avatar')}</span>
      <div class="account-badge-info">
        <div class="account-badge-name">${esc(st.playerName)}</div>
        <div class="account-badge-user">@${esc(getActiveUser() || 'invitado')}</div>
      </div>
      <div class="freeze-indicator">🧊 ×${s.freezes}</div>
    </div>

    <div class="setting-row" style="flex-direction:column;align-items:stretch">
      <div class="setting-info"><div class="setting-name">Nombre del personaje</div></div>
      <input class="name-input" id="playerNameInput" value="${esc(st.playerName)}" maxlength="24"/>
    </div>

    <div class="setting-row" style="flex-direction:column;align-items:stretch">
      <div class="setting-info"><div class="setting-name">Estilo de frases</div></div>
      <div class="cat-select" style="margin-top:10px">${packBtns}</div>
    </div>

    <div class="setting-row">
      <div class="setting-info"><div class="setting-name">Mis metas 🎯</div><div class="setting-desc">${s.goals?.length ? s.goals.length + ' meta(s)' : 'Sin metas definidas'}</div></div>
      <button class="btn btn-ghost btn-sm" data-action="edit-goals">Editar</button>
    </div>

    ${toggle('penaltyEnabled', 'Penalizaciones', 'Resta XP por hábitos no completados al cambiar de día')}
    ${toggle('streakWarningEnabled', 'Aviso de racha en peligro', 'Banner de alerta a las 9PM')}
    ${toggle('debtRewardsEnabled', 'Modo deuda', 'Canjear recompensas aunque no alcances los puntos')}
    ${toggle('remindersEnabled', 'Recordatorios', 'Notificaciones de hábitos pendientes')}
    ${toggle('variableRewardsEnabled', 'Recompensas variables 🎲', 'Algunos días un hábito random vale el doble de XP')}
    ${toggle('gogginsMode', 'Modo Goggins 💀', 'Frases brutales y sin filtro. Para los que quieren ser desafiados.')}

    <div class="section-title">Datos</div>
    <button class="btn btn-ghost btn-block" data-action="export" style="margin-bottom:10px">⬇️ Exportar progreso</button>
    <button class="btn btn-ghost btn-block" data-action="import" style="margin-bottom:10px">⬆️ Importar progreso</button>
    <button class="btn btn-ghost btn-block" data-action="notify-perm" style="margin-bottom:10px">🔔 Activar notificaciones</button>
    <button class="btn btn-danger btn-block" data-action="reset">🗑️ Resetear todo el progreso</button>

    <div class="section-title">Cuenta</div>
    <button class="btn btn-ghost btn-block" data-action="logout" style="margin-bottom:10px">🚪 Cerrar sesión / Cambiar cuenta</button>

    <div style="text-align:center;color:var(--text3);font-size:11px;margin-top:24px">
      DG444 · v2.0 · Tu progreso es solo tuyo.
    </div>
  `;
}

// ── Historial de revisiones semanales ──────────────────────
const REVIEW_QS = [
  '¿Qué funcionó bien?',
  '¿Qué no funcionó?',
  '¿Qué voy a cambiar?',
  '¿Mi hábito prioritario?',
  'Puntuación de alineación',
];

function reviewHistoryHtml(reviews) {
  const sorted = [...reviews].reverse().slice(0, 8);
  const ratingColor = r => r >= 8 ? 'var(--green)' : r >= 5 ? 'var(--gold)' : 'var(--red)';
  const dots = r => '★'.repeat(Math.round(r / 2)) + '☆'.repeat(5 - Math.round(r / 2));

  return `
    <div class="section-title">Revisiones anteriores</div>
    <div class="reviews-list">
      ${sorted.map(rv => `
        <details class="review-card">
          <summary class="review-summary">
            <span class="review-date">${formatReviewDate(rv.date)}</span>
            <span class="review-rating" style="color:${ratingColor(rv.rating)}">${dots(rv.rating)} ${rv.rating}/10</span>
          </summary>
          <div class="review-answers">
            ${REVIEW_QS.map((q, i) => rv.answers[i] ? `
              <div class="review-qa">
                <div class="review-q-label">${q}</div>
                <div class="review-a-text">${esc(rv.answers[i])}</div>
              </div>` : '').join('')}
          </div>
        </details>`).join('')}
    </div>`;
}

function formatReviewDate(iso) {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO',
      { weekday: 'short', day: 'numeric', month: 'short' });
  } catch (_) { return iso; }
}

export function flashPenalty() {
  const hero = document.getElementById('heroCard');
  if (hero) { hero.classList.add('penalty-flash'); setTimeout(() => hero.classList.remove('penalty-flash'), 800); }
}
