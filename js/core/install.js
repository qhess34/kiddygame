// Proposition d'installation de l'application sur l'écran d'accueil de la tablette.
// - Android / Chrome / Edge : vraie invite d'installation (événement beforeinstallprompt).
// - iPad / iPhone (Safari) : pas d'invite possible, on affiche la marche à suivre.
import { el } from './render.js';
import { getState, update } from './state.js';

let deferredPrompt = null;
const listeners = new Set();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  listeners.forEach((fn) => fn());
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  update((s) => { s.settings.installDismissed = true; });
  listeners.forEach((fn) => fn());
});

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;
}

function isIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function canOfferInstall() {
  if (isStandalone()) return false;
  if (getState().settings.installDismissed) return false;
  return !!deferredPrompt || isIOS();
}

// Bandeau à placer sur la page d'accueil. Se met à jour si l'invite arrive après l'affichage.
export function installBanner() {
  const box = el('div', { class: 'install-slot' });
  function render() {
    box.innerHTML = '';
    if (!canOfferInstall()) return;
    const close = el('button', { class: 'install-close', 'aria-label': 'Ne plus proposer' }, '✕');
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      update((s) => { s.settings.installDismissed = true; });
      render();
    });
    const btn = el('button', { class: 'install-btn' },
      el('span', { class: 'install-icon' }, '📲'),
      el('span', {}, 'Installer le jeu sur la tablette'));
    btn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (err) { /* */ }
        deferredPrompt = null;
        render();
      } else {
        showIOSHelp();
      }
    });
    box.append(el('div', { class: 'install-banner' }, btn, close));
  }
  listeners.add(render);
  render();
  return box;
}

function showIOSHelp() {
  const overlay = el('div', { class: 'install-help' },
    el('div', { class: 'install-help-card' },
      el('h2', {}, '📲 Installer sur l’iPad'),
      el('ol', {},
        el('li', {}, 'Touchez le bouton Partager ', el('span', { class: 'ios-share' }, '⬆︎'), ' en haut (ou en bas) de Safari.'),
        el('li', {}, 'Choisissez « Sur l’écran d’accueil » ➕.'),
        el('li', {}, 'Touchez « Ajouter ». L’icône du jeu apparaît sur la tablette !')),
      el('p', { class: 'install-help-note' }, 'Le jeu s’ouvrira alors en plein écran et fonctionnera même sans Internet.'),
      el('button', { class: 'big-btn', onclick: () => overlay.remove() }, 'OK 👍')));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
}
