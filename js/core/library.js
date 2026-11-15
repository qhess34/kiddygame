// Bibliothèque de mots active : mots intégrés + mots ajoutés par le parent,
// filtrés selon les réglages (graphèmes désactivés, mots masqués).
import { WORDS } from '../data/words.js';
import { buildWord, shuffle } from './words.js';
import { getState, save } from './state.js';
import { levelInfo } from '../data/curriculum.js';
import { allowedKeys, learnedLetters } from './progress.js';

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

const dedupe = (arr) => { const seen = new Set(); return arr.filter((w) => (seen.has(w.text) ? false : seen.add(w.text))); };
const plain = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Le mot contient-il cette notion ? (clé de graphème, 'cluster', ou lettre 'L:a')
export function wordHas(w, key) {
  if (key.startsWith('L:')) return plain(w.text).includes(key.slice(2));
  if (key === 'cluster') return !!w.cluster;
  return w.skills.includes(key);
}

// Tous les mots lisibles au niveau `level` (selon les leçons faites).
export function widePool(level) {
  const L = levelInfo(level);
  const active = allWords().filter(isWordActive);
  const allowed = allowedKeys(level);
  if (allowed) return active.filter((w) => w.skills.every((k) => allowed.keys.has(k)) && (!w.cluster || allowed.keys.has('cluster')));
  if (L.kind === 'letters') {
    // Mots courts dont toutes les lettres ont été apprises dans cette écriture (sinon : mots courts).
    const known = new Set(learnedLetters(level));
    const short = active.filter((w) => w.text.length <= 5);
    const ok = short.filter((w) => [...plain(w.text)].every((c) => known.has(c)));
    return ok.length >= 6 ? ok : short;
  }
  if (L.kind === 'short') return active.filter((w) => w.text.length <= 5 && w.syllables.length <= 2);
  if (L.kind === 'long') return active.filter((w) => w.text.length >= 6);
  return active;
}

// Mots proposés pour jouer au niveau `level` : surtout ceux qui contiennent les graphèmes
// du niveau (nouveautés), plus des mots déjà connus en révision.
// focus : liste de notions à travailler (leçon, révision des notions difficiles).
export function poolForLevel(level, { focus = null, min = 3 } = {}) {
  const wide = widePool(level);
  let pool = wide;
  const allowed = allowedKeys(level);
  if (allowed && allowed.fresh.size) {
    const fresh = wide.filter((w) => w.skills.some((k) => allowed.fresh.has(k)) || (w.cluster && allowed.fresh.has('cluster')));
    const rest = shuffle(wide.filter((w) => !fresh.includes(w)));
    pool = fresh.concat(rest.slice(0, Math.max(Math.round(fresh.length * 0.5), 8 - fresh.length)));
  }
  if (focus && focus.length) {
    const f = wide.filter((w) => focus.some((k) => wordHas(w, k)));
    if (f.length >= min) pool = f.concat(shuffle(wide.filter((w) => !f.includes(w))).slice(0, Math.ceil(f.length / 3)));
  }
  return dedupe(pool.length >= min ? pool : wide);
}

// Choisit n mots (images distinctes) en variant le plus possible :
// - les mots déjà montrés récemment sont fortement écartés (historique sauvegardé) ;
// - les mots jamais vus ou souvent ratés reviennent un peu plus, sans jamais dominer.
const RECENT_MAX = 30;

export function weightedPick(pool, n) {
  const st = getState();
  const stats = st.stats.words;
  const recent = st.progress.recent || [];
  // Plus le pool est petit, plus la fenêtre d'exclusion doit être courte.
  const window = Math.min(RECENT_MAX, Math.max(0, pool.length - n * 2));
  const recentSet = recent.slice(-window);
  const scored = pool.map((w) => {
    const s = stats[w.id];
    let weight;
    if (!s) weight = 1.3; // jamais vu
    else {
      const rate = (s.err + 0.5) / (s.ok + s.err + 1); // taux d'erreur lissé (0..1)
      weight = 0.7 + rate; // entre ~0.7 et ~1.7 : un mot raté revient, sans saturer
    }
    const pos = recentSet.lastIndexOf(w.id);
    if (pos !== -1) {
      const age = recentSet.length - pos; // 1 = vu à l'instant
      weight *= Math.min(1, 0.05 + age / (window || 1));
    }
    return { w, k: Math.random() * weight };
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
  st.progress.recent = recent.concat(out.map((w) => w.id)).slice(-RECENT_MAX);
  save();
  return out;
}

export function invalidate() { cache = null; }
