/* ============================================================
   ux.js — Animaciones, toast, XP pop, confetti, haptics, modal
   ============================================================ */

// Frases motivacionales en "packs". {name} se reemplaza por el personaje del usuario.
// El usuario elige su pack en el onboarding → cada quien ve frases con su estilo.
export const PHRASE_PACKS = {
  disciplina: {
    label: 'Disciplina', icon: '🥷', desc: 'Frío, enfocado, imparable',
    phrases: [
      'La disciplina es el puente entre las metas y los logros.',
      'No busques ser motivado. Busca ser <b>disciplinado</b>.',
      'Cada hábito que cumples es un voto por la persona que quieres ser.',
      'El éxito no es un evento. Es el resultado de <b>hábitos diarios</b>.',
      'La racha no es un número. Es tu <b>identidad</b>.',
      'Hoy decides quién eres mañana.',
      'No te compares con otros. Compárate con quien eras ayer.',
      'El dolor de la disciplina pesa onzas. El de las consecuencias pesa toneladas.',
      'Cada día que cumples es un ladrillo. Construye el castillo.',
      '{name} no pide permiso. Se lo gana todos los días.',
      'La constancia vence al talento cuando el talento no es constante.',
      'Lo que haces todos los días importa más que lo que haces de vez en cuando.',
    ],
  },
  guerrero: {
    label: 'Guerrero', icon: '⚔️', desc: 'Épico, batalla diaria',
    phrases: [
      'Los grandes no nacieron grandes. Se construyeron día a día.',
      'Hoy es otra batalla. Y los guerreros no se rinden.',
      '{name} no descansa. {name} construye.',
      'Cada hábito conquistado es un enemigo menos.',
      'La gloria se gana en silencio, antes de que nadie mire.',
      'El campo de batalla es tu rutina. Gánala.',
      'No esperes a estar listo. Los valientes avanzan con miedo.',
      'Tu única competencia es el {name} de ayer.',
      'Forja tu carácter en los días que no tienes ganas.',
      'El acero se templa con fuego. Tú, con disciplina.',
      'Quien domina su mañana, domina su destino.',
      'Cae siete veces, levántate ocho.',
    ],
  },
  atleta: {
    label: 'Atleta', icon: '🏆', desc: 'Energía, cuerpo, récord',
    phrases: [
      'Tu cuerpo logra lo que tu mente cree.',
      'El sudor de hoy es la fuerza de mañana.',
      'No cuentes los días, haz que los días cuenten.',
      'Una repetición más. Siempre una más, {name}.',
      'El descanso es parte del entrenamiento, no del abandono.',
      'Los campeones se hacen cuando nadie los ve.',
      'El dolor es temporal. El orgullo es para siempre.',
      'Tu único rival eres tú al despertar.',
      'Pequeños progresos siguen siendo progresos.',
      'Empieza donde estás. Usa lo que tienes. Haz lo que puedas.',
      'La energía que das, la energía que recibes.',
      'Hazlo por el {name} que quieres llegar a ser.',
    ],
  },
  zen: {
    label: 'Equilibrio', icon: '🌿', desc: 'Calma, presencia, mente',
    phrases: [
      'Un día a la vez. Un hábito a la vez.',
      'La paz no es ausencia de caos, es orden interno.',
      'Respira. Avanza. Repite.',
      'La mente es como el agua: en calma, refleja todo con claridad.',
      'No se trata de hacer más, sino de hacer lo importante.',
      'El progreso silencioso también es progreso.',
      'Cuida tu mente como cuidas tu cuerpo, {name}.',
      'Lo simple, hecho con constancia, se vuelve extraordinario.',
      'Hoy elijo presencia sobre prisa.',
      'Las raíces crecen despacio, pero sostienen el árbol entero.',
      'Donde pones tu atención, pones tu vida.',
      'Sé paciente contigo. Estás construyendo algo real.',
    ],
  },
};

export const DEFAULT_PACK = 'disciplina';

function interpolate(text, name) {
  return text.replace(/\{name\}/g, name || 'campeón');
}

export function getQuote(index, packId = DEFAULT_PACK, name = '') {
  const pack = PHRASE_PACKS[packId] || PHRASE_PACKS[DEFAULT_PACK];
  const list = pack.phrases;
  const phrase = list[((index % list.length) + list.length) % list.length];
  return interpolate(phrase, name);
}

// Mensajes normales
export function mascotFor(pct, name = '') {
  const n = name || 'campeón';
  if (pct >= 100) return { avatar: '👑', msg: `¡DÍA PERFECTO, ${n}! Así se construyen los imperios. Brutal.` };
  if (pct >= 90)  return { avatar: '🔥', msg: `Estás a nada del día perfecto, ${n}. No pares. Esto es exactamente de lo que está hecha la grandeza.` };
  if (pct >= 61)  return { avatar: '💪', msg: `¡Casi lo tienes! Unos pasos más y el día es tuyo. ${n} no deja nada a medias.` };
  if (pct >= 31)  return { avatar: '⚔️', msg: 'Vas a mitad de camino. No te detengas ahora — los que se detienen aquí son los que no llegan.' };
  if (pct >= 1)   return { avatar: '🙂', msg: '¡Bien! Ya arrancaste. Mantén el ritmo — los guerreros no paran a mitad del camino.' };
  return { avatar: '😴', msg: `Arranca el día, ${n}. Cada hábito que completes es un ladrillo más en tu castillo.` };
}

// Modo Goggins — sin filtro (David Goggins: "Stay Hard")
export function mascotForGoggins(pct, name = '') {
  const n = name || 'soldado';
  if (pct >= 100) return {
    avatar: '💀',
    msg: `MISIÓN CUMPLIDA, ${n}. Eso es lo que separa a los que llegan de los que solo hablan. Mañana empieza de cero — no celebres demasiado.`,
  };
  if (pct >= 90) return {
    avatar: '😤',
    msg: `"Casi" no existe. Estás al ${pct}% y ya quieres parar. Termina lo que empezaste AHORA. No hay negociación.`,
  };
  if (pct >= 61) return {
    avatar: '🫵',
    msg: `Más de la mitad. Bien. Pero si paras aquí, eres exactamente igual al 80% que nunca llega. ¿Eso quieres ser?`,
  };
  if (pct >= 31) return {
    avatar: '😠',
    msg: `Tu mente ya quiere rendirse. Escúchala — y luego ignórala. Cuando dices "ya es suficiente", apenas estás al 40% de tu capacidad real.`,
  };
  if (pct >= 1) return {
    avatar: '🤨',
    msg: `${pct}%. ¿Eso es todo lo que tienes? Arrancaste, bien. Ahora no hay excusa para parar. Muévete.`,
  };
  return {
    avatar: '😑',
    msg: `Son las ${new Date().getHours()}h y no has hecho nada, ${n}. Cada minuto que pasa, alguien más está construyendo lo que tú solo sueñas. Levántate.`,
  };
}

// ---------- Haptics ----------
export const HAPTIC = {
  check: 40,
  perfect: [60, 40, 120],
  error: 100,
  reward: [50, 30, 80],
};
export function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}

// ---------- Toast ----------
export function toast(message, type = '') {
  const host = document.getElementById('toastHost');
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.innerHTML = message;
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// ---------- XP pop ----------
export function xpPop(amount, x, y) {
  const host = document.getElementById('xppopHost');
  const el = document.createElement('div');
  const neg = amount < 0;
  el.className = 'xppop' + (neg ? ' neg' : '');
  el.textContent = `${neg ? '' : '+'}${amount} XP ${neg ? '💀' : '⚡'}`;
  el.style.left = (x ?? window.innerWidth / 2) + 'px';
  el.style.top = (y ?? window.innerHeight / 2) + 'px';
  el.style.transform = 'translate(-50%, -50%)';
  host.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

// ---------- Confetti ----------
export function confetti() {
  const canvas = document.getElementById('confettiCanvas');
  canvas.classList.remove('hidden');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const W = window.innerWidth, H = window.innerHeight;
  const colors = ['#c9a84c', '#f0c060', '#4caf7d', '#5294e0', '#e05252', '#ffffff'];
  const parts = [];
  for (let i = 0; i < 80; i++) {
    parts.push({
      x: W / 2, y: H / 3,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -14 - 4,
      size: Math.random() * 7 + 3,
      color: colors[i % colors.length],
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 20,
    });
  }
  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.4; // gravedad
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (frame < 180) requestAnimationFrame(tick);
    else { ctx.clearRect(0, 0, W, H); canvas.classList.add('hidden'); }
  }
  requestAnimationFrame(tick);
}

// ---------- Modal helpers ----------
export function openModal(html) {
  const overlay = document.getElementById('modalOverlay');
  const sheet = document.getElementById('modalSheet');
  sheet.innerHTML = `<div class="modal-handle"></div>${html}`;
  overlay.classList.remove('hidden', 'closing');
  document.body.style.overflow = 'hidden';
  return sheet;
}
export function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay.classList.contains('hidden')) return;
  overlay.classList.add('closing');
  document.body.style.overflow = '';
  setTimeout(() => overlay.classList.add('hidden'), 250);
}

// Cerrar modal al tocar el fondo
export function initModalDismiss() {
  const overlay = document.getElementById('modalOverlay');
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
}

// ============================================================
// Badge unlock celebration
// ============================================================

export function showBadgeUnlocks(badges) {
  if (!badges?.length) return;
  // Si es solo uno y es significativo → modal dramático
  if (badges.length === 1) {
    _badgeModal(badges[0]);
    return;
  }
  // Varios: toasts secuenciales + modal para el primero
  _badgeModal(badges[0]);
  badges.slice(1).forEach((b, i) => {
    setTimeout(() => {
      toast(`${b.icon} ¡${b.name} desbloqueado!`, 'success');
      try { if (navigator.vibrate) navigator.vibrate([30, 20, 60]); } catch (_) {}
    }, (i + 1) * 2800);
  });
}

function _badgeModal(badge) {
  try { if (navigator.vibrate) navigator.vibrate([60, 30, 120]); } catch (_) {}
  const overlay = document.getElementById('modalOverlay');
  const sheet   = document.getElementById('modalSheet');
  if (!overlay || !sheet) return;
  sheet.innerHTML = `
    <div class="badge-unlock-modal">
      <div class="bum-glow">${badge.icon}</div>
      <div class="bum-label">LOGRO DESBLOQUEADO</div>
      <div class="bum-name">${badge.name}</div>
      <button class="btn btn-primary bum-btn" data-action="close-modal">¡A seguir! 💪</button>
    </div>`;
  overlay.classList.remove('hidden', 'closing');
  document.body.style.overflow = 'hidden';
}

// ============================================================
// Avatar helpers — emoji OR base64 photo
// ============================================================

// Renderiza el avatar como HTML inline (emoji o <img>)
export function avatarHtml(avatar, sizePx = 40, classes = '') {
  if (!avatar) return `<span style="font-size:${sizePx}px" class="${classes}">🦸</span>`;
  if (avatar.startsWith('data:')) {
    return `<img src="${avatar}" class="avatar-img ${classes}"
      style="width:${sizePx}px;height:${sizePx}px;min-width:${sizePx}px" alt="avatar"/>`;
  }
  return `<span style="font-size:${sizePx * 0.85}px;line-height:1" class="${classes}">${avatar}</span>`;
}

// Comprime una imagen File a un cuadrado JPEG 200×200 en base64
export function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200; canvas.height = 200;
        const ctx = canvas.getContext('2d');
        // Recortar cuadrado centrado
        const sz = Math.min(img.width, img.height);
        const ox = (img.width - sz) / 2;
        const oy = (img.height - sz) / 2;
        // Círculo
        ctx.beginPath();
        ctx.arc(100, 100, 100, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, ox, oy, sz, sz, 0, 0, 200, 200);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Emojis disponibles para hábitos / categorías (22+ opciones)
export const EMOJI_OPTIONS = [
  '🏋️','💊','🍶','🧪','🦴','🥗','📖','🙏','💼','💧',
  '🏃','🧘','🚭','☀️','🌙','🎯','✍️','🎸','💰','🧠',
  '❤️','⚡','🔥','💪','📈','🎮','📺','🍔','✈️','🛍️',
];
