// Temps d'écran : après `settings.limitMinutes` de jeu (60 par défaut), l'application se bloque.
// - Le temps compté = application visible, hors espace parent et hors écran de blocage.
// - Débloquer : code parent → ajoute `settings.extraMinutes` (15 par défaut) avant le prochain blocage.
// - Le blocage se lève tout seul après `settings.lockMinutes` (60 par défaut) ; le compteur repart à zéro.
//   Une pause aussi longue sans jouer remet aussi le compteur à zéro.
// - Tout est sauvegardé (state.screen) : fermer / relancer l'application ne lève pas le blocage.
import { el } from './render.js';
import { getState, save } from './state.js';
import { speak, stopSpeaking, sfx } from './audio.js';
import { mascotSVG } from './fx.js';

let timer = null;
let overlay = null;
let ticks = 0;

const settings = () => getState().settings;
const scr = () => {
  const st = getState();
  if (!st.screen) st.screen = { used: 0, bonus: 0, lockedAt: null, lastActive: 0 };
  return st.screen;
};
export function limitEnabled() { return settings().limitEnabled !== false; }
const minutes = (v, d) => Math.max(0.05, Number(v) || d); // 0.05 min autorisé pour les tests
export const limitSeconds = () => minutes(settings().limitMinutes, 60) * 60;
export const lockMs = () => minutes(settings().lockMinutes, 60) * 60000;
const extraSeconds = () => minutes(settings().extraMinutes, 15) * 60;

export function isLocked() { return !!scr().lockedAt && Date.now() - scr().lockedAt < lockMs(); }
// Secondes de jeu restantes avant le prochain blocage.
export function remainingSeconds() { const s = scr(); return Math.max(0, limitSeconds() + s.bonus - s.used); }
export function unlockTime() { return scr().lockedAt ? new Date(scr().lockedAt + lockMs()) : null; }

export function resetScreenTime() {
  const s = scr();
  s.used = 0; s.bonus = 0; s.lockedAt = null; s.lastActive = Date.now();
  save();
  hideLock();
}

// Le parent ajoute du temps (après le code) et débloque.
export function addTime(mins) {
  const s = scr();
  const add = mins ? mins * 60 : extraSeconds();
  s.bonus = Math.max(s.bonus, s.used - limitSeconds()) + add;
  s.lockedAt = null;
  s.lastActive = Date.now();
  save();
  hideLock();
}

function lockNow() {
  const s = scr();
  s.lockedAt = Date.now();
  save();
  showLock();
}

function tick() {
  const s = scr();
  const now = Date.now();
  // Fin du blocage : tout repart à zéro.
  if (s.lockedAt && now - s.lockedAt >= lockMs()) { resetScreenTime(); return; }
  if (s.lockedAt) { if (!overlay) showLock(); else refreshClock(); return; }
  if (!limitEnabled() || document.visibilityState !== 'visible') return;
  if (document.querySelector('#app > .pr')) return; // espace parent : on ne compte pas
  // Longue pause sans jouer (au moins la durée d'un blocage) : compteur remis à zéro.
  if (s.lastActive && now - s.lastActive >= lockMs()) { s.used = 0; s.bonus = 0; }
  s.used += 1;
  s.lastActive = now;
  if (++ticks % 5 === 0) save();
  if (s.used >= limitSeconds() + s.bonus) lockNow();
}

export function startScreenTime() {
  if (timer) return;
  const s = scr();
  if (s.lockedAt && Date.now() - s.lockedAt >= lockMs()) resetScreenTime();
  else if (s.lockedAt) showLock();
  timer = setInterval(tick, 1000);
  // Sauvegarde au moment où l'application passe en arrière-plan.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
}

// ── Écran de blocage ─────────────────────────────────────────────────────────
const fmt = (d) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
let clockEl = null;
function refreshClock() { const t = unlockTime(); if (clockEl && t) clockEl.textContent = `🕐 Retour du jeu à ${fmt(t)}`; }

function hideLock() {
  if (overlay) { overlay.remove(); overlay = null; clockEl = null; }
}

function showLock() {
  if (overlay) return;
  stopSpeaking();
  if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { /* */ }
  clockEl = el('div', { class: 'lock-clock' });
  const body = el('div', { class: 'lock-body' });
  const card = el('div', { class: 'lock-card' },
    el('div', { class: 'lock-owl', html: mascotSVG('happy') }),
    el('div', { class: 'lock-title' }, '🌙 C’est l’heure de faire une pause !'),
    el('div', { class: 'lock-text' }, 'Lulu se repose. On rejouera tout à l’heure.'),
    clockEl, body);
  overlay = el('div', { class: 'lock-overlay', role: 'dialog', 'aria-label': 'Temps de jeu terminé' }, card);
  document.body.append(overlay);
  refreshClock();
  showParentButton(body);
  setTimeout(() => { if (overlay) speak('Tu as bien joué ! C’est l’heure de faire une pause. Lulu va se reposer, on rejouera tout à l’heure.'); }, 300);
}

function showParentButton(body) {
  body.innerHTML = '';
  body.append(el('button', { class: 'lock-parent', 'aria-label': 'Parent', onclick: () => { sfx('tap'); askCode(body); } }, '🔒 Parent'));
}

// Code parent (4 chiffres) ; sans code défini : question pour adulte.
function askCode(body) {
  const pin = String(settings().pin || '');
  const hasPin = /^\d{4}$/.test(pin);
  const a = 6 + Math.floor(Math.random() * 4);
  const b = 6 + Math.floor(Math.random() * 4);
  const len = hasPin ? 4 : String(a * b).length;
  let value = '';
  const dots = el('div', { class: 'lock-dots' });
  const msg = el('div', { class: 'lock-msg' });
  const draw = () => { dots.innerHTML = ''; for (let i = 0; i < len; i++) dots.append(el('span', { class: i < value.length ? 'on' : '' })); };
  const check = () => {
    const ok = hasPin ? value === pin : Number(value) === a * b;
    if (ok) { chooseTime(body); return; }
    msg.textContent = hasPin ? 'Ce n’est pas le bon code.' : 'Ce n’est pas la bonne réponse.';
    value = ''; draw();
  };
  const press = (k) => {
    msg.textContent = '';
    if (k === '⌫') value = value.slice(0, -1);
    else if (value.length < len) value += k;
    draw();
    if (value.length === len) setTimeout(check, 150);
  };
  const pad = el('div', { class: 'lock-pad' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '✖', '0', '⌫'].map((k) => el('button', {
    class: 'lock-key', 'data-key': k,
    onclick: () => (k === '✖' ? showParentButton(body) : press(k)),
  }, k)));
  body.innerHTML = '';
  body.append(el('div', { class: 'lock-ask' }, hasPin ? 'Code parent' : `Question pour adulte : ${a} × ${b} = ?`), dots, msg, pad);
  draw();
}

function chooseTime(body) {
  const def = Number(settings().extraMinutes) || 15;
  const opts = [...new Set([def, 15, 30, 60])].sort((x, y) => x - y);
  body.innerHTML = '';
  body.append(
    el('div', { class: 'lock-ask' }, 'Ajouter du temps de jeu :'),
    el('div', { class: 'lock-times' }, opts.map((m) => el('button', {
      class: `lock-time ${m === def ? 'def' : ''}`, 'data-min': String(m),
      onclick: () => { sfx('tap'); addTime(m); speak('C’est reparti !'); },
    }, m >= 60 ? `+ ${m / 60} h` : `+ ${m} min`))),
    el('button', { class: 'lock-cancel', onclick: () => showParentButton(body) }, 'Annuler'));
}
