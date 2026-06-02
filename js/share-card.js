/* ============================================================
   share-card.js — Tarjeta semanal compartible (Canvas API)
   Genera una imagen PNG bella para compartir a WhatsApp/IG
   ============================================================ */

import { getState } from './state.js';
import { getLevel, getRank, dayCounts } from './game.js';
import { toast } from './ux.js';

const W = 1080, H = 1080;
const GOLD = '#c9a84c', GOLD2 = '#f0c060', GREEN = '#4caf7d';
const BG = '#080a0e', BG2 = '#0c0f16', BG3 = '#11151e';
const TEXT = '#eaeaea', TEXT2 = '#8a8f9e';

function loadFont() {
  // Las fuentes Google Fonts pueden no estar disponibles en Canvas worker
  // Usamos system fallback
  return "'Cinzel', Georgia, serif";
}

export async function generateShareCard() {
  return new Promise(async resolve => {
    const s = getState();
    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const level = getLevel(s.totalPoints);
    const rank  = getRank(s.totalPoints);
    const { done, total, pct } = dayCounts(s);
    const weekTotal = s.weekData.reduce((a, b) => a + b, 0);
    const name = s.settings.playerName || 'Campeón';
    const avatar = s.settings.avatar || '🦸';

    // --- Fondo ---
    const grad = ctx.createRadialGradient(W/2, H * 0.3, 0, W/2, H * 0.3, W * 0.7);
    grad.addColorStop(0, '#161b26');
    grad.addColorStop(1, BG);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // --- Borde dorado sutil ---
    ctx.strokeStyle = 'rgba(201,168,76,0.2)';
    ctx.lineWidth = 3;
    roundRect(ctx, 20, 20, W - 40, H - 40, 32);
    ctx.stroke();

    // --- Logo DG444 arriba ---
    ctx.font = `900 52px ${loadFont()}`;
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.fillText('DG', W / 2 - 60, 90);
    ctx.fillStyle = GOLD;
    ctx.fillText('444', W / 2 + 60, 90);

    ctx.font = `400 18px 'DM Sans', sans-serif`;
    ctx.fillStyle = TEXT2;
    ctx.letterSpacing = '4px';
    ctx.fillText('HABIT & LEVEL SYSTEM', W / 2, 118);
    ctx.letterSpacing = '0px';

    // --- Separador ---
    ctx.strokeStyle = 'rgba(201,168,76,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, 140); ctx.lineTo(W - 80, 140); ctx.stroke();

    // --- Avatar grande (emoji o foto) ---
    if (avatar && avatar.startsWith('data:')) {
      await new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(W / 2, 240, 90, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, W / 2 - 90, 150, 180, 180);
          ctx.restore();
          resolve();
        };
        img.onerror = resolve;
        img.src = avatar;
      });
    } else {
      ctx.font = '120px serif';
      ctx.textAlign = 'center';
      ctx.fillText(avatar || '🦸', W / 2, 295);
    }

    // --- Nombre y rango ---
    ctx.font = `700 58px ${loadFont()}`;
    ctx.fillStyle = TEXT;
    ctx.fillText(name, W / 2, 375);

    ctx.font = `500 26px 'DM Sans', sans-serif`;
    ctx.fillStyle = GOLD;
    ctx.fillText(`${rank.icon}  ${rank.name}  •  Nivel ${level}`, W / 2, 418);

    // --- Separador ---
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, 448); ctx.lineTo(W - 80, 448); ctx.stroke();

    // --- Stats principales (3 columnas) ---
    const stats = [
      { val: String(s.streak),        label: 'Días de racha', color: '#e05252', icon: '🔥' },
      { val: String(weekTotal),        label: 'Esta semana',   color: GREEN,     icon: '✅' },
      { val: String(s.perfectDays),   label: 'Días perfectos',color: GOLD,      icon: '👑' },
    ];
    const colW = (W - 160) / 3;
    stats.forEach((st, i) => {
      const cx = 80 + colW * i + colW / 2;
      // Card background
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      roundRect(ctx, 80 + colW * i + 8, 468, colW - 16, 180, 20);
      ctx.fill();

      ctx.font = '44px serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.icon, cx, 528);

      ctx.font = `900 56px ${loadFont()}`;
      ctx.fillStyle = st.color;
      ctx.fillText(st.val, cx, 600);

      ctx.font = `400 20px 'DM Sans', sans-serif`;
      ctx.fillStyle = TEXT2;
      ctx.fillText(st.label, cx, 628);
    });

    // --- Barra de progreso semanal ---
    const barY = 690, barH = 16;
    const DAY_LABELS = ['L','M','X','J','V','S','D'];
    const maxVal = Math.max(1, ...s.weekData);
    const barAreaW = W - 160;
    const barW = barAreaW / 7 - 12;

    s.weekData.forEach((val, i) => {
      const x = 80 + i * (barAreaW / 7) + 6;
      const barHeight = Math.max(8, (val / maxVal) * 80);
      const barTop = barY + 80 - barHeight;
      const today = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

      ctx.fillStyle = i === today ? 'rgba(76,175,125,0.3)' : 'rgba(255,255,255,0.05)';
      roundRect(ctx, x, barY, barW, 80, 8);
      ctx.fill();

      if (val > 0) {
        const grad2 = ctx.createLinearGradient(0, barTop, 0, barY + 80);
        grad2.addColorStop(0, i === today ? GREEN : GOLD2);
        grad2.addColorStop(1, i === today ? '#3a8f64' : GOLD);
        ctx.fillStyle = grad2;
        roundRect(ctx, x, barTop, barW, barHeight, 8);
        ctx.fill();
      }

      ctx.font = `600 18px 'DM Sans', sans-serif`;
      ctx.fillStyle = i === today ? GREEN : TEXT2;
      ctx.textAlign = 'center';
      ctx.fillText(DAY_LABELS[i], x + barW / 2, barY + 104);
    });

    // --- XP total ---
    ctx.font = `900 38px ${loadFont()}`;
    ctx.fillStyle = GOLD;
    ctx.textAlign = 'center';
    ctx.fillText(`${s.totalPoints.toLocaleString()} XP`, W / 2, 840);

    // --- Metas (si tiene) ---
    if (s.goals?.length) {
      ctx.font = `400 20px 'DM Sans', sans-serif`;
      ctx.fillStyle = TEXT2;
      const goal = s.goals[0];
      ctx.fillText(`🎯 ${goal}${s.goals.length > 1 ? ` + ${s.goals.length - 1} más` : ''}`, W / 2, 878);
    }

    // --- Footer ---
    ctx.strokeStyle = 'rgba(201,168,76,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, 900); ctx.lineTo(W - 80, 900); ctx.stroke();

    ctx.font = `400 22px 'DM Sans', sans-serif`;
    ctx.fillStyle = 'rgba(201,168,76,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('DG444 — Habit & Level System', W / 2, 960);

    // Fecha
    ctx.font = `400 18px 'DM Sans', sans-serif`;
    ctx.fillStyle = TEXT2;
    ctx.fillText(new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), W / 2, 994);

    resolve(canvas);
  });
}

export async function downloadShareCard() {
  toast('Generando tarjeta... 📸', '');
  try {
    const canvas = await generateShareCard();
    const link = document.createElement('a');
    link.download = `dg444-semana-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast('✅ Tarjeta descargada. ¡Compártela!', 'success');
  } catch (e) {
    toast('Error al generar la tarjeta', 'error');
    console.error(e);
  }
}

export async function shareCard() {
  try {
    const canvas = await generateShareCard();
    canvas.toBlob(async blob => {
      const file = new File([blob], 'dg444-semana.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mi semana en DG444', text: '¡Mira mi progreso! 🔥' });
      } else {
        // Fallback: descargar
        downloadShareCard();
      }
    }, 'image/png');
  } catch (e) {
    downloadShareCard();
  }
}

// Helper: roundRect polyfill
function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
