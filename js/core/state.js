// Sauvegarde automatique de la progression dans le stockage local du navigateur.
import { LEVELS, STARS_TO_UNLOCK } from '../data/levels.js';

const KEY = 'lirejoue.v1';

function defaults() {
  return {
    version: 1,
    child: { name: '', avatar: '🦊' },
    settings: {
      script: 'auto',          // auto | caps | bridge | lower | mixed
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
    },
    progress: {
      currentLevel: 1,
      unlocked: [1],
      levels: {},              // n -> { stars, rounds: { gameId: count } }
      totalStars: 0,
      stickers: [],
      medals: [],
      lastPlayed: null,
    },
    stats: {
      words: {},               // id -> { ok, err, seen, last }
      graphemes: {},           // key -> { ok, err }
      games: {},               // gameId -> { rounds, errors }
      days: {},                // 'YYYY-MM-DD' -> rounds
    },
    customWords: [],
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
    return merge(defaults(), raw ? JSON.parse(raw) : null);
  } catch (e) {
    return defaults();
  }
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
  }
  state = fresh;
  save();
}

export function exportJSON() { return JSON.stringify(state, null, 2); }
export function importJSON(txt) { state = merge(defaults(), JSON.parse(txt)); save(); }

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
  return LEVELS[level - 1].script;
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
  { id: 'lvl3', icon: '⛰️', label: 'Montagne des digrammes', test: (s) => s.progress.unlocked.includes(3) },
  { id: 'lvl5', icon: '🌷', label: 'Jardin des minuscules', test: (s) => s.progress.unlocked.includes(5) },
  { id: 'lvl7', icon: '👑', label: 'Royaume des lecteurs', test: (s) => s.progress.unlocked.includes(7) },
];

// Appelé à la fin de chaque manche réussie. Retourne les nouveautés à fêter.
export function awardRound(gameId, level, errors) {
  const news = { stars: 1, sticker: null, medals: [], unlockedLevel: null };
  update((s) => {
    const ld = levelData(level);
    ld.stars += 1;
    ld.rounds[gameId] = (ld.rounds[gameId] || 0) + 1;
    s.progress.totalStars += 1;
    s.progress.lastPlayed = new Date().toISOString();
    const g = (s.stats.games[gameId] = s.stats.games[gameId] || { rounds: 0, errors: 0 });
    g.rounds += 1; g.errors += errors;
    const day = new Date().toISOString().slice(0, 10);
    s.stats.days[day] = (s.stats.days[day] || 0) + 1;

    if (s.progress.totalStars % 5 === 0) {
      const next = STICKERS.find((st) => !s.progress.stickers.includes(st));
      if (next) { s.progress.stickers.push(next); news.sticker = next; }
    }
    if (ld.stars >= STARS_TO_UNLOCK && level < 7 && !s.progress.unlocked.includes(level + 1)) {
      s.progress.unlocked.push(level + 1);
      news.unlockedLevel = level + 1;
    }
    for (const m of MEDALS) {
      if (!s.progress.medals.includes(m.id) && m.test(s)) {
        s.progress.medals.push(m.id);
        news.medals.push(m);
      }
    }
  });
  return news;
}

// Enregistre une réponse sur un mot (et ses graphèmes) pour l'espace parent.
export function recordAnswer(word, ok) {
  if (!word) return;
  const st = state.stats;
  const w = (st.words[word.id] = st.words[word.id] || { ok: 0, err: 0, seen: 0, last: null });
  w.seen += 1;
  if (ok) w.ok += 1; else w.err += 1;
  w.last = Date.now();
  for (const key of word.skills || []) {
    const g = (st.graphemes[key] = st.graphemes[key] || { ok: 0, err: 0 });
    if (ok) g.ok += 1; else g.err += 1;
  }
  save();
}
