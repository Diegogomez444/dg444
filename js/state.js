/* ============================================================
   state.js — Estado por usuario + persistencia localStorage
   ============================================================ */

export const STORAGE_PREFIX = 'dg444_state__';
export const LEGACY_KEY = 'dg444_state';
export const SCHEMA_VERSION = 3;

export const DAY_MAP = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const DAY_LABELS = { L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue', V: 'Vie', S: 'Sáb', D: 'Dom' };
export const DAY_ORDER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// XP por dificultad
export const XP_BY_DIFFICULTY = { easy: 30, normal: 50, hard: 80 };
export const XP_MVH      = 25;   // versión mínima viable
export const XP_KEYSTONE_BONUS = 100;
export const XP_PERFECT_BONUS  = 200;
export const XP_PER_LEVEL       = 500;
// Alias para compatibilidad
export const XP_PER_HABIT  = 50;
export const PERFECT_BONUS = 200;

export const FREEZE_MAX           = 3;
export const FREEZE_EARN_EVERY    = 7;  // cada 7 días de racha se gana 1 freeze
export const RECOVERY_DAYS_NEEDED = 3;  // días seguidos para recuperar racha

export function getDayCode(date = new Date()) { return DAY_MAP[date.getDay()]; }

export function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(isoA, isoB) {
  const a = new Date(isoA + 'T00:00:00');
  const b = new Date(isoB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

// ---------- Defaults ----------
export function defaultCategories() {
  return [
    { id: 'salud',   icon: '💪', name: 'Salud & Cuerpo' },
    { id: 'mente',   icon: '🧠', name: 'Mente & Aprendizaje' },
    { id: 'negocio', icon: '📈', name: 'Negocio & Disciplina' },
    { id: 'familia', icon: '❤️', name: 'Personal & Familia' },
    { id: 'bio',     icon: '⚡', name: 'Energía & Biohacking' },
  ];
}

export function suggestedHabits() {
  const all = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const wd  = ['L', 'M', 'X', 'J', 'V'];
  return [
    { name: 'Ir al gym',              emoji: '🏋️', days: [...wd],  cat: 'salud',   difficulty: 'hard',   mvh: '10 sentadillas en casa', anchor: '' },
    { name: 'Alimentarme sano',       emoji: '🥗', days: [...all], cat: 'salud',   difficulty: 'normal', mvh: 'Sin azúcar el día', anchor: '' },
    { name: 'Tomar agua',             emoji: '💧', days: [...all], cat: 'salud',   difficulty: 'easy',   mvh: '1 vaso al despertar', anchor: '' },
    { name: 'Dormir 8 horas',         emoji: '😴', days: [...all], cat: 'salud',   difficulty: 'normal', mvh: 'Acostarse antes de medianoche', anchor: '' },
    { name: 'Correr / cardio',        emoji: '🏃', days: ['L','X','V'], cat: 'salud', difficulty: 'hard', mvh: '10 min caminata', anchor: '' },
    { name: 'Leer 10 páginas',        emoji: '📖', days: [...all], cat: 'mente',   difficulty: 'normal', mvh: '1 página', anchor: 'Después de cenar' },
    { name: 'Meditar 10 min',         emoji: '🧘', days: [...all], cat: 'mente',   difficulty: 'normal', mvh: '2 min de respiración', anchor: 'Al despertar' },
    { name: 'Agradecer',              emoji: '🙏', days: [...all], cat: 'mente',   difficulty: 'easy',   mvh: 'Decir 1 cosa en voz alta', anchor: 'Antes de dormir' },
    { name: 'Aprender algo nuevo',    emoji: '🧠', days: [...wd],  cat: 'mente',   difficulty: 'normal', mvh: '5 min de podcast/video', anchor: '' },
    { name: 'Estudiar / trabajar 1h', emoji: '💼', days: [...wd],  cat: 'negocio', difficulty: 'hard',   mvh: '20 min de trabajo enfocado', anchor: 'Al llegar al escritorio' },
    { name: 'Planear el día',         emoji: '🎯', days: [...all], cat: 'negocio', difficulty: 'easy',   mvh: 'Anotar 1 tarea prioritaria', anchor: 'Al despertar' },
    { name: 'Sin redes 1h',           emoji: '🚭', days: [...all], cat: 'negocio', difficulty: 'normal', mvh: '20 min sin teléfono', anchor: '' },
    { name: 'Hablar con la familia',  emoji: '👨‍👩‍👦', days: [...all], cat: 'familia', difficulty: 'easy',  mvh: 'Mensaje de voz rápido', anchor: '' },
    { name: 'Llamar a un amigo',      emoji: '📞', days: ['S','D'], cat: 'familia', difficulty: 'easy',  mvh: 'Mandar audio de WhatsApp', anchor: '' },
    { name: 'Tomar creatina',         emoji: '💊', days: [...all], cat: 'bio',     difficulty: 'easy',   mvh: '', anchor: 'Después del gym' },
    { name: 'Tomar vitaminas',        emoji: '🧪', days: [...all], cat: 'bio',     difficulty: 'easy',   mvh: '', anchor: 'Con el desayuno' },
    { name: 'Sol en la mañana',       emoji: '☀️', days: [...all], cat: 'bio',     difficulty: 'easy',   mvh: '5 min en el balcón', anchor: 'Al despertar' },
  ];
}

export function defaultRewards() {
  return [
    { id: 'r1', name: 'Ver una serie',       emoji: '📺', cost: 500,  desc: 'Mereces un capítulo sin culpa' },
    { id: 'r2', name: 'Comida libre',        emoji: '🍔', cost: 800,  desc: 'Un día sin restricciones' },
    { id: 'r3', name: 'Gaming sin culpa',    emoji: '🎮', cost: 600,  desc: '3 horas de entretenimiento puro' },
    { id: 'r4', name: 'Tarde libre',         emoji: '🌴', cost: 1200, desc: 'Sin trabajo ni obligaciones' },
    { id: 'r5', name: 'Compra personal',     emoji: '🛍️', cost: 2000, desc: 'Cómprate algo que quieras' },
    { id: 'r6', name: 'Masaje o spa',        emoji: '💆', cost: 2500, desc: 'Recuperación total merecida' },
    { id: 'r7', name: 'Restaurante de lujo', emoji: '🍽️', cost: 3000, desc: 'Sal a comer a donde quieras' },
    { id: 'r8', name: 'Día de viaje',        emoji: '✈️', cost: 8000, desc: 'Escápate a donde quieras' },
  ];
}

export function defaultSettings() {
  return {
    penaltyEnabled: true,
    streakWarningEnabled: true,
    debtRewardsEnabled: false,
    remindersEnabled: true,
    gogginsMode: false,
    variableRewardsEnabled: true,
    playerName: 'Jugador',
    avatar: '🦸',
    phrasePack: 'disciplina',
  };
}

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    onboarded: false,
    goals: [],
    habits: [],
    categories: defaultCategories(),
    rewards: defaultRewards(),
    rewardHistory: {},
    completedToday: {},       // { habitId: 'full' | 'mvh' }
    totalPoints: 0,
    streak: 0,
    lastDate: todayISO(),
    perfectDays: 0,
    totalCompleted: 0,
    weekData: [0, 0, 0, 0, 0, 0, 0],
    settings: defaultSettings(),
    quoteIndex: new Date().getDate() % 15,

    // Prioridad 1 — Retención
    freezes: 2,               // tokens de congelación de racha (empieza con 2)
    freezesEarned: 2,         // total acumulado
    recovery: null,           // { active, originalStreak, daysNeeded, daysCompleted, startDate }
    commitments: [],          // [{ date, habitId, habitName, text }] — Nunca Falles Dos Veces
    keystoneCompleted: false, // el keystone ya se completó hoy

    // Prioridad 2 — Resultados reales
    dailyIntention: null,     // { date, habitId, habitName, time }
    weeklyReviews: [],        // [{ date, q1..q5, rating }]
    habitCompletions: {},     // { habitId: count } — para identity score
    categoryCompletions: {},  // { catId: count } — para identity score
    createdAt: todayISO(),    // para calcular días en la app

    // Prioridad 3 — Viralidad
    variableRewardHabitId: null,
    variableRewardDate: null,

    // Rachas individuales por hábito
    habitStreaks: {},       // { habitId: { streak: N } }

    // Badges celebrados (para no repetir la animación)
    earnedBadges: [],
  };
}

// ---------- Usuario activo ----------
let _state = null;
let _activeKey = LEGACY_KEY;
let _activeUser = null;

export function setActiveUser(username) {
  _activeUser = username || null;
  _activeKey = username ? STORAGE_PREFIX + username : LEGACY_KEY;
  _state = null;
}
export function getActiveUser() { return _activeUser; }

// ---------- Persistencia ----------
export function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(_activeKey); } catch (e) { console.warn('localStorage no disponible', e); }
  if (!raw) { _state = defaultState(); saveState(); return _state; }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { _state = defaultState(); saveState(); return _state; }
  _state = migrate(parsed);
  return _state;
}

function migrate(s) {
  const base = defaultState();
  const merged = { ...base, ...s };
  merged.settings = { ...base.settings, ...(s.settings || {}) };

  if (!Array.isArray(merged.habits)) merged.habits = [];
  if (!Array.isArray(merged.categories)) merged.categories = base.categories;
  if (!Array.isArray(merged.rewards)) merged.rewards = base.rewards;
  if (!Array.isArray(merged.goals)) merged.goals = [];
  if (!Array.isArray(merged.weekData) || merged.weekData.length !== 7) merged.weekData = [0,0,0,0,0,0,0];
  if (!Array.isArray(merged.commitments)) merged.commitments = [];
  if (!Array.isArray(merged.weeklyReviews)) merged.weeklyReviews = [];
  if (typeof merged.rewardHistory !== 'object' || !merged.rewardHistory) merged.rewardHistory = {};
  if (typeof merged.completedToday !== 'object' || !merged.completedToday) merged.completedToday = {};
  if (typeof merged.habitCompletions !== 'object' || !merged.habitCompletions) merged.habitCompletions = {};
  if (typeof merged.categoryCompletions !== 'object' || !merged.categoryCompletions) merged.categoryCompletions = {};
  if (typeof merged.totalPoints !== 'number') merged.totalPoints = 0;
  if (typeof merged.streak !== 'number') merged.streak = 0;
  if (typeof merged.perfectDays !== 'number') merged.perfectDays = 0;
  if (typeof merged.totalCompleted !== 'number') merged.totalCompleted = 0;
  if (typeof merged.habitStreaks !== 'object' || !merged.habitStreaks) merged.habitStreaks = {};
  if (!Array.isArray(merged.earnedBadges)) merged.earnedBadges = [];
  if (typeof merged.freezes !== 'number') merged.freezes = 2;
  if (typeof merged.freezesEarned !== 'number') merged.freezesEarned = 2;
  if (typeof merged.onboarded !== 'boolean') merged.onboarded = true;
  if (!merged.lastDate) merged.lastDate = todayISO();
  if (!merged.createdAt) merged.createdAt = todayISO();

  // Migrar hábitos viejos que no tienen difficulty/mvh/anchor/isKeystone
  merged.habits = merged.habits.map(h => ({
    difficulty: 'normal', mvh: '', anchor: '', isKeystone: false,
    ...h,
  }));

  // Migrar completedToday de boolean a string
  for (const [k, v] of Object.entries(merged.completedToday)) {
    if (v === true) merged.completedToday[k] = 'full';
  }

  merged.version = SCHEMA_VERSION;
  return merged;
}

export function getState() { if (!_state) loadState(); return _state; }

export function saveState() {
  try { localStorage.setItem(_activeKey, JSON.stringify(_state)); }
  catch (e) { console.error('No se pudo guardar el estado', e); }
}

export function resetState() {
  const s = defaultState();
  s.onboarded = true;
  s.settings = { ..._state?.settings || defaultSettings() };
  s.goals = [...(_state?.goals || [])];
  s.habits = [...(_state?.habits || [])];
  s.categories = [...(_state?.categories || defaultCategories())];
  s.rewards = [...(_state?.rewards || defaultRewards())];
  _state = s;
  saveState();
  return _state;
}

export function deleteUserState(username) {
  try { localStorage.removeItem(STORAGE_PREFIX + username); } catch (e) {}
}

export function exportState() { return JSON.stringify(getState(), null, 2); }
export function importState(json) {
  const parsed = JSON.parse(json);
  _state = migrate(parsed);
  saveState();
  return _state;
}
