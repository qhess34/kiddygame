// Bibliothèque de mots active : mots intégrés + mots ajoutés par le parent,
// filtrés selon les réglages (graphèmes désactivés, mots masqués).
import { WORDS } from '../data/words.js';
import { buildWord, shuffle } from './words.js';
import { getState } from './state.js';

let cache = null;
let cacheKey = '';

export function allWords() {
  const st = getState();
  const key = JSON.stringify(st.customWords);
  if (!cache || key !== cacheKey) {
    const builtIn = WORDS.map((raw, i) => buildWord(raw, i));
    const custom = (st.customWords || []).map((raw, i) => buildWord({ ...raw, custom: true, id: 'custom:' + raw.w }, 10000 + i));
    cache = [...builtIn, ...custom].filter((w) => w.errors.length === 0);
    cacheKey = key;
  }
  return cache;
}

export function isWordActive(word) {
  const { disabledGraphemes, hiddenWords } = getState().settings;
  if (hiddenWords.includes(word.id)) return false;
  return !word.skills.some((k) => disabledGraphemes.includes(k));
}

// Mots disponibles pour jouer au niveau `level` :
// surtout les mots du niveau, plus quelques mots des niveaux précédents en révision.
export function poolForLevel(level, { reviewRatio = 0.3, min = 6 } = {}) {
  const active = allWords().filter(isWordActive);
  const current = active.filter((w) => w.level === level);
  const previous = active.filter((w) => w.level < level);
  let pool = current.slice();
  const nReview = Math.round(current.length * reviewRatio);
  pool = pool.concat(shuffle(previous).slice(0, nReview));
  if (pool.length < min) pool = pool.concat(shuffle(previous).slice(0, min - pool.length));
  if (pool.length < min) pool = active.filter((w) => w.level <= level);
  // Évite les doublons (même texte) et les images en double.
  const seen = new Set();
  return pool.filter((w) => (seen.has(w.text) ? false : seen.add(w.text)));
}

// Choisit des mots "à travailler" en priorité (déjà ratés ou peu vus).
export function weightedPick(pool, n) {
  const stats = getState().stats.words;
  const scored = pool.map((w) => {
    const s = stats[w.id];
    let weight = 1;
    if (!s) weight = 1.6; // jamais vu
    else weight = 1 + s.err * 0.8 - Math.min(s.ok, 6) * 0.1;
    return { w, k: Math.random() * Math.max(0.3, weight) };
  });
  scored.sort((a, b) => b.k - a.k);
  const out = [];
  const imgs = new Set();
  for (const { w } of scored) {
    if (imgs.has(w.img)) continue;
    imgs.add(w.img);
    out.push(w);
    if (out.length === n) break;
  }
  return out;
}

export function invalidate() { cache = null; }
