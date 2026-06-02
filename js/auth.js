/* ============================================================
   auth.js — Perfiles locales: registro / login (usuario + contraseña)
   ------------------------------------------------------------
   Nota: es seguridad LOCAL (no hay servidor). La contraseña se
   guarda como hash SHA-256 con salt aleatorio, solo para que
   varias personas puedan tener su perfil en el mismo dispositivo.
   ============================================================ */

import { setActiveUser, loadState } from './state.js';

const ACCOUNTS_KEY = 'dg444_accounts';
const SESSION_KEY = 'dg444_session';

function readAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {}; }
  catch (e) { return {}; }
}
function writeAccounts(acc) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(acc));
}

export function listUsernames() {
  return Object.values(readAccounts())
    .sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0))
    .map(a => a.username);
}

// Devuelve el avatar guardado en el estado del usuario (para los chips del login)
export function getUserAvatar(username) {
  try {
    const key = 'dg444_state__' + normalize(username);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.settings?.avatar || null;
  } catch (e) { return null; }
}
export function accountMeta(username) {
  return readAccounts()[normalize(username)] || null;
}
export function accountCount() {
  return Object.keys(readAccounts()).length;
}

function normalize(u) { return String(u).trim().toLowerCase(); }

// SHA-256(salt + password) en hex
async function hash(password, salt) {
  const data = new TextEncoder().encode(salt + ':' + password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function randomSalt() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function validateUsername(username) {
  const u = String(username).trim();
  if (u.length < 3) return 'El usuario debe tener al menos 3 caracteres';
  if (u.length > 20) return 'El usuario es demasiado largo (máx 20)';
  if (!/^[a-zA-Z0-9_]+$/.test(u)) return 'Solo letras, números y guion bajo (_)';
  return null;
}

export async function signup(username, password, displayName) {
  const err = validateUsername(username);
  if (err) throw new Error(err);
  if (String(password).length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');

  const accounts = readAccounts();
  const key = normalize(username);
  if (accounts[key]) throw new Error('Ese usuario ya existe en este dispositivo');

  const salt = randomSalt();
  const passHash = await hash(password, salt);
  accounts[key] = {
    username: String(username).trim(),
    display: displayName || String(username).trim(),
    salt, passHash,
    created: new Date().toISOString(),
    lastLogin: Date.now(),
  };
  writeAccounts(accounts);

  // Activar sesión + crear estado fresco del usuario
  localStorage.setItem(SESSION_KEY, key);
  setActiveUser(key);
  loadState();
  return accounts[key];
}

export async function login(username, password) {
  const accounts = readAccounts();
  const key = normalize(username);
  const acc = accounts[key];
  if (!acc) throw new Error('Usuario no encontrado en este dispositivo');
  const passHash = await hash(password, acc.salt);
  if (passHash !== acc.passHash) throw new Error('Contraseña incorrecta');

  acc.lastLogin = Date.now();
  writeAccounts(accounts);
  localStorage.setItem(SESSION_KEY, key);
  setActiveUser(key);
  loadState();
  return acc;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  setActiveUser(null);
}

// Devuelve la cuenta de la sesión actual (o null) y la deja activa en state.js
export function restoreSession() {
  const key = localStorage.getItem(SESSION_KEY);
  if (!key) return null;
  const acc = readAccounts()[key];
  if (!acc) { localStorage.removeItem(SESSION_KEY); return null; }
  setActiveUser(key);
  loadState();
  return acc;
}

export function currentUserKey() {
  return localStorage.getItem(SESSION_KEY);
}
