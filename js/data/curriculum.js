// PROGRESSION PÉDAGOGIQUE : parcours, niveaux (mondes) et mini-leçons.
//
// 4 parcours, dans cet ordre :
//   1. CAPITALES : lettres simples, puis graphèmes complexes, au plus deux nouveaux digrammes
//      par niveau (ON AN → OU CH → IN AI → EU AU → OI EN → EAU GN → PH QU → …), puis révision.
//   2. SCRIPT    : une lettre à la fois (capitale ↔ script), plus de lettres, mots courts,
//      mots longs, lecture autonome, puis consolidation.
//   3. CURSIVE   : même progression que le script, en vraie cursive scolaire.
//   4. FINAL     : les trois écritures mélangées, mots et petites phrases.
//
// Chaque NOUVEAU graphème (et chaque lettre en script / en cursive) a sa mini-leçon
// obligatoire (js/screens/lesson.js) : les jeux d'un niveau n'utilisent que les graphèmes
// des niveaux précédents et ceux dont la leçon est faite. Une seule nouveauté par leçon.
//
// Une leçon de graphème (parcours capitales) :
//   id    : 'g:<clé>'                 keys : clés de graphèmes (voir graphemes.js) couvertes
//   show  : formes à montrer (texte minuscule, affiché selon l'écriture)
//   kind  : v | c | d | m | x (x = consonnes amies : TR, BR, PL…)
//   say   : prononciation RÉELLE du son pour la synthèse (mot homophone : « on », « où », « eux »…)
//   syl   : pour les sons consonnes : syllabes qui font entendre le son (jamais la consonne seule,
//           la synthèse dirait le nom de la lettre)
//   words : mots qui font entendre le son quand il ne se prononce pas seul (ill, muettes…)
//   hint  : explication pour le parent

const V = (k, say, hint) => ({ id: 'g:' + k, keys: [k], show: [k], kind: 'v', say, hint });
const C = (k, syl, hint, extra = {}) => ({ id: 'g:' + k, keys: [k], show: [k], kind: 'c', syl, hint, ...extra });
const D = (k, say, hint, extra = {}) => ({ id: 'g:' + k, keys: [k], show: [k], kind: 'd', say, hint, ...extra });
const M = (k, words, hint) => ({ id: 'g:' + k, keys: [k], show: [k.replace('_', '')], kind: 'm', words, hint });

export const GRAPHEME_LESSONS = [
  // Voyelles : le nom de la lettre est aussi son son.
  V('a', 'a', '[a] comme papa'),
  V('i', 'i', '[i] comme kiwi'),
  V('o', 'oh', '[o] comme moto'),
  V('u', 'u', '[y] comme judo'),
  V('é', 'et', '[e] comme bébé'),
  // Consonnes : on les fait entendre dans des syllabes.
  C('l', ['la', 'lo', 'li'], '[l] comme lama'),
  C('m', ['ma', 'mo', 'mi'], '[m] comme moto'),
  C('p', ['pa', 'po', 'pi'], '[p] comme papa'),
  C('t', ['ta', 'to', 'ti'], '[t] comme moto'),
  C('r', ['ra', 'ro', 'ri'], '[ʁ] comme radio'),
  C('v', ['va', 'vo', 'vi'], '[v] comme vélo'),
  C('s', ['sa', 'so', 'si'], '[s] comme sofa'),
  C('f', ['fa', 'fo', 'fi'], '[f] comme sofa'),
  C('n', ['na', 'no', 'ni'], '[n] comme piano'),
  C('d', ['da', 'do', 'di'], '[d] comme dé'),
  C('b', ['ba', 'bo', 'bi'], '[b] comme bébé'),
  C('c', ['ca', 'co', 'cu'], '[k] comme café (devant e, i : [s])'),
  C('k', ['ka', 'ko', 'ki'], '[k] comme kiwi'),
  C('j', ['ja', 'jo', 'ju'], '[ʒ] comme judo'),
  C('z', ['za', 'zo', 'zé'], '[z] comme zéro'),
  C('w', ['oui', 'wa'], '[w] comme kiwi'),
  // ON, AN
  D('on', 'on', '[ɔ̃] comme savon'),
  D('an', 'an', '[ɑ̃] comme maman'),
  // Lettres muettes et accents
  M('e_', ['lune', 'tomate'], 'e muet à la fin du mot'),
  M('t_', ['lit', 'robot'], 't muet à la fin du mot'),
  M('s_', ['souris', 'radis'], 's muet à la fin du mot'),
  V('è', 'haie', '[ɛ] comme zèbre'),
  V('ê', 'haie', '[ɛ] comme fête'),
  // OU, CH
  D('ou', 'où', '[u] comme chou'),
  C('ch', ['cha', 'cho', 'chi'], '[ʃ] comme chat', { kind: 'd' }),
  // g, x, y, consonnes amies
  C('g', ['ga', 'go', 'gu'], '[g] comme tigre (devant e, i : [ʒ])'),
  C('x', null, '[ks] comme taxi', { words: ['taxi', 'boxe'] }),
  C('y', ['ya', 'yo'], '[j] comme yoyo (parfois [i] : stylo)'),
  { id: 'g:cluster', keys: ['cluster'], show: ['tr', 'br', 'pl', 'cr'], kind: 'x', syl: ['tra', 'bro', 'pli', 'cri'], hint: 'Deux consonnes qui se lisent ensemble (TR, BR, PL…)' },
  // IN, AI, e
  D('in', 'hein', '[ɛ̃] comme sapin'),
  D('ai', 'haie', '[ɛ] comme lait'),
  V('e', 'euh', '[ə] comme cheval'),
  // EU, AU
  D('eu', 'eux', '[ø] comme feu'),
  D('au', 'oh', '[o] comme dauphin'),
  M('p_', ['loup', 'drap'], 'p muet à la fin du mot'),
  M('h_', ['hibou', 'hérisson'], 'h muet'),
  // OI, EN
  D('oi', 'oie', '[wa] comme poire'),
  D('en', 'an', '[ɑ̃] comme dent'),
  // EAU, GN, â
  D('eau', 'eau', '[o] comme bateau'),
  C('gn', ['gna', 'gnon'], '[ɲ] comme champignon', { kind: 'd' }),
  V('â', 'a', '[a] comme gâteau'),
  // PH, QU, GU
  C('ph', ['fa', 'fo', 'fi'], '[f] comme dauphin', { kind: 'd' }),
  C('qu', ['ka', 'ki', 'ko'], '[k] comme requin', { kind: 'd' }),
  C('gu', ['gui', 'gué'], '[g] comme guitare', { kind: 'd' }),
  // [e] / [ɛ] en fin de mot, ill
  { id: 'g:er', keys: ['er', 'ez'], show: ['er', 'ez'], kind: 'd', say: 'et', hint: '[e] comme panier, nez' },
  D('et', 'haie', '[ɛ] comme poulet'),
  D('ei', 'haie', '[ɛ] comme baleine'),
  D('ill', null, '[ij] comme fille, papillon', { words: ['fille', 'papillon'] }),
  // Sons complexes
  D('ain', 'hein', '[ɛ̃] comme pain'),
  D('ien', 'ien', '[jɛ̃] comme chien', { words: ['chien'] }),
  { id: 'g:am', keys: ['am', 'om', 'im'], show: ['am', 'om', 'im'], kind: 'd', say: null, words: ['jambon', 'pompier', 'imprimante'], hint: 'an, on, in devant m, b, p : am, om, im' },
  D('œu', 'euh', '[œ] comme cœur'),
  { id: 'g:double', keys: ['ss', 'll', 'tt', 'mm', 'nn', 'rr', 'pp', 'gg', 'cc', 'zz'], show: ['ss', 'll', 'tt', 'mm'], kind: 'd', say: null, words: ['poisson', 'ballon', 'carotte', 'pomme'], hint: 'Lettres doublées : deux lettres, un seul son' },
  C('ç', ['ça', 'ço', 'çu'], '[s] comme garçon'),
  V('ô', 'oh', '[o] comme fantôme'),
  { id: 'g:mute2', keys: ['d_', 'z_'], show: ['d', 'z'], kind: 'm', words: ['renard', 'riz'], hint: 'd et z muets à la fin du mot' },
  // Sons rares
  { id: 'g:eil', keys: ['eil', 'eill'], show: ['eil', 'eill'], kind: 'd', say: null, words: ['soleil', 'abeille'], hint: '[ɛj] comme soleil, abeille' },
  { id: 'g:euil', keys: ['euil', 'euill'], show: ['euil', 'euill'], kind: 'd', say: 'œil', words: ['écureuil', 'feuille'], hint: '[œj] comme écureuil, feuille' },
  D('ouill', null, '[uj] comme grenouille', { words: ['grenouille'] }),
  D('ail', 'ail', '[aj] comme corail'),
  D('ay', null, '[ɛj] comme crayon', { words: ['crayon'] }),
  D('aî', 'haie', '[ɛ] comme chaîne'),
  D('aon', 'an', '[ɑ̃] comme paon'),
  D('un', 'un', '[œ̃] comme un'),
  { id: 'g:sh', keys: ['sh', 'gh'], show: ['sh', 'gh'], kind: 'd', say: null, words: ['sushi', 'spaghetti'], hint: 'sh [ʃ] (sushi), gh [g] (spaghetti)' },
  C('q', null, '[k] comme coq', { words: ['coq', 'cinq'] }),
  { id: 'g:acc', keys: ['î', 'ï', 'û'], show: ['î', 'ï', 'û'], kind: 'v', say: null, words: ['île', 'maïs', 'flûte'], hint: 'Voyelles avec accent : î, ï, û' },
  { id: 'g:mute3', keys: ['f_', 'x_', 'i_'], show: ['f', 'x', 'i'], kind: 'm', words: ['cerf', 'ciseaux', 'oignon'], hint: 'Muettes rares : f (cerf), x (ciseaux), i (oignon)' },
];

// Lettres (parcours script et cursive) : le son de la lettre est repris de sa leçon de graphème.
const LETTER_SOUNDS = {
  e: { say: 'euh' }, h: { words: ['hibou'], mute: true }, q: { syl: ['ka', 'ki', 'ko'] }, y: { syl: ['ya', 'yo'] }, x: { words: ['taxi', 'boxe'] },
};

function letterLesson(track, letter) {
  const base = GRAPHEME_LESSONS.find((l) => l.keys[0] === letter);
  const snd = LETTER_SOUNDS[letter] || (base ? { say: base.say, syl: base.syl, words: base.words } : {});
  return { id: `${track}:${letter}`, keys: [letter], show: [letter], kind: 'letter', letter, track, ...snd, hint: `${letter.toUpperCase()} ↔ ${letter} (${track === 'lower' ? 'script' : 'cursive'})` };
}

const SCRIPT_GROUPS = [
  ['o', 'c', 's', 'v', 'w', 'x', 'z', 'u', 'k', 'p'], // lettres jumelles : même forme en petit
  ['i', 'j', 'l', 'm', 'n', 't', 'f', 'y'],           // lettres cousines
  ['a', 'b', 'd', 'e', 'g', 'h', 'q', 'r'],           // lettres qui changent de forme
];
const CURSIVE_GROUPS = [
  ['i', 'u', 't', 'l', 'e', 'c', 'o', 'a'],           // lettres rondes et simples
  ['n', 'm', 'p', 'r', 's', 'v', 'w', 'x'],
  ['b', 'd', 'f', 'g', 'h', 'j', 'k', 'q', 'y', 'z'], // lettres à boucles
];

export const LETTER_LESSONS = [
  ...SCRIPT_GROUPS.flat().map((l) => letterLesson('lower', l)),
  ...CURSIVE_GROUPS.flat().map((l) => letterLesson('cursive', l)),
];

export const LESSONS = [...GRAPHEME_LESSONS, ...LETTER_LESSONS];
const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));
export function lessonById(id) { return LESSON_BY_ID.get(id); }

// ── NIVEAUX ──────────────────────────────────────────────────────────────────
// kind : graphemes (leçons de graphèmes, capitales) · letters (une lettre ↔ ses formes)
//        short / long / autonomous (mots en script / cursive) · review · final
// script : écriture des mots (caps | bridge | lower | cbridge | cursive | mixed)
// pair   : deux écritures à associer (jeux « lettres jumelles » et « même mot »)
// need   : manches de jeu gagnées pour ouvrir le niveau suivant (en plus des leçons)
// games  : jeux proposés, dans l'ordre du menu
const G_CAPS_EARLY = ['sounds', 'match', 'build', 'listen'];
const G_CAPS = ['sounds', 'match', 'build', 'syllables', 'mystery', 'listen'];
const G_LETTERS = ['letters', 'sounds'];

const L = (o) => ({ need: 4, colors: true, ...o });
const g = (...ids) => ids.map((k) => 'g:' + k);

const RAW_LEVELS = [
  // ───── CAPITALES
  L({ id: 'c1', track: 'caps', world: 'La forêt des voyelles', title: 'A I O U É, L M P T R', emoji: '🌳', bg: ['#d8f3c4', '#a8e08a'], color: '#3f9b2f', kind: 'graphemes', script: 'caps', games: G_CAPS_EARLY, lessons: g('a', 'i', 'o', 'u', 'é', 'l', 'm', 'p', 't', 'r') }),
  L({ id: 'c2', track: 'caps', world: 'Le village des consonnes', title: 'V S F N D B C K J Z W', emoji: '🏡', bg: ['#ffe9c2', '#ffd08a'], color: '#d9822b', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('v', 's', 'f', 'n', 'd', 'b', 'c', 'k', 'j', 'z', 'w') }),
  L({ id: 'c3', track: 'caps', world: 'La montagne ON AN', title: 'Mes premiers sons verts : ON, AN', emoji: '⛰️', bg: ['#d7ecff', '#a9d1ff'], color: '#2f7bd9', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('on', 'an') }),
  L({ id: 'c4', track: 'caps', world: 'Le lac des lettres muettes', title: 'Les lettres muettes, È et Ê', emoji: '🌙', bg: ['#e2e4f7', '#b9bdea'], color: '#5560b8', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('e_', 't_', 's_', 'è', 'ê') }),
  L({ id: 'c5', track: 'caps', world: 'La plage OU CH', title: 'OU, CH', emoji: '🐚', bg: ['#fff4d6', '#ffe1a1'], color: '#c98a12', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('ou', 'ch') }),
  L({ id: 'c6', track: 'caps', world: 'La clairière', title: 'G, X, Y et les consonnes amies', emoji: '🍄', bg: ['#ffe2dc', '#ffbcae'], color: '#d4563c', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('g', 'x', 'y', 'cluster') }),
  L({ id: 'c7', track: 'caps', world: 'La grotte IN AI', title: 'IN, AI et le E', emoji: '💎', bg: ['#e5dcff', '#c8b6ff'], color: '#7a4fd1', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('in', 'ai', 'e') }),
  L({ id: 'c8', track: 'caps', world: 'L’arc-en-ciel EU AU', title: 'EU, AU, P et H muets', emoji: '🌈', bg: ['#dcf5ff', '#ffe0f0'], color: '#d94f86', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('eu', 'au', 'p_', 'h_') }),
  L({ id: 'c9', track: 'caps', world: 'Le bois OI EN', title: 'OI, EN', emoji: '🦉', bg: ['#e4f2d5', '#c3e3a3'], color: '#5c8f2a', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('oi', 'en') }),
  L({ id: 'c10', track: 'caps', world: 'Le port EAU GN', title: 'EAU, GN et Â', emoji: '⛵', bg: ['#d2f1ff', '#9edcf7'], color: '#1f86b8', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('eau', 'gn', 'â') }),
  L({ id: 'c11', track: 'caps', world: 'Le lagon PH QU', title: 'PH, QU', emoji: '🐬', bg: ['#d2f7f2', '#94e6dc'], color: '#1f9e8f', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('ph', 'qu') }),
  L({ id: 'c12', track: 'caps', world: 'Le cirque des sons [é] [è]', title: 'ER EZ, ET, EI, GU, ILL', emoji: '🎪', bg: ['#ffe0ec', '#ffb8d2'], color: '#c43c74', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('er', 'et', 'ei', 'gu', 'ill') }),
  L({ id: 'c13', track: 'caps', world: 'Le château des sons complexes', title: 'AIN, IEN, AM OM IM, ŒU, lettres doublées…', emoji: '🏰', bg: ['#eadcff', '#cdb2ff'], color: '#6a40c0', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('ain', 'ien', 'am', 'œu', 'double', 'ç', 'ô', 'mute2') }),
  L({ id: 'c14', track: 'caps', world: 'Le volcan des sons rares', title: 'EIL, EUIL, OUILL, AIL, AY…', emoji: '🌋', bg: ['#ffe3cf', '#ffbf94'], color: '#c75a1a', kind: 'graphemes', script: 'caps', games: G_CAPS, lessons: g('eil', 'euil', 'ouill', 'ail', 'ay', 'aî', 'aon', 'un', 'sh', 'q', 'acc', 'mute3') }),
  L({ id: 'c15', track: 'caps', world: 'La révision des capitales', title: 'Tous mes sons en capitales', emoji: '📚', bg: ['#fff3b8', '#ffe066'], color: '#b38800', kind: 'review', script: 'caps', games: G_CAPS, lessons: [], need: 6 }),

  // ───── SCRIPT
  L({ id: 's1', track: 'lower', world: 'Le jardin des lettres jumelles', title: 'Une lettre, deux formes', emoji: '🌷', bg: ['#ffe0ec', '#ffb8d2'], color: '#d94f86', kind: 'letters', script: 'lower', pair: ['caps', 'lower'], games: G_LETTERS, lessons: SCRIPT_GROUPS[0].map((l) => 'lower:' + l) }),
  L({ id: 's2', track: 'lower', world: 'Le jardin des lettres cousines', title: 'Encore des lettres', emoji: '🌼', bg: ['#fff6c9', '#ffe58a'], color: '#c29a00', kind: 'letters', script: 'lower', pair: ['caps', 'lower'], games: G_LETTERS, lessons: SCRIPT_GROUPS[1].map((l) => 'lower:' + l) }),
  L({ id: 's3', track: 'lower', world: 'Le jardin des lettres magiques', title: 'Les lettres qui changent de forme', emoji: '🌺', bg: ['#ffe2dc', '#ffbcae'], color: '#d4563c', kind: 'letters', script: 'lower', pair: ['caps', 'lower'], games: G_LETTERS, lessons: SCRIPT_GROUPS[2].map((l) => 'lower:' + l) }),
  L({ id: 's4', track: 'lower', world: 'L’île des petits mots', title: 'Des mots courts en script', emoji: '🏝️', bg: ['#d2f7f2', '#94e6dc'], color: '#1f9e8f', kind: 'short', script: 'bridge', pair: ['caps', 'lower'], games: ['cases', 'match', 'listen', 'build'], lessons: [] }),
  L({ id: 's5', track: 'lower', world: 'L’île des grands mots', title: 'Des mots longs en script', emoji: '🐠', bg: ['#d2f1ff', '#9edcf7'], color: '#1f86b8', kind: 'long', script: 'lower', pair: ['caps', 'lower'], games: ['match', 'syllables', 'build', 'mystery', 'cases'], lessons: [] }),
  L({ id: 's6', track: 'lower', world: 'Le phare des lecteurs', title: 'Je lis tout seul en script', emoji: '🗼', bg: ['#e2e4f7', '#b9bdea'], color: '#5560b8', kind: 'autonomous', script: 'lower', pair: ['caps', 'lower'], colors: false, games: ['mystery', 'listen', 'match', 'sentences'], lessons: [] }),
  L({ id: 's7', track: 'lower', world: 'La consolidation script', title: 'Je révise en script', emoji: '📗', bg: ['#e4f2d5', '#c3e3a3'], color: '#5c8f2a', kind: 'review', script: 'lower', pair: ['caps', 'lower'], games: ['match', 'build', 'syllables', 'mystery', 'listen', 'cases'], lessons: [], need: 6 }),

  // ───── CURSIVE
  L({ id: 'k1', track: 'cursive', world: 'Le ruisseau des lettres rondes', title: 'Mes premières lettres attachées', emoji: '✏️', bg: ['#f3e8ff', '#dcc4ff'], color: '#8a4fd1', kind: 'letters', script: 'cursive', pair: ['lower', 'cursive'], games: G_LETTERS, lessons: CURSIVE_GROUPS[0].map((l) => 'cursive:' + l) }),
  L({ id: 'k2', track: 'cursive', world: 'Le pont des lettres ponts', title: 'Encore des lettres attachées', emoji: '🌉', bg: ['#dcf5ff', '#b3e4ff'], color: '#2f7bd9', kind: 'letters', script: 'cursive', pair: ['lower', 'cursive'], games: G_LETTERS, lessons: CURSIVE_GROUPS[1].map((l) => 'cursive:' + l) }),
  L({ id: 'k3', track: 'cursive', world: 'La colline des boucles', title: 'Les lettres à boucles', emoji: '🎠', bg: ['#ffe9c2', '#ffd08a'], color: '#d9822b', kind: 'letters', script: 'cursive', pair: ['lower', 'cursive'], games: G_LETTERS, lessons: CURSIVE_GROUPS[2].map((l) => 'cursive:' + l) }),
  L({ id: 'k4', track: 'cursive', world: 'Le village des mots attachés', title: 'Des mots courts en cursive', emoji: '🏘️', bg: ['#e4f2d5', '#c3e3a3'], color: '#5c8f2a', kind: 'short', script: 'cbridge', pair: ['lower', 'cursive'], games: ['cases', 'match', 'listen', 'build'], lessons: [] }),
  L({ id: 'k5', track: 'cursive', world: 'La forêt des grands mots attachés', title: 'Des mots longs en cursive', emoji: '🌲', bg: ['#d8f3c4', '#a8e08a'], color: '#3f9b2f', kind: 'long', script: 'cursive', pair: ['caps', 'cursive'], games: ['match', 'syllables', 'build', 'mystery', 'cases'], lessons: [] }),
  L({ id: 'k6', track: 'cursive', world: 'La tour des lecteurs', title: 'Je lis tout seul en cursive', emoji: '🗽', bg: ['#e2e4f7', '#b9bdea'], color: '#5560b8', kind: 'autonomous', script: 'cursive', pair: ['lower', 'cursive'], colors: false, games: ['mystery', 'listen', 'match', 'sentences'], lessons: [] }),
  L({ id: 'k7', track: 'cursive', world: 'La consolidation cursive', title: 'Je révise en cursive', emoji: '📘', bg: ['#d2f1ff', '#9edcf7'], color: '#1f86b8', kind: 'review', script: 'cursive', pair: ['caps', 'cursive'], games: ['match', 'build', 'syllables', 'mystery', 'listen', 'cases'], lessons: [], need: 6 }),

  // ───── FINAL
  L({ id: 'f1', track: 'final', world: 'Le royaume des lecteurs', title: 'Les trois écritures, des mots et des phrases', emoji: '👑', bg: ['#fff3b8', '#ffe066'], color: '#c99a00', kind: 'final', script: 'mixed', pair: ['caps', 'cursive'], games: ['match', 'mystery', 'listen', 'sentences', 'build', 'syllables', 'cases'], lessons: [], need: 0 }),
];

export const LEVELS = RAW_LEVELS.map((lv, i) => ({ ...lv, n: i + 1 }));
export const LEVEL_COUNT = LEVELS.length;

export const TRACKS = [
  { id: 'caps', label: 'Capitales', short: 'CAPITALES', emoji: '🔠', script: 'caps' },
  { id: 'lower', label: 'Script', short: 'script', emoji: '🔡', script: 'lower' },
  { id: 'cursive', label: 'Cursive', short: 'cursive', emoji: '✍️', script: 'cursive' },
  { id: 'final', label: 'Les trois écritures', short: 'Les 3 écritures', emoji: '👑', script: 'mixed' },
];

export function levelInfo(n) { return LEVELS[Math.max(1, Math.min(LEVEL_COUNT, n)) - 1]; }
export function levelById(id) { return LEVELS.find((l) => l.id === id); }

// Niveau (capitales) où une clé de graphème est introduite.
const KEY_LEVEL = new Map();
const KEY_LESSON = new Map();
for (const lv of LEVELS) {
  if (lv.kind !== 'graphemes') continue;
  for (const id of lv.lessons) {
    const les = lessonById(id);
    les.level = lv.n;
    for (const k of les.keys) { KEY_LEVEL.set(k, lv.n); KEY_LESSON.set(k, les); }
  }
}
for (const lv of LEVELS) for (const id of lv.lessons) { const les = lessonById(id); if (les.level == null) les.level = lv.n; }

const LAST_CAPS = LEVELS.filter((l) => l.kind === 'graphemes').slice(-1)[0].n;
export function keyLevel(key) { return KEY_LEVEL.get(key) ?? LAST_CAPS; }
export function lessonForKey(key) { return KEY_LESSON.get(key) || null; }
export function capsLevelCount() { return LAST_CAPS; }

// Un mot a-t-il des consonnes amies (deux consonnes en début de syllabe : TR, BL…) ?
export function hasCluster(word) {
  let i = 0;
  for (const syl of word.syllables) {
    const kinds = [];
    let n = 0;
    while (n < syl.length && i < word.graphemes.length) {
      const g = word.graphemes[i];
      kinds.push(g.k);
      n += g.t.length;
      i += 1;
    }
    if (kinds[0] === 'c' && kinds[1] === 'c') return true;
  }
  return false;
}

// Niveau (capitales) à partir duquel un mot peut être lu.
export function wordCapsLevel(word) {
  let lv = 1;
  for (const k of word.skills) lv = Math.max(lv, keyLevel(k));
  if (word.cluster) lv = Math.max(lv, keyLevel('cluster'));
  return lv;
}

// Difficulté « historique » (1..7) utilisée par les jeux pour doser leurs variantes
// (distracteurs proches, syllabes, mots sans couleurs…).
export function stageFor(n) {
  const L = levelInfo(n);
  if (L.kind === 'graphemes') { const i = Number(L.id.slice(1)); return i <= 2 ? 1 : i <= 5 ? 2 : i <= 9 ? 3 : 4; }
  if (L.kind === 'review') return L.track === 'caps' ? 4 : 6;
  if (L.kind === 'letters' || L.kind === 'short') return 5;
  if (L.kind === 'final') return 7;
  return 6;
}
