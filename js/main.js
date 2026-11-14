// Point d'entrée : écrans d'accueil, carte des mondes, menu des jeux, album.
import { el } from './core/render.js';
import { getState, update, isUnlocked, levelData, currentLevel, setLevel, STICKERS, MEDALS } from './core/state.js';
import { speak, sfx, unlockAudio, instruct } from './core/audio.js';
import { mascotSVG } from './core/fx.js';
import { runGame, stopGame } from './core/gamehost.js';
import { gamesForLevel, gameById } from './games/index.js';
import { LEVELS, STARS_TO_UNLOCK, levelInfo } from './data/levels.js';
import { openParentGate } from './screens/parent.js';
import { installBanner } from './core/install.js';

const app = document.getElementById('app');
let audioUnlocked = false;

document.addEventListener('pointerdown', () => {
  if (!audioUnlocked) { audioUnlocked = true; unlockAudio(); }
}, { capture: true });

// Empêche le zoom par double-tap / pincement et le menu contextuel (appui long) sur tablette.
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => { if (!e.target.closest('input, textarea')) e.preventDefault(); });

function clear() { stopGame(); app.innerHTML = ''; window.scrollTo(0, 0); }

function parentButton() {
  return el('button', {
    class: 'parent-btn', 'aria-label': 'Espace parent',
    onclick: () => openParentGate({ onExit: () => route() }),
  }, '🔒');
}

const AVATARS = ['🦊', '🐻', '🐰', '🐱', '🐶', '🦁', '🐼', '🐸', '🦄', '🐯', '🐨', '🐵'];

// ---- Accueil ---------------------------------------------------------------
function showHome() {
  clear();
  const st = getState();
  const name = st.child.name;
  const owl = el('div', { class: 'home-owl', html: mascotSVG('happy') });
  const screen = el('div', { class: 'screen home-screen' });

  if (!name) {
    // Premier lancement : le parent saisit le prénom.
    const input = el('input', { class: 'name-input', type: 'text', maxlength: '16', placeholder: 'Prénom', autocomplete: 'off', autocapitalize: 'words', 'aria-label': 'Prénom de l’enfant' });
    let avatar = st.child.avatar;
    const avatars = el('div', { class: 'avatar-row' }, AVATARS.map((a) => el('button', {
      class: 'avatar-choice' + (a === avatar ? ' selected' : ''), 'aria-label': 'Avatar ' + a,
      onclick: (e) => { avatar = a; sfx('tap'); avatars.querySelectorAll('.avatar-choice').forEach((b) => b.classList.remove('selected')); e.currentTarget.classList.add('selected'); },
    }, a)));
    const go = el('button', { class: 'big-btn play-btn' }, '▶️ C’est parti !');
    go.addEventListener('click', () => {
      const v = input.value.trim();
      if (!v) { input.focus(); input.classList.add('wiggle'); setTimeout(() => input.classList.remove('wiggle'), 600); return; }
      update((s) => { s.child.name = v; s.child.avatar = avatar; });
      showHome();
      setTimeout(() => speak(`Bonjour ${v} ! Je suis Lulu la chouette. On va apprendre à lire en jouant !`), 300);
    });
    screen.append(
      el('div', { class: 'home-hero' }, owl, el('h1', { class: 'app-title' }, 'Lire en jouant')),
      el('div', { class: 'setup-card' },
        el('p', { class: 'setup-label' }, 'Pour les parents : quel est le prénom de votre enfant ?'),
        input, avatars, go),
    );
    app.append(screen);
    return;
  }

  const play = el('button', { class: 'giant-play', 'aria-label': 'Jouer' }, '▶');
  play.addEventListener('click', () => { sfx('tap'); showMap(true); });
  owl.addEventListener('click', () => speak(`Bonjour ${name} ! Appuie sur le gros bouton pour jouer !`));
  screen.append(
    parentButton(),
    el('div', { class: 'home-hero' },
      owl,
      el('div', { class: 'home-greet' },
        el('div', { class: 'home-avatar' }, st.child.avatar),
        el('h1', { class: 'app-title' }, 'Bonjour ', el('span', { class: 'child-name' }, name), ' !'),
      ),
    ),
    play,
    installBanner(),
    el('div', { class: 'home-bottom' },
      el('button', { class: 'pill-btn', 'aria-label': 'Mes trésors', onclick: () => { sfx('tap'); showAlbum(); } }, '🎁 ', el('span', {}, String(st.progress.stickers.length)), '  ⭐ ', el('span', {}, String(st.progress.totalStars))),
    ),
  );
  app.append(screen);
}

// ---- Carte des mondes ------------------------------------------------------
function showMap(greet = false) {
  clear();
  const st = getState();
  const screen = el('div', { class: 'screen map-screen' });
  const header = el('header', { class: 'hud' },
    el('button', { class: 'round-btn', 'aria-label': 'Accueil', onclick: () => { sfx('tap'); showHome(); } }, '🏠'),
    el('div', { class: 'hud-title' }, '🗺️ ', 'Ma carte'),
    el('div', { class: 'hud-right' },
      el('button', { class: 'round-btn', 'aria-label': 'Mes trésors', onclick: () => { sfx('tap'); showAlbum(); } }, '🎁'),
      el('div', { class: 'hud-stars' }, '⭐ ', String(st.progress.totalStars))),
  );
  const path = el('div', { class: 'map-path' });
  LEVELS.forEach((L) => {
    const unlocked = isUnlocked(L.n);
    const stars = levelData(L.n).stars;
    const pct = Math.min(1, stars / STARS_TO_UNLOCK);
    const isCurrent = currentLevel() === L.n;
    const node = el('button', {
      class: `map-node ${unlocked ? '' : 'locked'} ${isCurrent ? 'current' : ''}`,
      style: { '--c': L.color, background: `linear-gradient(160deg, ${L.bg[0]}, ${L.bg[1]})` },
      'aria-label': `Niveau ${L.n} : ${L.world}${unlocked ? '' : ' (fermé)'}`,
    },
      el('div', { class: 'map-node-num' }, String(L.n)),
      el('div', { class: 'map-node-emoji' }, unlocked ? L.emoji : '🔒'),
      el('div', { class: 'map-node-name' }, L.world),
      el('div', { class: 'map-node-bar' }, el('span', { style: { width: `${pct * 100}%` } })),
      el('div', { class: 'map-node-stars' }, '⭐ ', String(stars)),
    );
    node.addEventListener('click', () => {
      if (!unlocked) {
        sfx('soft');
        speak('Ce monde est encore fermé. Gagne des étoiles pour l’ouvrir !');
        node.classList.add('wiggle'); setTimeout(() => node.classList.remove('wiggle'), 600);
        return;
      }
      sfx('tap');
      setLevel(L.n);
      showMenu(L.n);
    });
    path.append(node);
  });
  screen.append(header, path);
  app.append(screen);
  const cur = path.querySelector('.current');
  if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  if (greet) instruct('Choisis un monde !');
}

// ---- Menu des jeux d'un monde ---------------------------------------------
function showMenu(level) {
  clear();
  const L = levelInfo(level);
  const ld = levelData(level);
  const screen = el('div', { class: 'screen menu-screen', style: { background: `linear-gradient(160deg, ${L.bg[0]}, ${L.bg[1]})`, '--world': L.color } });
  const header = el('header', { class: 'hud' },
    el('button', { class: 'round-btn', 'aria-label': 'Retour à la carte', onclick: () => { sfx('tap'); showMap(); } }, '🗺️'),
    el('div', { class: 'hud-title' }, L.emoji, ' ', L.world),
    el('div', { class: 'hud-right' }, el('div', { class: 'hud-stars' }, '⭐ ', String(ld.stars))),
  );
  const grid = el('div', { class: 'menu-grid' });
  for (const g of gamesForLevel(level)) {
    const played = ld.rounds[g.id] || 0;
    const tile = el('button', { class: 'game-tile', style: { '--c': g.color }, 'aria-label': g.title },
      el('div', { class: 'game-tile-icon' }, g.icon),
      el('div', { class: 'game-tile-title' }, g.title),
      el('div', { class: 'game-tile-stars' }, played ? '⭐'.repeat(Math.min(played, 5)) : ' '),
    );
    let pressTimer = null;
    tile.addEventListener('click', () => { sfx('tap'); play(g.id, level); });
    // Appui sans lâcher : la mascotte lit le nom du jeu.
    tile.addEventListener('pointerdown', () => { pressTimer = setTimeout(() => speak(g.title), 450); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => tile.addEventListener(ev, () => clearTimeout(pressTimer)));
    grid.append(tile);
  }
  const owl = el('button', { class: 'menu-owl', 'aria-label': 'Lulu', html: mascotSVG('happy') });
  owl.addEventListener('click', () => speak(`${L.world}. ${L.title}. Choisis un jeu !`));
  screen.append(header, grid, owl);
  app.append(screen);
  instruct('Choisis un jeu !');
}

function play(gameId, level) {
  const game = gameById(gameId);
  update((s) => { s.progress.currentLevel = level; });
  runGame(game, { level, onExit: () => showMenu(level) });
}

// ---- Album des trésors -------------------------------------------------
function showAlbum() {
  clear();
  const st = getState();
  const screen = el('div', { class: 'screen album-screen' });
  const header = el('header', { class: 'hud' },
    el('button', { class: 'round-btn', 'aria-label': 'Retour', onclick: () => { sfx('tap'); showMap(); } }, '🗺️'),
    el('div', { class: 'hud-title' }, '🎁 Mes trésors'),
    el('div', { class: 'hud-right' }, el('div', { class: 'hud-stars' }, '⭐ ', String(st.progress.totalStars))),
  );
  const stickers = el('div', { class: 'album-grid' }, STICKERS.map((s) => {
    const owned = st.progress.stickers.includes(s);
    return el('button', { class: `album-cell ${owned ? 'owned' : ''}`, 'aria-label': owned ? 'Surprise' : 'Surprise cachée', onclick: (e) => { if (owned) { sfx('star'); e.currentTarget.classList.add('bounce'); setTimeout(() => e.currentTarget && e.currentTarget.classList.remove('bounce'), 700); } } }, owned ? s : '❔');
  }));
  const medals = el('div', { class: 'medal-row' }, MEDALS.map((m) => {
    const owned = st.progress.medals.includes(m.id);
    return el('div', { class: `medal ${owned ? 'owned' : ''}`, title: m.label }, el('span', { class: 'medal-icon' }, owned ? m.icon : '⚪'), el('span', { class: 'medal-label' }, m.label));
  }));
  const next = 5 - (st.progress.totalStars % 5);
  screen.append(header,
    el('section', { class: 'album-section' }, el('h2', {}, 'Mes médailles'), medals),
    el('section', { class: 'album-section' }, el('h2', {}, 'Mes surprises'), el('p', { class: 'album-hint' }, `⭐ × ${next} → 🎁`), stickers),
  );
  app.append(screen);
  instruct('Voici tes trésors ! Tous les cinq étoiles, tu gagnes une surprise.');
}

// ---- Routeur minimal -------------------------------------------------------
function route() {
  const st = getState();
  if (!st.child.name) return showHome();
  showHome();
}

// Orientation : on suggère le mode paysage sur petit écran en portrait.
function checkOrientation() {
  const portraitPhone = window.innerHeight > window.innerWidth && window.innerWidth < 600;
  document.body.classList.toggle('portrait-small', portraitPhone);
}
window.addEventListener('resize', checkOrientation);
checkOrientation();

// Expose quelques fonctions pour les tests automatiques.
window.__app = { showHome, showMap, showMenu, showAlbum, play, getState };

route();

// Jeu disponible hors connexion après une première visite.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
