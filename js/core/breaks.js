// Pauses actives : après un temps de jeu réglable (15 min par défaut), le jeu propose
// une petite pause avec un exercice physique guidé par Lulu.
// - Le temps ne compte que lorsque l'application est visible et hors espace parent.
// - La pause ne coupe jamais une manche : elle s'affiche au prochain moment calme
//   (fin de manche, retour au menu ou à la carte).
// Réglages (espace parent) : settings.breakEnabled, settings.breakMinutes.
import { el } from './render.js';
import { getState } from './state.js';
import { speak, stopSpeaking, sfx } from './audio.js';
import { mascotSVG, confetti } from './fx.js';

// Exercices : consigne courte, emoji animé, nombre de répétitions comptées à voix haute.
export const EXERCISES = [
  { id: 'frog', icon: '🐸', anim: 'jump', text: 'Saute comme une grenouille !', count: 5 },
  { id: 'sky', icon: '🙆', anim: 'stretch', text: 'Lève les bras très haut vers le ciel, puis touche tes pieds !', count: 4 },
  { id: 'plane', icon: '✈️', anim: 'sway', text: 'Fais l’avion : écarte les bras et penche-toi d’un côté, puis de l’autre !', count: 6 },
  { id: 'elephant', icon: '🐘', anim: 'stomp', text: 'Marche sur place comme un gros éléphant !', count: 8 },
  { id: 'top', icon: '🌀', anim: 'spin', text: 'Tourne doucement sur toi-même comme une toupie !', count: 3 },
  { id: 'cat', icon: '🐱', anim: 'stretch', text: 'Étire-toi comme un chat qui se réveille !', count: 3 },
  { id: 'dog', icon: '🐶', anim: 'shake', text: 'Secoue tes mains comme un chien mouillé !', count: 5 },
  { id: 'rabbit', icon: '🐰', anim: 'jump', text: 'Fais des petits bonds de lapin !', count: 6 },
  { id: 'tree', icon: '🌳', anim: 'sway', text: 'Fais l’arbre : tiens-toi sur un pied, les bras en l’air, et balance-toi doucement !', count: 5 },
  { id: 'bird', icon: '🐦', anim: 'flap', text: 'Bats des ailes comme un oiseau !', count: 8 },
  { id: 'clap', icon: '👏', anim: 'shake', text: 'Tape dans tes mains au-dessus de ta tête !', count: 6 },
  { id: 'crab', icon: '🦀', anim: 'sway', text: 'Marche de côté comme un crabe !', count: 6 },
];

const NUMBERS = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];

let activeSeconds = 0;
let due = false;
let showing = false;
let timer = null;
let lastExercise = null;

function settings() { return getState().settings; }
export function breakEnabled() { return settings().breakEnabled !== false; }
function limitSeconds() { return Math.max(0.05, Number(settings().breakMinutes) || 15) * 60; }

export function startBreakTimer() {
  if (timer) return;
  timer = setInterval(() => {
    if (!breakEnabled() || showing || document.visibilityState !== 'visible') return;
    if (document.querySelector('#app > .pr')) return; // espace parent : on ne compte pas
    if (document.querySelector('.lock-overlay')) return; // temps de jeu terminé (blocage)
    activeSeconds += 1;
    if (activeSeconds >= limitSeconds()) due = true;
  }, 1000);
}

export function isBreakDue() { return breakEnabled() && due && !showing; }
export function resetBreakTimer() { activeSeconds = 0; due = false; }

// Si une pause est due, l'affiche puis appelle `then` ; sinon appelle `then` tout de suite.
export function breakThen(then) {
  if (isBreakDue()) showBreak({ onDone: then });
  else if (then) then();
}

export function showBreak({ onDone } = {}) {
  if (showing) return;
  showing = true;
  stopSpeaking();
  const pool = EXERCISES.filter((e) => e.id !== lastExercise);
  let ex = pool[Math.floor(Math.random() * pool.length)];
  let cancelled = false;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));

  const counter = el('div', { class: 'brk-count', 'aria-live': 'polite' });
  const icon = el('div', { class: 'brk-icon' });
  const text = el('div', { class: 'brk-text' });
  const actions = el('div', { class: 'brk-actions' });
  const card = el('div', { class: 'brk-card' },
    el('div', { class: 'brk-owl', html: mascotSVG('happy') }),
    el('div', { class: 'brk-title' }, '🤸 C’est l’heure de bouger !'),
    icon, text, counter, actions);
  const overlay = el('div', { class: 'brk-overlay', role: 'dialog', 'aria-label': 'Pause active' }, card);
  document.body.append(overlay);

  function finish() {
    cancelled = true;
    timers.forEach(clearTimeout);
    stopSpeaking();
    overlay.remove();
    showing = false;
    resetBreakTimer();
    if (onDone) onDone();
  }

  async function run(first) {
    lastExercise = ex.id;
    actions.innerHTML = '';
    icon.innerHTML = '';
    icon.append(el('span', { class: `brk-emoji anim-${ex.anim}` }, ex.icon));
    text.textContent = ex.text;
    counter.innerHTML = '';
    for (let i = 0; i < ex.count; i++) counter.append(el('span', { class: 'brk-dot' }, '⭐'));
    const intro = first ? 'C’est l’heure de la pause ! On bouge un peu ? ' : '';
    await speak(intro + ex.text);
    if (cancelled) return;
    // Compte à voix haute, au rythme de l'enfant (pas de chronomètre affiché).
    const dots = [...counter.children];
    let i = 0;
    const step = () => {
      if (cancelled) return;
      if (i >= dots.length) { done(); return; }
      dots[i].classList.add('on');
      sfx('star');
      speak(NUMBERS[i] || String(i + 1), { rate: 0.9 });
      i += 1;
      later(step, 1500);
    };
    later(step, 600);
  }

  function done() {
    confetti({ count: 80, duration: 1800 });
    sfx('win');
    speak('Bravo ! Tu as bien bougé. On reprend le jeu ?');
    actions.append(
      el('button', { class: 'big-btn brk-go', 'aria-label': 'Reprendre le jeu', onclick: () => { sfx('tap'); finish(); } }, '▶️'),
      el('button', {
        class: 'big-btn brk-more', 'aria-label': 'Encore un exercice',
        onclick: () => {
          sfx('tap');
          const others = EXERCISES.filter((e) => e.id !== ex.id);
          ex = others[Math.floor(Math.random() * others.length)];
          run(false);
        },
      }, '🔁'),
    );
  }

  run(true);
  return { close: finish };
}
