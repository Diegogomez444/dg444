/* ============================================================
   onboarding.js — Configuración inicial del personaje
   Personaje → Estilo → Metas → Hábitos → ¡Listo!
   ============================================================ */

import { getState, saveState, suggestedHabits } from './state.js';
import { PHRASE_PACKS, getQuote, avatarHtml, compressAvatar } from './ux.js';
import { toast, confetti } from './ux.js';

const AVATARS = [
  '🦸','🦹','🥷','🧙','🧛','🦊','🐺','🦁','🐉','🦅',
  '👑','⚡','🔥','💀','🤖','👽','🦾','🏆','🎯','🌟',
  '🦇','🐆','🔱','⚔️','🛡️','🎭','🌊','🌙','☀️','💎',
];

const escAttr = s => String(s).replace(/"/g, '&quot;');
const escHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function startOnboarding(account, onDone) {
  const templates = suggestedHabits();
  const data = {
    name: account?.display || account?.username || '',
    avatar: '🦸',         // emoji o base64
    avatarIsPhoto: false,
    pack: 'disciplina',
    goals: [],
    habits: new Set([0, 1, 5, 6, 9]),
  };
  let step = 0;
  const TOTAL = 5;

  const root = document.getElementById('onboarding');
  root.classList.remove('hidden');

  // ── Dots de progreso ─────────────────────────────────────
  function dots() {
    const labels = ['Personaje', 'Estilo', 'Metas', 'Hábitos', 'Resumen'];
    return `<div class="onb-dots">
      ${Array.from({ length: TOTAL }, (_, i) => `
        <div class="onb-dot-wrap">
          <div class="onb-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}"></div>
          <div class="onb-dot-label ${i === step ? 'active' : ''}">${labels[i]}</div>
        </div>`).join('')}
    </div>`;
  }

  // ── Render del step activo ────────────────────────────────
  function render() {
    let body = '';
    if (step === 0) body = stepPersona();
    else if (step === 1) body = stepStyle();
    else if (step === 2) body = stepGoals();
    else if (step === 3) body = stepHabits();
    else if (step === 4) body = stepSummary();

    const backBtn = step > 0
      ? `<button class="btn btn-ghost onb-back" id="onbBack">← Atrás</button>` : '';
    const nextLabel = step === TOTAL - 1 ? '¡Empezar ahora! 🚀' : 'Siguiente →';
    const skipGoals = step === 2
      ? `<button class="onb-skip" id="onbSkip">Omitir metas por ahora</button>` : '';

    root.innerHTML = `
      <div class="onb-card">
        ${dots()}
        <div class="onb-body">${body}</div>
        ${skipGoals}
        <div class="onb-nav">
          ${backBtn}
          <button class="btn btn-primary" id="onbNext" style="flex:${step > 0 ? 2 : 1}">${nextLabel}</button>
        </div>
      </div>`;

    wire();
  }

  // ── PASO 1: Personaje (nombre + avatar) ───────────────────
  function stepPersona() {
    const av = data.avatar;
    return `
      <div class="onb-title">Crea tu personaje</div>
      <div class="onb-sub">No eres un usuario más. ¿Quién quieres ser en esta aventura?</div>

      <!-- Avatar grande clicable -->
      <div class="avatar-stage">
        <div class="avatar-circle-big" id="avatarPreview">
          ${avatarHtml(av, 90, 'onb-av-inner')}
        </div>
        <div class="avatar-change-label">Toca para cambiar</div>
      </div>

      <!-- Selector de modo -->
      <div class="avatar-mode-tabs" id="avModeTabs">
        <button class="av-tab ${!data.avatarIsPhoto ? 'active' : ''}" data-mode="emoji">😊 Emoji</button>
        <button class="av-tab ${data.avatarIsPhoto ? 'active' : ''}"  data-mode="photo">📷 Foto / Selfie</button>
      </div>

      <!-- Panel emoji -->
      <div class="av-panel" id="panelEmoji" style="${data.avatarIsPhoto ? 'display:none' : ''}">
        <div class="avatar-emoji-grid" id="onbAvatars">
          ${AVATARS.map(a => `
            <button class="av-emoji-btn ${a === av && !data.avatarIsPhoto ? 'selected' : ''}" data-av="${a}">${a}</button>
          `).join('')}
        </div>
      </div>

      <!-- Panel foto -->
      <div class="av-panel" id="panelPhoto" style="${data.avatarIsPhoto ? '' : 'display:none'}">
        <div class="photo-options">
          <label class="photo-btn" for="photoFile">
            <span class="photo-btn-ico">🖼️</span>
            <span>Galería</span>
            <input id="photoFile" type="file" accept="image/*" style="display:none"/>
          </label>
          <label class="photo-btn" for="photoCamera">
            <span class="photo-btn-ico">🤳</span>
            <span>Cámara</span>
            <input id="photoCamera" type="file" accept="image/*" capture="user" style="display:none"/>
          </label>
        </div>
        ${data.avatarIsPhoto
          ? `<div class="photo-confirm">✓ Foto cargada — se ve arriba</div>`
          : `<div class="photo-hint">Sube una foto o toma una selfie. Se recorta en círculo.</div>`}
      </div>

      <!-- Nombre -->
      <div class="field" style="margin-top:22px">
        <label class="field-label">Nombre de tu personaje</label>
        <input class="field-input onb-name-input" id="onbName"
          value="${escAttr(data.name)}" maxlength="24"
          placeholder="Ej: Sr. Wayne · Valkiria · Neo · El Profe..."/>
      </div>
    `;
  }

  // ── PASO 2: Estilo de frases ──────────────────────────────
  function stepStyle() {
    const name = data.name || 'tú';
    return `
      <div class="onb-avatar-mini">${avatarHtml(data.avatar, 52)}</div>
      <div class="onb-title">Tu estilo, ${escHtml(name)}</div>
      <div class="onb-sub">Define el tono de las frases que te van a motivar cada día.</div>
      <div class="pack-list" id="onbPacks">
        ${Object.entries(PHRASE_PACKS).map(([id, p]) => `
          <button class="pack-card ${id === data.pack ? 'selected' : ''}" data-pack="${id}">
            <div class="pack-icon">${p.icon}</div>
            <div class="pack-info">
              <div class="pack-label">${p.label}</div>
              <div class="pack-desc">${p.desc}</div>
            </div>
            ${id === data.pack ? '<div class="pack-check">✓</div>' : ''}
          </button>`).join('')}
      </div>
      <div class="quote-card" style="margin-top:16px">
        <div class="quote-text" id="onbSample">"${getQuote(new Date().getDate(), data.pack, data.name)}"</div>
      </div>`;
  }

  // ── PASO 3: Metas ─────────────────────────────────────────
  function stepGoals() {
    return `
      <div class="onb-avatar-mini">${avatarHtml(data.avatar, 52)}</div>
      <div class="onb-title">Tus metas 🎯</div>
      <div class="onb-sub">¿Qué quieres lograr? Aparecerán en tu dashboard para recordarte el <b>porqué</b> cada día.</div>
      <div class="inline-create">
        <input class="field-input" id="onbGoalInput" maxlength="60"
          placeholder="Ej: Forbes Colombia 2027, Sacar 6-pack..."/>
        <button class="btn btn-primary btn-sm" id="onbGoalAdd">+</button>
      </div>
      <div class="goal-list" id="onbGoals">${renderGoals()}</div>`;
  }

  function renderGoals() {
    if (!data.goals.length)
      return `<div class="onb-hint">Agrega tus metas. Puedes editarlas después en Ajustes.</div>`;
    return data.goals.map((g, i) =>
      `<div class="goal-chip">
        <span>🎯 ${escHtml(g)}</span>
        <button data-goal-del="${i}">✕</button>
       </div>`).join('');
  }

  // ── PASO 4: Hábitos ───────────────────────────────────────
  function stepHabits() {
    const cats = getState().categories;
    const groups = cats.map(c => {
      const items = templates.map((t, i) => ({ t, i })).filter(x => x.t.cat === c.id);
      if (!items.length) return '';
      return `
        <div class="onb-cat-label">${c.icon} ${escHtml(c.name)}</div>
        ${items.map(({ t, i }) => `
          <button class="tpl ${data.habits.has(i) ? 'on' : ''}" data-tpl="${i}">
            <span class="tpl-emoji">${t.emoji}</span>
            <div class="tpl-info">
              <span class="tpl-name">${escHtml(t.name)}</span>
              ${t.anchor ? `<span class="tpl-anchor">⚓ ${escHtml(t.anchor)}</span>` : ''}
            </div>
            <span class="tpl-xp">${{ easy:'30', normal:'50', hard:'80' }[t.difficulty||'normal']} XP</span>
            <span class="tpl-check">✓</span>
          </button>`).join('')}`;
    }).join('');
    return `
      <div class="onb-title">Elige tus hábitos</div>
      <div class="onb-sub">Empieza con los que sean reales para ti ahora mismo. Podrás agregar, editar y borrar después.</div>
      <div class="tpl-selected-count" id="tplCount">${data.habits.size} hábito${data.habits.size === 1 ? '' : 's'} seleccionado${data.habits.size === 1 ? '' : 's'}</div>
      <div class="tpl-list">${groups}</div>`;
  }

  // ── PASO 5: Resumen ───────────────────────────────────────
  function stepSummary() {
    const pack = PHRASE_PACKS[data.pack];
    return `
      <div class="onb-summary-hero">
        <div class="onb-av-ring">${avatarHtml(data.avatar, 100, 'onb-av-big')}</div>
        <div class="onb-title" style="margin-top:12px">¡Todo listo!</div>
        <div class="onb-sub">La leyenda se escribe un hábito a la vez, ${escHtml(data.name)}.</div>
      </div>
      <div class="onb-summary">
        <div class="onb-sum-row"><span>Personaje</span><b>${escHtml(data.name)}</b></div>
        <div class="onb-sum-row"><span>Avatar</span><b>${data.avatarIsPhoto ? '📷 Foto personalizada' : data.avatar}</b></div>
        <div class="onb-sum-row"><span>Estilo</span><b>${pack.icon} ${pack.label}</b></div>
        <div class="onb-sum-row"><span>Metas</span><b>${data.goals.length ? data.goals.length + ' definida' + (data.goals.length > 1 ? 's' : '') : 'Sin metas (puedes agregar luego)'}</b></div>
        <div class="onb-sum-row"><span>Hábitos</span><b>${data.habits.size} seleccionados</b></div>
      </div>
      <div class="quote-card" style="margin-top:16px">
        <div class="quote-text">"${getQuote(0, data.pack, data.name)}"</div>
      </div>`;
  }

  // ── Wiring por paso ───────────────────────────────────────
  function wire() {
    const next = root.querySelector('#onbNext');
    const back = root.querySelector('#onbBack');
    if (back) back.addEventListener('click', () => { step--; render(); });
    next.addEventListener('click', onNext);

    if (step === 0) wirePersona();
    if (step === 1) wireStyle();
    if (step === 2) wireGoals();
    if (step === 3) wireHabits();
    const skip = root.querySelector('#onbSkip');
    if (skip) skip.addEventListener('click', () => { step++; render(); });
  }

  function wirePersona() {
    const preview = root.querySelector('#avatarPreview');

    // Clic en la imagen grande → ir a modo emoji si no hay foto
    preview.addEventListener('click', () => {
      if (!data.avatarIsPhoto) {
        root.querySelector('[data-mode="emoji"]').click();
      }
    });

    // Tabs modo
    root.querySelector('#avModeTabs').addEventListener('click', e => {
      const t = e.target.closest('[data-mode]'); if (!t) return;
      const mode = t.dataset.mode;
      root.querySelectorAll('.av-tab').forEach(x => x.classList.toggle('active', x.dataset.mode === mode));
      root.querySelector('#panelEmoji').style.display = mode === 'emoji' ? '' : 'none';
      root.querySelector('#panelPhoto').style.display = mode === 'photo' ? '' : 'none';
    });

    // Grid de emojis
    const grid = root.querySelector('#onbAvatars');
    if (grid) {
      grid.addEventListener('click', e => {
        const b = e.target.closest('[data-av]'); if (!b) return;
        data.avatar = b.dataset.av;
        data.avatarIsPhoto = false;
        grid.querySelectorAll('.av-emoji-btn').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        updatePreview(preview, data.avatar);
      });
    }

    // Inputs de archivo (galería y cámara)
    async function handleFile(file) {
      if (!file) return;
      const maxMB = 10;
      if (file.size > maxMB * 1024 * 1024) { toast('Imagen muy grande (máx 10MB)', 'error'); return; }
      try {
        root.querySelector('#onbNext').disabled = true;
        root.querySelector('#onbNext').textContent = 'Procesando...';
        const b64 = await compressAvatar(file);
        data.avatar = b64;
        data.avatarIsPhoto = true;
        updatePreview(preview, b64);
        // Actualizar hint
        const hint = root.querySelector('.photo-hint, .photo-confirm');
        if (hint) { hint.className = 'photo-confirm'; hint.textContent = '✓ Foto cargada — se ve arriba'; }
      } catch (e) {
        toast('No se pudo cargar la foto', 'error');
      } finally {
        const btn = root.querySelector('#onbNext');
        if (btn) { btn.disabled = false; btn.textContent = 'Siguiente →'; }
      }
    }

    const photoFile   = root.querySelector('#photoFile');
    const photoCamera = root.querySelector('#photoCamera');
    if (photoFile)   photoFile.addEventListener('change',   () => handleFile(photoFile.files[0]));
    if (photoCamera) photoCamera.addEventListener('change', () => handleFile(photoCamera.files[0]));
  }

  function updatePreview(el, avatar) {
    el.innerHTML = avatarHtml(avatar, 90, 'onb-av-inner');
  }

  function wireStyle() {
    const sample = root.querySelector('#onbSample');
    root.querySelector('#onbPacks').addEventListener('click', e => {
      const b = e.target.closest('[data-pack]'); if (!b) return;
      data.pack = b.dataset.pack;
      root.querySelectorAll('.pack-card').forEach(x => {
        const sel = x.dataset.pack === data.pack;
        x.classList.toggle('selected', sel);
        // Mostrar/ocultar check
        const chk = x.querySelector('.pack-check');
        if (sel && !chk) { const d = document.createElement('div'); d.className='pack-check'; d.textContent='✓'; x.appendChild(d); }
        else if (!sel && chk) chk.remove();
      });
      if (sample) sample.innerHTML = '"' + getQuote(new Date().getDate(), data.pack, data.name) + '"';
    });
  }

  function wireGoals() {
    const input = root.querySelector('#onbGoalInput');
    const add = () => {
      const v = input.value.trim();
      if (!v) return;
      if (data.goals.length >= 6) { toast('Máximo 6 metas', 'error'); return; }
      data.goals.push(v); input.value = '';
      root.querySelector('#onbGoals').innerHTML = renderGoals();
      rewireGoalDel();
    };
    root.querySelector('#onbGoalAdd').addEventListener('click', add);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    rewireGoalDel();
  }
  function rewireGoalDel() {
    root.querySelector('#onbGoals')?.addEventListener('click', e => {
      const b = e.target.closest('[data-goal-del]'); if (!b) return;
      data.goals.splice(+b.dataset.goalDel, 1);
      root.querySelector('#onbGoals').innerHTML = renderGoals();
      rewireGoalDel();
    });
  }

  function wireHabits() {
    root.querySelector('.tpl-list').addEventListener('click', e => {
      const b = e.target.closest('[data-tpl]'); if (!b) return;
      const i = +b.dataset.tpl;
      if (data.habits.has(i)) data.habits.delete(i); else data.habits.add(i);
      b.classList.toggle('on', data.habits.has(i));
      const cnt = root.querySelector('#tplCount');
      if (cnt) cnt.textContent = `${data.habits.size} hábito${data.habits.size === 1 ? '' : 's'} seleccionado${data.habits.size === 1 ? '' : 's'}`;
    });
  }

  // ── Siguiente / Guardar ───────────────────────────────────
  function onNext() {
    if (step === 0) {
      const name = root.querySelector('#onbName').value.trim();
      if (!name) { toast('Ponle un nombre a tu personaje', 'error'); return; }
      data.name = name;
    }
    if (step === 3 && data.habits.size === 0) {
      toast('Selecciona al menos un hábito para empezar', 'error'); return;
    }
    if (step < TOTAL - 1) { step++; render(); return; }
    finish();
  }

  function finish() {
    const s = getState();
    s.settings.playerName = data.name;
    s.settings.avatar = data.avatar;
    s.settings.phrasePack = data.pack;
    s.goals = [...data.goals];
    s.habits = [...data.habits].map((idx, i) => ({
      id: String(Date.now() + i),
      ...templates[idx],
    }));
    s.onboarded = true;
    saveState();
    confetti();
    root.classList.add('hidden');
    root.innerHTML = '';
    onDone();
  }

  render();
}
