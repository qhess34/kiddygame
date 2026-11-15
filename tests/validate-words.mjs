// Validation de la bibliothèque de mots : node tests/validate-words.mjs
// Sort en code 1 si une erreur est trouvée.
import { WORDS } from '../js/data/words.js';
import { GRAPHEMES } from '../js/data/graphemes.js';
import { SMALL_WORDS, SENTENCES } from '../js/data/sentences.js';
import { buildWord } from '../js/core/words.js';
import { LEVELS, LESSONS, GRAPHEME_LESSONS, lessonForKey, keyLevel } from '../js/data/curriculum.js';

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);

// Le niveau d'un mot est CALCULÉ (data/curriculum.js) : premier niveau du parcours capitales où
// tous ses graphèmes ont eu leur mini-leçon. Minimum de mots lisibles par niveau de capitales :
const CAPS_LEVELS = LEVELS.filter((l) => l.kind === 'graphemes');
const QUOTA = Object.fromEntries(CAPS_LEVELS.map((l) => [l.n, l.n === 1 ? 6 : 10]));
const SMALL_LEVEL = 99; // les mots-outils ne servent que dans les phrases (niveau final)

// ── Graphèmes
const G = new Map();
for (const g of GRAPHEMES) {
  if (G.has(g.key)) err(`graphème en double : ${g.key}`);
  G.set(g.key, g);
  if (!['v', 'c', 'd', 'm'].includes(g.kind)) err(`graphème ${g.key} : kind invalide « ${g.kind} »`);
  if (!lessonForKey(g.key)) err(`graphème ${g.key} : aucune mini-leçon dans curriculum.js`);
  else if (g.level !== keyLevel(g.key)) err(`graphème ${g.key} : level ${g.level} ≠ niveau de sa leçon (${keyLevel(g.key)})`);
  if (!g.label || !g.sound) err(`graphème ${g.key} : label ou sound manquant`);
  if (g.kind === 'm' && !g.key.endsWith('_')) err(`graphème ${g.key} : une muette doit finir par _`);
}

// ── Emoji : un seul graphème visuel, pictographique (ou touche numérique 0️⃣…🔟), pas de texte simple.
const SEG = new Intl.Segmenter('fr', { granularity: 'grapheme' });
function isSingleEmoji(img) {
  const parts = [...SEG.segment(img)];
  if (parts.length !== 1) return false;
  if (/^[0-9#*]\uFE0F\u20E3$/u.test(img)) return true;
  if (!/\p{Extended_Pictographic}/u.test(img)) return false;
  // Un pictogramme « texte » par défaut (ex. ☂, ✂) doit porter le sélecteur emoji U+FE0F.
  const first = String.fromCodePoint(img.codePointAt(0));
  if (!/\p{Emoji_Presentation}/u.test(first) && !img.includes('\uFE0F') && [...img].length === 1) return false;
  return true;
}

// ── Mots
function checkWord(raw, i, { small = false } = {}) {
  const where = `${small ? 'SMALL_WORDS' : 'WORDS'}[${i}] « ${raw.w} »`;
  const w = buildWord(raw, i);
  const lvl = small ? SMALL_LEVEL : w.level;
  if (w.errors.length) w.errors.forEach((e) => err(`${where} : ${e} (mot rejeté par buildWord)`));
  if (raw.w !== raw.w.toLowerCase() || raw.w !== raw.w.trim()) err(`${where} : doit être en minuscules sans espace`);
  if (/[\s'’-]/.test(raw.w)) err(`${where} : pas d'espace, d'apostrophe ni de trait d'union`);
  if (!small) {
    if (!raw.img) err(`${where} : img manquante`);
    else if (!isSingleEmoji(raw.img)) err(`${where} : img « ${raw.img} » n'est pas un emoji unique rendu en couleur`);
  }
  if (!raw.g) err(`${where} : g manquant`);
  if (!raw.s) err(`${where} : s manquant`);
  for (const g of w.graphemes) {
    const def = G.get(g.key);
    if (!def) { err(`${where} : graphème « ${g.key} » absent de GRAPHEMES`); continue; }
    if (g.k !== 'm' && def.kind !== 'm' && g.k !== def.kind && g.key !== 'y') err(`${where} : « ${g.key} » de type ${g.k} ≠ ${def.kind} dans GRAPHEMES`);
  }
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
// ── Mini-leçons
const lessonIds = new Set();
for (const l of LESSONS) {
  if (lessonIds.has(l.id)) err(`leçon en double : ${l.id}`);
  lessonIds.add(l.id);
  if (l.kind !== 'm' && l.kind !== 'letter' && !l.say && !l.syl && !l.words) err(`leçon ${l.id} : aucun son (say / syl / words)`);
}
for (const L of LEVELS) for (const id of L.lessons) if (!lessonIds.has(id)) err(`niveau ${L.id} : leçon inconnue ${id}`);
// Chaque leçon de graphème doit avoir des mots illustrés qui le contiennent (étape 4).
// « un » n'existe que comme mot-outil (pas d'image) : l'étape 4 est alors sautée.
for (const l of GRAPHEME_LESSONS) {
  const n = words.filter((w) => l.keys.some((k) => (k === 'cluster' ? w.cluster : w.skills.includes(k)))).length;
  if (n < 1 && l.id !== 'g:un') err(`leçon ${l.id} : aucun mot illustré`);
  else if (n < 2) warnings.push(`leçon ${l.id} : ${n} mot illustré seulement`);
}
// Au plus deux nouveaux digrammes par niveau (sauf les deux mondes des sons complexes / rares).
for (const L of CAPS_LEVELS) {
  const d = L.lessons.map((id) => LESSONS.find((x) => x.id === id)).filter((x) => x.kind === 'd');
  if (d.length > 2 && !['c13', 'c14', 'c12'].includes(L.id)) err(`niveau ${L.id} : ${d.length} digrammes nouveaux (max 2)`);
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
  if (s.lvl !== 7) err(`${where} : lvl doit être 7 (difficulté du niveau final)`);
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
console.log('Nouveaux mots lisibles par niveau (parcours capitales) :');
for (const L of CAPS_LEVELS) console.log(`  ${L.id} ${L.world} : ${perLevel[L.n] || 0} mots (min ${QUOTA[L.n]})`);
console.log(`  total : ${words.length} mots, ${smalls.length} mots-outils, ${SENTENCES.length} phrases en ${groups.size} groupes`);
console.log('Leçons par niveau :');
for (const L of LEVELS) if (L.lessons.length) console.log(`  ${L.id} : ${L.lessons.map((id) => id.split(':')[1]).join(' ')}`);
warnings.forEach((w) => console.log('⚠ ' + w));
if (errors.length) {
  console.error(`\n✗ ${errors.length} erreur(s) :`);
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log('\n✓ Bibliothèque valide.');
