// Point d'entrée : écrans d'accueil, carte des mondes, menu des jeux, album.
import { el } from './core/render.js';
import { getState, update, isUnlocked, levelData, currentLevel, setLevel, STICKERS, MEDALS, isLessonDone, nextLesson, levelLessonsDone, levelRounds, levelComplete } from './core/state.js';
import { speak, sfx, unlockAudio, instruct } from './core/audio.js';
import { mascotSVG } from './core/fx.js';
import { runGame, stopGame } from './core/gamehost.js';
import { gamesForLevel, gameById } from './games/index.js';
import { LEVELS, TRACKS, levelInfo, lessonById, levelById } from './data/curriculum.js';
import { renderGrapheme } from './core/render.js';
import { openLesson } from './screens/lesson.js';
import { widePool } from './core/library.js';
import { allowedKeys, learnedLetters } from './core/progress.js';
import { openParentGate } from './screens/parent.js';
import { installBanner } from './core/install.js';
import { startBreakTimer, breakThen } from './core/breaks.js';
import { startScreenTime } from './core/screentime.js';

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
// Quatre parcours (onglets) : capitales, script, cursive, les trois écritures.
let mapTrack = null;
function levelProgress(L) {
  const total = L.lessons.length + L.need;
  if (!total) return { pct: 1 };
  return { pct: Math.min(1, (levelLessonsDone(L.n) + Math.min(levelRounds(L.n), L.need)) / total) };
}

function showMap(greet = false) {
  clear();
  const st = getState();
  const cur = levelInfo(currentLevel());
  if (!mapTrack) mapTrack = cur.track;
  const screen = el('div', { class: 'screen map-screen' });
  const header = el('header', { class: 'hud' },
    el('button', { class: 'round-btn', 'aria-label': 'Accueil', onclick: () => { sfx('tap'); showHome(); } }, '🏠'),
    el('div', { class: 'hud-title' }, '🗺️ ', 'Ma carte'),
    el('div', { class: 'hud-right' },
      el('button', { class: 'round-btn', 'aria-label': 'Mes trésors', onclick: () => { sfx('tap'); showAlbum(); } }, '🎁'),
      el('div', { class: 'hud-stars' }, '⭐ ', String(st.progress.totalStars))),
  );
  const tabs = el('div', { class: 'map-tracks', role: 'tablist' });
  const path = el('div', { class: 'map-path' });
  const drawTrack = () => {
    tabs.innerHTML = ''; path.innerHTML = '';
    for (const T of TRACKS) {
      const levels = LEVELS.filter((L) => L.track === T.id);
      const open = levels.some((L) => isUnlocked(L.n));
      const b = el('button', { class: `map-track ${T.id === mapTrack ? 'on' : ''} ${open ? '' : 'locked'}`, role: 'tab', 'aria-label': T.label },
        el('span', { class: 'map-track-emoji' }, open ? T.emoji : '🔒'), el('span', { class: `map-track-label script-${T.script === 'mixed' ? 'caps' : T.script}` }, T.short));
      b.addEventListener('click', () => {
        sfx('tap');
        if (!open) { speak('Ce chemin est encore fermé. Continue ta route pour l’ouvrir !'); b.classList.add('wiggle'); setTimeout(() => b.classList.remove('wiggle'), 600); return; }
        mapTrack = T.id; drawTrack();
      });
      tabs.append(b);
    }
    LEVELS.filter((L) => L.track === mapTrack).forEach((L) => {
      const unlocked = isUnlocked(L.n);
      const { pct } = levelProgress(L);
      const isCurrent = currentLevel() === L.n;
      const done = levelComplete(L.n);
      const node = el('button', {
        class: `map-node ${unlocked ? '' : 'locked'} ${isCurrent ? 'current' : ''} ${done ? 'done' : ''}`,
        style: { '--c': L.color, background: `linear-gradient(160deg, ${L.bg[0]}, ${L.bg[1]})` },
        'aria-label': `Niveau ${L.n} : ${L.world}${unlocked ? '' : ' (fermé)'}`,
      },
        el('div', { class: 'map-node-num' }, done ? '✓' : String(L.n)),
        el('div', { class: 'map-node-emoji' }, unlocked ? L.emoji : '🔒'),
        el('div', { class: 'map-node-name' }, L.world),
        el('div', { class: 'map-node-bar' }, el('span', { style: { width: `${pct * 100}%` } })),
        el('div', { class: 'map-node-stars' }, L.lessons.length ? `🎓 ${levelLessonsDone(L.n)}/${L.lessons.length}` : `⭐ ${levelData(L.n).stars}`),
      );
      node.addEventListener('click', () => {
        if (!unlocked) {
          sfx('soft');
          speak('Ce monde est encore fermé. Termine le monde d’avant pour l’ouvrir !');
          node.classList.add('wiggle'); setTimeout(() => node.classList.remove('wiggle'), 600);
          return;
        }
        sfx('tap');
        setLevel(L.n);
        showMenu(L.n);
      });
      path.append(node);
    });
    const c = path.querySelector('.current') || path.querySelector('.map-node:not(.locked):last-of-type');
    if (c) c.scrollIntoView({ block: 'nearest', inline: 'center' });
  };
  // Révision proposée par le parent (notions difficiles).
  const focus = st.progress.reviewFocus || [];
  const review = focus.length ? el('button', { class: 'pill-btn map-review', 'aria-label': 'Je révise' }, '🔁 Je révise') : null;
  if (review) review.addEventListener('click', () => { sfx('tap'); startReview(focus); });
  screen.append(header, tabs, path);
  if (review) screen.append(review);
  app.append(screen);
  drawTrack();
  if (greet) instruct('Choisis un monde !');
  breakThen(null);
}

// Révision des notions difficiles (choisies dans l'espace parent).
function startReview(focus) {
  const letters = focus.filter((k) => k.startsWith('L:'));
  if (letters.length && letters.length >= focus.length / 2) {
    const n = levelById(isUnlocked(levelById('k1').n) ? 'k3' : 's3').n;
    play('letters', n, { focus: letters });
  } else {
    const caps = LEVELS.filter((L) => L.kind === 'graphemes' && isUnlocked(L.n)).slice(-1)[0] || LEVELS[0];
    const lv = currentLevel() && levelInfo(currentLevel()).kind === 'graphemes' ? currentLevel() : caps.n;
    play('sounds', lv, { focus: focus.filter((k) => !k.startsWith('L:')) });
  }
}

// ---- Menu d'un monde : mini-leçons puis jeux ---------------------------------
// Un jeu est prêt quand l'enfant a fait au moins une leçon du niveau et qu'il y a de quoi jouer.
function gameReady(g, level) {
  const L = levelInfo(level);
  if (getState().settings.unlockAll) return true;
  if (L.lessons.length && !levelLessonsDone(level)) return false;
  if (g.id === 'letters') return learnedLetters(level).length >= 1;
  if (g.id === 'sounds') {
    if (L.track !== 'caps') return learnedLetters(level).length >= 1;
    const a = allowedKeys(level);
    return !a || a.keys.size >= 2;
  }
  return widePool(level).length >= 3;
}

function lessonChip(id, level, state) {
  const les = lessonById(id);
  const sc = les.kind === 'letter' ? les.track : 'caps';
  const k = les.kind === 'letter' ? ('aeiouy'.includes(les.letter) ? 'v' : 'c') : les.kind === 'x' ? 'c' : les.kind;
  const forms = (les.kind === 'letter' ? [les.letter] : les.show.slice(0, 2)).map((t) => renderGrapheme({ t, k }, sc));
  const chip = el('button', { class: `lesson-chip ${state}`, 'aria-label': 'Leçon' },
    el('span', { class: 'lesson-chip-forms' }, forms),
    el('span', { class: 'lesson-chip-mark' }, state === 'done' ? '✓' : state === 'next' ? '🎓' : '🔒'));
  chip.addEventListener('click', () => {
    if (state === 'locked') { sfx('soft'); speak('Fais d’abord la leçon qui brille !'); chip.classList.add('wiggle'); setTimeout(() => chip.classList.remove('wiggle'), 600); return; }
    sfx('tap');
    lesson(id, level);
  });
  return chip;
}

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
  screen.append(header);
  const nxt = nextLesson(level);
  if (L.lessons.length) {
    const strip = el('div', { class: 'lesson-strip' });
    let nextSeen = false;
    for (const id of L.lessons) {
      let state = 'done';
      if (!isLessonDone(id)) { state = nextSeen ? 'locked' : 'next'; nextSeen = true; }
      strip.append(lessonChip(id, level, state));
    }
    screen.append(strip);
  }
  const grid = el('div', { class: 'menu-grid' });
  for (const g of gamesForLevel(level)) {
    const played = ld.rounds[g.id] || 0;
    const ready = gameReady(g, level);
    const tile = el('button', { class: `game-tile ${ready ? '' : 'locked'}`, style: { '--c': g.color }, 'aria-label': g.title },
      el('div', { class: 'game-tile-icon' }, ready ? g.icon : '🔒'),
      el('div', { class: 'game-tile-title' }, g.title),
      el('div', { class: 'game-tile-stars' }, played ? '⭐'.repeat(Math.min(played, 5)) : ' '),
    );
    let pressTimer = null;
    tile.addEventListener('click', () => {
      if (!ready) {
        sfx('soft');
        speak(L.lessons.length && !levelLessonsDone(level) ? 'Commence par la leçon qui brille !' : 'Fais encore une leçon pour ouvrir ce jeu !');
        tile.classList.add('wiggle'); setTimeout(() => tile.classList.remove('wiggle'), 600);
        return;
      }
      sfx('tap'); play(g.id, level);
    });
    // Appui sans lâcher : la mascotte lit le nom du jeu.
    tile.addEventListener('pointerdown', () => { pressTimer = setTimeout(() => speak(g.title), 450); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => tile.addEventListener(ev, () => clearTimeout(pressTimer)));
    grid.append(tile);
  }
  const owl = el('button', { class: 'menu-owl', 'aria-label': 'Lulu', html: mascotSVG('happy') });
  owl.addEventListener('click', () => speak(`${L.world}. ${L.title}.`));
  screen.append(grid, owl);
  app.append(screen);
  instruct(nxt ? (levelLessonsDone(level) ? 'Une nouvelle leçon t’attend, ou choisis un jeu !' : 'Commence par la leçon qui brille !') : 'Choisis un jeu !');
  breakThen(null);
}

function play(gameId, level, options = {}) {
  const game = gameById(gameId);
  update((s) => { s.progress.currentLevel = level; });
  runGame(game, { level, options, onExit: () => showMenu(level) });
}

function lesson(id, level) {
  const les = lessonById(id);
  const lv = level || les.level || currentLevel();
  update((s) => { s.progress.currentLevel = lv; });
  openLesson(id, {
    level: lv,
    onExit: () => showMenu(lv),
    onPractice: (gameId, focus) => play(gameId, lv, { focus }),
    onNext: (nid) => breakThen(() => lesson(nid, lv)),
  });
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
window.__app = { showHome, showMap, showMenu, showAlbum, play, lesson, getState };

startBreakTimer();
route();
startScreenTime();

// Jeu disponible hors connexion après une première visite.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
