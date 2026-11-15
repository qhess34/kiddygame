// Sauvegarde automatique de la progression dans le stockage local du navigateur.
import { LEVELS, LEVEL_COUNT, levelById, lessonById } from '../data/curriculum.js';

const KEY = 'lirejoue.v1';

function defaults() {
  return {
    version: 2,
    child: { name: '', avatar: '🦊' },
    settings: {
      script: 'auto',          // auto (selon le niveau) | caps | lower | cursive | mixed
      colors: 'on',            // on | off | auto  (auto = couleurs, sauf variante "sans couleurs" du mot mystère)
      voiceRate: 0.85,
      voiceName: '',
      sound: true,
      speakInstructions: true,
      unlockAll: false,
      disabledGraphemes: [],
      hiddenWords: [],
      matchMode: 'draw',       // draw (tracer) | tap (toucher successif) — les deux marchent toujours
      buildMode: 'auto',       // auto | letters | syllables
      mysteryColors: 'auto',   // auto | on | off
      itemsPerRound: 3,
      pin: '',
      installDismissed: false,
      breakEnabled: true,      // pauses actives (exercice physique)
      breakMinutes: 15,        // temps de jeu entre deux pauses
      limitEnabled: true,      // temps d'écran limité (blocage)
      limitMinutes: 60,        // temps de jeu avant blocage
      lockMinutes: 60,         // durée du blocage (levé tout seul ensuite)
      extraMinutes: 15,        // temps ajouté quand le parent débloque avec son code
    },
    progress: {
      currentLevel: 1,
      unlocked: [1],
      levels: {},              // n -> { stars, rounds: { gameId: count } }
      lessons: {},             // id de leçon -> { done, at, times }
      reviewFocus: [],         // notions à revoir choisies par le parent [{ key, script }]
      totalStars: 0,
      stickers: [],
      medals: [],
      lastPlayed: null,
    },
    stats: {
      words: {},               // id -> { ok, err, seen, last }
      graphemes: {},           // key -> { ok, err }
      games: {},               // gameId -> { rounds, errors }
      byScript: {},            // caps | lower | cursive -> { graphemes: {key:{ok,err}}, letters: {}, words: {} }
      days: {},                // 'YYYY-MM-DD' -> rounds
    },
    customWords: [],
    // Temps d'écran (js/core/screentime.js) : secondes jouées, temps ajouté, début du blocage.
    screen: { used: 0, bonus: 0, lockedAt: null, lastActive: 0 },
  };
}

function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  for (const k of Object.keys(saved)) {
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k])) {
      base[k] = merge(base[k], saved[k]);
    } else {
      base[k] = saved[k];
    }
  }
  return base;
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return migrate(merge(defaults(), raw ? JSON.parse(raw) : null), raw ? JSON.parse(raw) : null);
  } catch (e) {
    console.error(e);
    return defaults();
  }
}

// Ancienne sauvegarde (7 mondes) -> nouvelle progression : on ouvre les niveaux
// correspondants ; les mini-leçons restent à faire (elles sont courtes).
function migrate(st, raw) {
  const OLD_TO_NEW = { 1: 'c1', 2: 'c3', 3: 'c5', 4: 'c10', 5: 's1', 6: 's4', 7: 's6' };
  if (!raw || raw.version === 2) { st.version = 2; return st; }
  const oldMax = Math.max(1, ...((raw.progress && raw.progress.unlocked) || [1]));
  const maxN = levelById(OLD_TO_NEW[oldMax] || 'c1').n;
  const curN = levelById(OLD_TO_NEW[(raw.progress && raw.progress.currentLevel) || 1] || 'c1').n;
  st.progress.legacyLevels = st.progress.levels;
  st.progress.levels = {};
  st.progress.unlocked = LEVELS.filter((l) => l.n <= maxN).map((l) => l.n);
  st.progress.currentLevel = Math.min(curN, maxN);
  if (st.settings.script === 'bridge') st.settings.script = 'auto';
  st.version = 2;
  return st;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* stockage indisponible */ }
  listeners.forEach((fn) => fn(state));
}

export function getState() { return state; }
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function update(fn) { fn(state); save(); }

export function resetProgress({ keepSettings = true } = {}) {
  const fresh = defaults();
  if (keepSettings) {
    fresh.settings = state.settings;
    fresh.child = state.child;
    fresh.customWords = state.customWords;
    fresh.screen = state.screen; // une réinitialisation ne lève pas le blocage
  }
  state = fresh;
  save();
}

export function exportJSON() { return JSON.stringify(state, null, 2); }
export function importJSON(txt) { const raw = JSON.parse(txt); state = migrate(merge(defaults(), raw), raw); save(); }

// ---- Niveaux --------------------------------------------------------------
export function levelData(n) {
  const lv = state.progress.levels;
  if (!lv[n]) lv[n] = { stars: 0, rounds: {} };
  return lv[n];
}

export function isUnlocked(n) {
  return state.settings.unlockAll || state.progress.unlocked.includes(n);
}

export function currentLevel() { return state.progress.currentLevel || 1; }

export function setLevel(n) { update((s) => { s.progress.currentLevel = n; }); }

// Écriture effective pour un niveau donné.
export function scriptFor(level) {
  const s = state.settings.script;
  if (s && s !== 'auto') return s;
  return LEVELS[Math.max(1, Math.min(LEVEL_COUNT, level)) - 1].script;
}

// ---- Leçons et ouverture des niveaux ----------------------------------------
export function isLessonDone(id) { return !!(state.progress.lessons[id] && state.progress.lessons[id].done); }
export function levelLessonsDone(n) {
  const L = LEVELS[n - 1];
  return L.lessons.filter(isLessonDone).length;
}
export function levelRounds(n) {
  const r = levelData(n).rounds;
  return Object.values(r).reduce((a, b) => a + b, 0);
}
// Niveau terminé : toutes les leçons faites + assez de manches gagnées.
export function levelComplete(n) {
  const L = LEVELS[n - 1];
  return levelLessonsDone(n) === L.lessons.length && levelRounds(n) >= L.need;
}
// Prochaine leçon à faire dans un niveau (ou null).
export function nextLesson(n) {
  return LEVELS[n - 1].lessons.find((id) => !isLessonDone(id)) || null;
}
function unlockAfter(s, level, news) {
  if (level < LEVEL_COUNT && levelComplete(level) && !s.progress.unlocked.includes(level + 1)) {
    s.progress.unlocked.push(level + 1);
    news.unlockedLevel = level + 1;
  }
}

// ---- Récompenses ----------------------------------------------------------
// Autocollants à collectionner (surprises). Un nouveau tous les 5 étoiles.
export const STICKERS = ['🦄', '🐉', '🦋', '🐢', '🦁', '🐬', '🦉', '🐼', '🦊', '🐙', '🦜', '🐝', '🌈', '🚀', '🎈', '🍦', '🧸', '🦕', '🐳', '🌟', '🎠', '🪁', '🍭', '🏆', '🦩', '🐞', '🐿️', '🌻', '🎁', '💎'];

export const MEDALS = [
  { id: 'first', icon: '🥉', label: 'Première étoile', test: (s) => s.progress.totalStars >= 1 },
  { id: 'ten', icon: '🥈', label: '10 étoiles', test: (s) => s.progress.totalStars >= 10 },
  { id: 'fifty', icon: '🥇', label: '50 étoiles', test: (s) => s.progress.totalStars >= 50 },
  { id: 'hundred', icon: '🏆', label: '100 étoiles', test: (s) => s.progress.totalStars >= 100 },
  { id: 'allgames', icon: '🎖️', label: 'A joué aux 5 jeux', test: (s) => ['match', 'build', 'syllables', 'mystery', 'listen'].every((g) => (s.stats.games[g]?.rounds || 0) > 0) },
  { id: 'lessons10', icon: '🎓', label: '10 leçons', test: (s) => Object.values(s.progress.lessons || {}).filter((l) => l.done).length >= 10 },
  { id: 'lvl3', icon: '⛰️', label: 'Montagne ON AN', test: (s) => s.progress.unlocked.includes(levelById('c3').n) },
  { id: 'caps', icon: '🔠', label: 'Champion des capitales', test: (s) => s.progress.unlocked.includes(levelById('s1').n) },
  { id: 'lvl5', icon: '🌷', label: 'Jardin du script', test: (s) => s.progress.unlocked.includes(levelById('s4').n) },
  { id: 'cursive', icon: '✍️', label: 'Lettres attachées', test: (s) => s.progress.unlocked.includes(levelById('k4').n) },
  { id: 'lvl7', icon: '👑', label: 'Royaume des lecteurs', test: (s) => s.progress.unlocked.includes(levelById('f1').n) },
];

// Appelé à la fin de chaque manche réussie. Retourne les nouveautés à fêter.
function giveStar(s, level, news) {
  levelData(level).stars += 1;
  s.progress.totalStars += 1;
  s.progress.lastPlayed = new Date().toISOString();
  const day = new Date().toISOString().slice(0, 10);
  s.stats.days[day] = (s.stats.days[day] || 0) + 1;
  if (s.progress.totalStars % 5 === 0) {
    const next = STICKERS.find((st) => !s.progress.stickers.includes(st));
    if (next) { s.progress.stickers.push(next); news.sticker = next; }
  }
}
function checkMedals(s, news) {
  for (const m of MEDALS) {
    if (!s.progress.medals.includes(m.id) && m.test(s)) {
      s.progress.medals.push(m.id);
      news.medals.push(m);
    }
  }
}

export function awardRound(gameId, level, errors) {
  const news = { stars: 1, sticker: null, medals: [], unlockedLevel: null };
  update((s) => {
    const ld = levelData(level);
    ld.rounds[gameId] = (ld.rounds[gameId] || 0) + 1;
    const g = (s.stats.games[gameId] = s.stats.games[gameId] || { rounds: 0, errors: 0 });
    g.rounds += 1; g.errors += errors;
    giveStar(s, level, news);
    unlockAfter(s, level, news);
    checkMedals(s, news);
  });
  return news;
}

// Fin d'une mini-leçon : la leçon est faite (statut « En cours »), une étoile.
export function awardLesson(lessonId, level) {
  const news = { stars: 1, sticker: null, medals: [], unlockedLevel: null, first: !isLessonDone(lessonId) };
  update((s) => {
    const l = (s.progress.lessons[lessonId] = s.progress.lessons[lessonId] || { done: false, times: 0 });
    l.done = true; l.times += 1; l.at = Date.now();
    giveStar(s, level, news);
    unlockAfter(s, level, news);
    checkMedals(s, news);
  });
  return news;
}

// Statistiques séparées par écriture (capitales, script, cursive).
function bucket(script) {
  const sc = script === 'bridge' ? 'lower' : script === 'cbridge' ? 'cursive' : script;
  if (!['caps', 'lower', 'cursive'].includes(sc)) return null; // 'mixed' : écriture inconnue
  const b = (state.stats.byScript[sc] = state.stats.byScript[sc] || { graphemes: {}, letters: {}, words: {} });
  return b;
}
function bump(map, key, ok) {
  const g = (map[key] = map[key] || { ok: 0, err: 0, last: 0 });
  if (ok) g.ok += 1; else g.err += 1;
  g.last = Date.now();
  // Mémoire courte des 6 dernières réponses (pour « à consolider » / « acquis »).
  g.h = ((g.h || '') + (ok ? '1' : '0')).slice(-6);
}

// Enregistre une réponse sur un mot (et ses graphèmes) pour l'espace parent.
// script : écriture dans laquelle le mot était affiché.
export function recordAnswer(word, ok, script) {
  if (!word) return;
  const st = state.stats;
  const w = (st.words[word.id] = st.words[word.id] || { ok: 0, err: 0, seen: 0, last: null });
  w.seen += 1;
  if (ok) w.ok += 1; else w.err += 1;
  w.last = Date.now();
  const b = bucket(script);
  for (const key of word.skills || []) {
    bump(st.graphemes, key, ok);
    if (b) bump(b.graphemes, key, ok);
  }
  if (b) bump(b.words, word.id, ok);
  save();
}

// Réponse sur un graphème seul (jeu « La chasse aux sons », leçons).
export function recordGrapheme(key, ok, script) {
  bump(state.stats.graphemes, key, ok);
  const b = bucket(script);
  if (b) bump(b.graphemes, key, ok);
  save();
}

// Réponse sur une lettre (correspondance capitale / script / cursive).
export function recordLetter(letter, ok, script) {
  const b = bucket(script);
  if (b) bump(b.letters, letter, ok);
  save();
}
