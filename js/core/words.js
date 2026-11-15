// Analyse et requêtes sur la bibliothèque de mots.
import { hasCluster, wordCapsLevel } from '../data/curriculum.js';
//
// FORMAT D'AUTEUR D'UN MOT (voir js/data/words.js) :
//   { w: 'chat', g: 'ch a t', s: 'chat', img: '🐱', lvl: 3 }
//   w   : orthographe en minuscules (avec accents)
//   g   : graphèmes séparés par des espaces.
//         - lettre voyelle seule            -> voyelle (rouge)
//         - lettre consonne seule           -> consonne (bleu)
//         - groupe de 2 ou 3 lettres        -> digramme/trigramme (vert)
//         - suffixe "_"  (ex. "t_", "e_")   -> lettre muette (noir)
//         - suffixe ":v" / ":c" / ":d"      -> force le type (ex. "y:c" dans "yoyo")
//   s   : syllabes écrites séparées par "-" (ex. "to-ma-te"). Défaut = mot entier.
//   img : illustration (emoji)
//   lvl : (ignoré) le niveau est calculé à partir des graphèmes (data/curriculum.js)
//   say : (option) texte à faire prononcer à la synthèse vocale si besoin
//   ssay: (option) tableau des prononciations des syllabes (ex. ['to','ma','teu'])

export const VOWEL_LETTERS = 'aeiouyéèêëàâäîïôöûùüœ';

export const KIND_LABEL = {
  v: 'voyelle',
  c: 'consonne',
  d: 'digramme / graphème complexe',
  m: 'lettre muette',
};

export function parseGraphemes(str) {
  return str.trim().split(/\s+/).map((tok) => {
    let kind = null;
    let t = tok;
    const m = t.match(/:(v|c|d)$/);
    if (m) { kind = m[1]; t = t.slice(0, -2); }
    if (t.endsWith('_')) { kind = 'm'; t = t.slice(0, -1); }
    if (!kind) {
      if ([...t].length > 1) kind = 'd';
      else kind = VOWEL_LETTERS.includes(t) ? 'v' : 'c';
    }
    return { t, k: kind, key: kind === 'm' ? t + '_' : t };
  });
}

export function buildWord(raw, idx = 0) {
  const text = raw.w.trim();
  const graphemes = parseGraphemes(raw.g || [...text].join(' '));
  const syllables = (raw.s || text).split('-');
  const word = {
    id: raw.id || text,
    text,
    level: raw.lvl || 1,
    img: raw.img || '❓',
    graphemes,
    syllables,
    say: raw.say || text,
    sylSay: raw.ssay || null,
    custom: !!raw.custom,
    order: idx,
  };
  word.skills = [...new Set(graphemes.map((g) => g.key))];
  word.errors = validateWord(word);
  // Niveau calculé : le mot devient lisible quand tous ses graphèmes ont été appris.
  word.cluster = word.errors.length === 0 && hasCluster(word);
  word.level = wordCapsLevel(word);
  return word;
}

export function validateWord(word) {
  const errs = [];
  const fromG = word.graphemes.map((g) => g.t).join('');
  if (fromG !== word.text) errs.push(`graphèmes "${fromG}" ≠ mot "${word.text}"`);
  const fromS = word.syllables.join('');
  if (fromS !== word.text) errs.push(`syllabes "${fromS}" ≠ mot "${word.text}"`);
  return errs;
}

// Couleur (type) de chaque lettre du mot, dans l'ordre.
export function letterKinds(word) {
  const out = [];
  word.graphemes.forEach((g, gi) => {
    [...g.t].forEach(() => out.push({ k: g.k, gi }));
  });
  return out;
}

export function displayText(text, script) {
  return script === 'caps' ? text.toLocaleUpperCase('fr-FR') : text;
}

// Écriture concrète d'un affichage : 'mixed' -> une des trois écritures au hasard,
// 'bridge' -> script (avec rappel en capitales), 'cbridge' -> cursive (avec rappel en script).
export function concreteScript(script) {
  if (script === 'mixed') return ['caps', 'lower', 'cursive'][Math.floor(Math.random() * 3)];
  if (script === 'bridge') return 'lower';
  if (script === 'cbridge') return 'cursive';
  return script || 'caps';
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}

// Similarité visuelle simple entre deux mots (pour choisir des distracteurs
// proches sans être piégeux) : lettres communes en début + longueur proche.
export function similarity(a, b) {
  let prefix = 0;
  while (prefix < a.length && a[prefix] === b[prefix]) prefix++;
  const setA = new Set(a);
  let common = 0;
  for (const ch of new Set(b)) if (setA.has(ch)) common++;
  return prefix * 2 + common - Math.abs(a.length - b.length);
}

// Choisit n distracteurs pour `target` dans `pool` :
// mots distincts, images distinctes, orthographe différente.
// hard = 0 (au hasard) .. 1 (mots visuellement proches)
export function pickDistractors(target, pool, n, hard = 0) {
  const candidates = pool.filter((w) => w.text !== target.text && w.img !== target.img);
  if (!hard) return pickRandom(candidates, n);
  const scored = shuffle(candidates)
    .map((w) => ({ w, s: similarity(target.text, w.text) + Math.random() * (1 - hard) * 6 }))
    .sort((x, y) => y.s - x.s);
  // On garde de la variété : on prend dans le haut du classement sans viser
  // systématiquement le plus proche.
  const top = scored.slice(0, Math.max(n, 6)).map((x) => x.w);
  return pickRandom(top, n);
}
