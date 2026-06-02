/* ============================================================
   game.js — XP, niveles, rangos, rachas, badges, freeze, recovery
   ============================================================ */

import {
  getState, saveState, getDayCode, todayISO, daysBetween,
  XP_BY_DIFFICULTY, XP_MVH, XP_KEYSTONE_BONUS, XP_PERFECT_BONUS, XP_PER_LEVEL,
  FREEZE_MAX, FREEZE_EARN_EVERY, RECOVERY_DAYS_NEEDED,
} from './state.js';

export const RANKS = [
  { name: 'Novato',    icon: '🪵', min: 0 },
  { name: 'Guerrero',  icon: '🛡️', min: 500 },
  { name: 'Élite',     icon: '⚔️', min: 2000 },
  { name: 'Leyenda',   icon: '👑', min: 5000 },
  { name: 'Imparable', icon: '🔱', min: 10000 },
];

export const BADGES = [
  { id: 'streak7',   icon: '🔥', name: '7 días de racha',       cond: s => s.streak >= 7 },
  { id: 'streak21',  icon: '⚡', name: 'Racha 21 días',          cond: s => s.streak >= 21 },
  { id: 'pts1000',   icon: '💎', name: '1,000 puntos',           cond: s => s.totalPoints >= 1000 },
  { id: 'pts5000',   icon: '💠', name: '5,000 puntos',           cond: s => s.totalPoints >= 5000 },
  { id: 'perfect1',  icon: '🌟', name: 'Día perfecto',           cond: s => s.perfectDays >= 1 },
  { id: 'perfect10', icon: '✨', name: '10 días perfectos',      cond: s => s.perfectDays >= 10 },
  { id: 'warrior',   icon: '🛡️', name: 'Guerrero desbloqueado',  cond: s => s.totalPoints >= 500 },
  { id: 'legend',    icon: '👑', name: 'Leyenda desbloqueada',   cond: s => s.totalPoints >= 5000 },
  { id: 'freezer',   icon: '🧊', name: 'Racha congelada',        cond: s => s.freezesEarned > 0 },
  { id: 'comeback',  icon: '🔄', name: 'Regreso épico',          cond: s => s.recovery && !s.recovery.active },
];

export function getLevel(points) { return Math.floor(Math.max(0, points) / XP_PER_LEVEL) + 1; }
export function getLevelProgress(points) { return Math.max(0, points) % XP_PER_LEVEL; }
export function getRank(points) { let r = RANKS[0]; for (const x of RANKS) if (points >= x.min) r = x; return r; }
export function nextRank(points) { return RANKS.find(r => r.min > points) || null; }

export function getDayCode_() { return getDayCode(); }

// Hábitos activos para hoy
export function todayHabits(state = getState()) {
  const code = getDayCode();
  return state.habits.filter(h => h.days.includes(code));
}

export function isCompleted(habitId, state = getState()) {
  return !!state.completedToday[habitId];
}
export function isMVH(habitId, state = getState()) {
  return state.completedToday[habitId] === 'mvh';
}

export function dayCounts(state = getState()) {
  const today = todayHabits(state);
  const done = today.filter(h => isCompleted(h.id, state)).length;
  return { done, total: today.length, pct: today.length ? Math.round((done / today.length) * 100) : 0 };
}

export function unlockedBadges(state = getState()) {
  return BADGES.map(b => ({ ...b, unlocked: b.cond(state) }));
}

// XP real de un hábito según dificultad y modo de completado
export function habitXP(habit, mode = 'full') {
  if (mode === 'mvh') return XP_MVH;
  return XP_BY_DIFFICULTY[habit.difficulty || 'normal'] || 50;
}

// Variable reward: asigna hábito con 2x XP si corresponde
export function checkVariableReward() {
  const s = getState();
  if (!s.settings.variableRewardsEnabled) return;
  const today = todayISO();
  if (s.variableRewardDate === today) return; // ya asignado hoy
  const roll = Math.random();
  if (roll < 0.35) { // 35% de probabilidad
    const habits = todayHabits(s);
    if (habits.length) {
      const lucky = habits[Math.floor(Math.random() * habits.length)];
      s.variableRewardHabitId = lucky.id;
    }
  } else {
    s.variableRewardHabitId = null;
  }
  s.variableRewardDate = today;
  saveState();
}

// Semana
function weekIndexFor(date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}
export function getWeekIndex() { return weekIndexFor(); }

export function bumpWeekData(delta) {
  const s = getState();
  const idx = weekIndexFor();
  s.weekData[idx] = Math.max(0, (s.weekData[idx] || 0) + delta);
  saveState();
}

// Identity score por categoría (% de completaciones relativo a la mayor)
export function identityScores(state = getState()) {
  const cc = state.categoryCompletions || {};
  const max = Math.max(1, ...Object.values(cc));
  return state.categories.map(c => ({
    ...c,
    score: Math.round(((cc[c.id] || 0) / max) * 100),
    count: cc[c.id] || 0,
  })).sort((a, b) => b.score - a.score);
}

// Efecto compuesto: proyección basada en racha actual
export function compoundProjections(state = getState()) {
  const today = todayHabits(state);
  if (!today.length) return [];
  const { done, total } = dayCounts(state);
  const rate = total ? done / total : 0;
  const daily = Math.round(total * rate);
  return [
    { label: '30 días', value: Math.round(daily * 30) + ' completaciones' },
    { label: '1 año',   value: Math.round(daily * 365) + ' completaciones' },
    { label: '3 años',  value: (Math.round(daily * 365 * 3 / 100) / 10).toFixed(1) + 'k completaciones' },
  ];
}

// ---------- CAMBIO DE DÍA — lógica principal ----------
export function checkDayReset() {
  const s = getState();
  const today = todayISO();
  const result = {
    changed: false, penalized: 0, penaltyPoints: 0,
    streakBroken: false, freezeUsed: false,
    recoveryStarted: false, recoveryProgress: null, recoveryCompleted: false,
    missedHabits: [],   // para el protocolo "Nunca Falles Dos Veces"
    leveledUp: false, newLevel: 0,
  };
  if (s.lastDate === today) return result;

  result.changed = true;
  const prevLvl = getLevel(s.totalPoints);
  const gap = daysBetween(s.lastDate, today);

  // Hábitos del día anterior que no se completaron
  const prevDate = new Date(s.lastDate + 'T00:00:00');
  const prevCode = ['D','L','M','X','J','V','S'][prevDate.getDay()];
  const prevHabits = s.habits.filter(h => h.days.includes(prevCode));
  const completedPrev = prevHabits.filter(h => isCompleted(h.id, s)).length;

  result.missedHabits = prevHabits
    .filter(h => !isCompleted(h.id, s))
    .map(h => ({ id: h.id, name: h.name, emoji: h.emoji }));

  // Penalización XP
  if (s.settings.penaltyEnabled) {
    const missed = result.missedHabits.length;
    if (missed > 0) {
      result.penalized = missed;
      result.penaltyPoints = missed * 30; // 30 por hábito en modo penalización
      s.totalPoints -= result.penaltyPoints;
    }
  }

  // Racha y freezes
  if (gap === 1 && completedPrev >= 1) {
    // Día exitoso → aumentar racha
    s.streak += 1;

    // ¿Ganar un freeze token?
    if (s.streak % FREEZE_EARN_EVERY === 0 && s.freezes < FREEZE_MAX) {
      s.freezes = Math.min(FREEZE_MAX, s.freezes + 1);
      s.freezesEarned += 1;
    }

    // Actualizar recovery si estaba activo
    if (s.recovery?.active) {
      s.recovery.daysCompleted += 1;
      result.recoveryProgress = s.recovery.daysCompleted;
      if (s.recovery.daysCompleted >= s.recovery.daysNeeded) {
        const recovered = Math.floor(s.recovery.originalStreak / 2);
        s.streak = Math.max(s.streak, recovered);
        s.recovery = { ...s.recovery, active: false };
        result.recoveryCompleted = true;
      }
    }
  } else {
    // Día fallido o salto de días
    if (s.streak > 0) {
      if (s.freezes > 0 && gap === 1) {
        // Usar freeze — la racha se salva
        s.freezes -= 1;
        result.freezeUsed = true;
        // No resetear racha ni recovery
      } else {
        // Racha rota — iniciar recovery si la racha era significativa
        result.streakBroken = true;
        if (s.streak >= 3 && !s.recovery?.active) {
          s.recovery = {
            active: true,
            originalStreak: s.streak,
            daysNeeded: RECOVERY_DAYS_NEEDED,
            daysCompleted: 0,
            startDate: today,
          };
          result.recoveryStarted = true;
        }
        s.streak = 0;
      }
    } else if (s.recovery?.active) {
      // Estaba en recovery y falló de nuevo → resetear progress
      s.recovery.daysCompleted = 0;
    }
  }

  // Rachas individuales por hábito
  if (!s.habitStreaks) s.habitStreaks = {};
  for (const h of s.habits) {
    if (!h.days.includes(prevCode)) continue; // no estaba programado ayer
    if (!s.habitStreaks[h.id]) s.habitStreaks[h.id] = { streak: 0 };
    if (s.completedToday[h.id]) {
      s.habitStreaks[h.id].streak = (s.habitStreaks[h.id].streak || 0) + 1;
    } else {
      s.habitStreaks[h.id].streak = 0;
    }
  }

  // Reset semanal si hay salto
  rollWeekData(s, gap);

  // Resetear estado del día
  s.completedToday = {};
  s.keystoneCompleted = false;
  s.dailyIntention = null;
  s.lastDate = today;
  s.quoteIndex = new Date().getDate() % 15;

  // Variable reward del nuevo día
  saveState();
  checkVariableReward();

  // ¿Subió de nivel?
  const newLvl = getLevel(s.totalPoints);
  if (newLvl > prevLvl) { result.leveledUp = true; result.newLevel = newLvl; }

  saveState();
  return result;
}

function rollWeekData(s, gap) {
  if (gap >= 7) { s.weekData = [0,0,0,0,0,0,0]; return; }
  const todayIdx = weekIndexFor();
  const crossedMonday = gap >= 1 && todayIdx < gap;
  if (crossedMonday) s.weekData = [0,0,0,0,0,0,0];
  s.weekData[todayIdx] = 0;
}

// Badges nuevos desbloqueados — devuelve los que no se habían celebrado aún
export function checkBadgeUnlocks() {
  const s = getState();
  if (!Array.isArray(s.earnedBadges)) s.earnedBadges = [];
  const newBadges = BADGES.filter(b => b.cond(s) && !s.earnedBadges.includes(b.id));
  if (newBadges.length) {
    s.earnedBadges.push(...newBadges.map(b => b.id));
    saveState();
  }
  return newBadges;
}

// Aplicar XP ganado con feedback de nivel
export function applyXP(delta) {
  const s = getState();
  const prevLvl = getLevel(s.totalPoints);
  s.totalPoints += delta;
  saveState();
  const newLvl = getLevel(s.totalPoints);
  return { leveledUp: newLvl > prevLvl, newLevel: newLvl };
}
