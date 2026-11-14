// Validation de la bibliothèque de mots : node tests/validate-words.mjs
// Sort en code 1 si une erreur est trouvée.
import { WORDS } from '../js/data/words.js';
import { GRAPHEMES } from '../js/data/graphemes.js';
import { SMALL_WORDS, SENTENCES } from '../js/data/sentences.js';
import { buildWord } from '../js/core/words.js';

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);

const QUOTA = { 1: 20, 2: 30, 3: 30, 4: 30, 5: 30, 6: 30, 7: 30 };
const SMALL_LEVEL = 7; // les mots-outils ne servent que dans les phrases (niveau 7)

// ── Graphèmes
const G = new Map();
for (const g of GRAPHEMES) {
  if (G.has(g.key)) err(`graphème en double : ${g.key}`);
  G.set(g.key, g);
  if (!['v', 'c', 'd', 'm'].includes(g.kind)) err(`graphème ${g.key} : kind invalide « ${g.kind} »`);
  if (!(g.level >= 1 && g.level <= 7)) err(`graphème ${g.key} : niveau invalide`);
  if (!g.label || !g.sound) err(`graphème ${g.key} : label ou sound manquant`);
  if (g.kind === 'm' && !g.key.endsWith('_')) err(`graphème ${g.key} : une muette doit finir par _`);
}

// ── Mots
function checkWord(raw, i, { small = false } = {}) {
  const where = `${small ? 'SMALL_WORDS' : 'WORDS'}[${i}] « ${raw.w} »`;
  const w = buildWord(raw, i);
  const lvl = small ? SMALL_LEVEL : raw.lvl;
  if (w.errors.length) w.errors.forEach((e) => err(`${where} : ${e} (mot rejeté par buildWord)`));
  if (raw.w !== raw.w.toLowerCase() || raw.w !== raw.w.trim()) err(`${where} : doit être en minuscules sans espace`);
  if (/[\s'’-]/.test(raw.w)) err(`${where} : pas d'espace, d'apostrophe ni de trait d'union`);
  if (!small) {
    if (!Number.isInteger(raw.lvl) || raw.lvl < 1 || raw.lvl > 7) err(`${where} : lvl invalide`);
    if (!raw.img) err(`${where} : img manquante`);
  }
  if (!raw.g) err(`${where} : g manquant`);
  if (!raw.s) err(`${where} : s manquant`);
  for (const g of w.graphemes) {
    const def = G.get(g.key);
    if (!def) { err(`${where} : graphème « ${g.key} » absent de GRAPHEMES`); continue; }
    if (def.level > lvl) err(`${where} (niveau ${lvl}) : utilise « ${g.key} » introduit au niveau ${def.level}`);
    if (g.k !== 'm' && def.kind !== 'm' && g.k !== def.kind && g.key !== 'y') err(`${where} : « ${g.key} » de type ${g.k} ≠ ${def.kind} dans GRAPHEMES`);
  }
  if (lvl === 1 && w.graphemes.some((g) => g.k === 'm')) err(`${where} : lettre muette interdite au niveau 1`);
  if (lvl <= 2 && w.graphemes.some((g) => g.k === 'd')) err(`${where} : digramme interdit aux niveaux 1-2`);
  if (raw.ssay) {
    if (!Array.isArray(raw.ssay)) err(`${where} : ssay doit être un tableau`);
    else if (raw.ssay.length !== w.syllables.length) err(`${where} : ssay (${raw.ssay.length}) ≠ syllabes (${w.syllables.length})`);
  }
  if (w.syllables.some((s) => !s)) err(`${where} : syllabe vide`);
  return w;
}

const words = WORDS.map((r, i) => checkWord(r, i));
const smalls = SMALL_WORDS.map((r, i) => checkWord(r, i, { small: true }));

const seenText = new Map();
const seenImg = new Map();
for (const w of words) {
  if (seenText.has(w.text)) err(`mot en double : ${w.text}`);
  seenText.set(w.text, w);
  if (seenImg.has(w.img)) err(`emoji en double : ${w.img} (${seenImg.get(w.img).text} / ${w.text})`);
  seenImg.set(w.img, w);
}
const seenSmall = new Set();
for (const w of smalls) {
  if (seenSmall.has(w.text)) err(`SMALL_WORDS en double : ${w.text}`);
  seenSmall.add(w.text);
  if (seenText.has(w.text)) warnings.push(`« ${w.text} » est à la fois dans WORDS et SMALL_WORDS (WORDS prioritaire)`);
}

const perLevel = {};
for (const w of words) perLevel[w.level] = (perLevel[w.level] || 0) + 1;
for (const [l, q] of Object.entries(QUOTA)) {
  if ((perLevel[l] || 0) < q) err(`niveau ${l} : ${perLevel[l] || 0} mots (minimum ${q})`);
}

// Exemple de chaque graphème : doit exister et contenir le graphème.
const byText = new Map([...smalls, ...words].map((w) => [w.text, w]));
for (const g of GRAPHEMES) {
  const ex = byText.get(g.example);
  if (!ex) err(`graphème ${g.key} : exemple « ${g.example} » absent de la bibliothèque`);
  else if (!ex.skills.includes(g.key)) err(`graphème ${g.key} : l'exemple « ${g.example} » ne l'utilise pas`);
}
const used = new Set([...words, ...smalls].flatMap((w) => w.skills));
for (const g of GRAPHEMES) if (!used.has(g.key)) warnings.push(`graphème ${g.key} jamais utilisé`);
// Le niveau d'un graphème doit correspondre à sa première apparition (sinon la progression ment).
for (const g of GRAPHEMES) {
  const lv = words.filter((w) => w.skills.includes(g.key)).map((w) => w.level);
  const first = lv.length ? Math.min(...lv) : SMALL_LEVEL;
  if (first !== g.level) warnings.push(`graphème ${g.key} : niveau ${g.level} mais premier mot au niveau ${first}`);
}

// ── Phrases
const groups = new Map();
SENTENCES.forEach((s, i) => {
  const where = `SENTENCES[${i}] « ${s.text} »`;
  if (s.text !== s.text.trim().toLowerCase()) err(`${where} : doit être en minuscules`);
  if (/[.,!?;:'’-]/.test(s.text)) err(`${where} : ponctuation, apostrophe ou trait d'union interdits`);
  if (/\s{2,}/.test(s.text)) err(`${where} : espaces multiples`);
  for (const tok of s.text.split(' ')) if (!byText.has(tok)) err(`${where} : mot « ${tok} » absent de WORDS et SMALL_WORDS`);
  const n = [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(s.img || '')].length;
  if (n < 1 || n > 3) err(`${where} : img doit contenir 1 à 3 emoji (${n})`);
  if (s.lvl !== 7) err(`${where} : lvl doit être 7`);
  if (!s.group) err(`${where} : group manquant`);
  else { if (!groups.has(s.group)) groups.set(s.group, []); groups.get(s.group).push(s); }
});
if (SENTENCES.length < 30) err(`seulement ${SENTENCES.length} phrases (minimum 30)`);
if (new Set(SENTENCES.map((s) => s.text)).size !== SENTENCES.length) err('phrase en double');
for (const [g, list] of groups) {
  if (list.length < 2) err(`groupe « ${g} » : au moins 2 phrases requises`);
  const imgs = new Set(list.map((s) => s.img));
  if (imgs.size !== list.length) err(`groupe « ${g} » : images non distinctes`);
}
const allImgs = SENTENCES.map((s) => s.img);
if (new Set(allImgs).size !== allImgs.length) warnings.push('deux phrases de groupes différents partagent la même image');

// ── Résumé
console.log('Mots par niveau :');
for (let l = 1; l <= 7; l++) console.log(`  niveau ${l} : ${perLevel[l] || 0} mots (min ${QUOTA[l]})`);
console.log(`  total : ${words.length} mots, ${smalls.length} mots-outils, ${SENTENCES.length} phrases en ${groups.size} groupes`);
console.log('Graphèmes par niveau :');
for (let l = 1; l <= 7; l++) console.log(`  niveau ${l} : ${GRAPHEMES.filter((g) => g.level === l).map((g) => g.key).join(' ')}`);
warnings.forEach((w) => console.log('⚠ ' + w));
if (errors.length) {
  console.error(`\n✗ ${errors.length} erreur(s) :`);
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log('\n✓ Bibliothèque valide.');
