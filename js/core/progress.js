// Acquis de l'enfant : graphèmes connus par niveau, lettres apprises par écriture,
// et statuts pédagogiques (« À découvrir », « En cours », « À consolider », « Acquis »).
import { getState, isLessonDone, levelComplete } from './state.js';
import { LEVELS, lessonById, lessonForKey, levelInfo } from '../data/curriculum.js';

export const STATUS = {
  discover: { label: 'À découvrir', icon: '⚪', rank: 0 },
  progress: { label: 'En cours', icon: '🟡', rank: 1 },
  consolidate: { label: 'À consolider', icon: '🟠', rank: 2 },
  acquired: { label: 'Acquis', icon: '🟢', rank: 3 },
};

// Statut à partir des réponses : { ok, err, h } (h = 6 dernières réponses, '1' juste / '0' raté).
export function statusFromStats(s) {
  if (!s || s.ok + s.err === 0) return null;
  const h = s.h || '';
  const recentErr = (h.match(/0/g) || []).length;
  const rate = s.ok / (s.ok + s.err);
  if (s.ok >= 6 && h.length >= 4 && recentErr <= 1 && rate >= 0.75) return 'acquired';
  if (s.ok + s.err >= 3 && (recentErr >= 2 || rate < 0.7)) return 'consolidate';
  return 'progress';
}

function scriptStats(script) {
  const b = getState().stats.byScript[script];
  return b || { graphemes: {}, letters: {}, words: {} };
}

// Statut d'une leçon (graphème(s) ou lettre) dans une écriture donnée.
// Capitales : sans leçon faite ni réponse → « À découvrir ». Script / cursive : selon les réponses.
export function lessonStatus(lesson, script = 'caps') {
  if (!lesson) return 'discover';
  let statuses;
  if (lesson.kind === 'letter') {
    statuses = [statusFromStats(scriptStats(lesson.track).letters[lesson.letter])];
    script = lesson.track;
  } else {
    const map = script === 'all' ? getState().stats.graphemes : scriptStats(script).graphemes;
    statuses = lesson.keys.map((k) => statusFromStats(map[k]));
  }
  const tried = statuses.filter(Boolean);
  const done = isLessonDone(lesson.id);
  if (!tried.length) return done ? 'progress' : 'discover';
  if (tried.includes('consolidate')) return 'consolidate';
  if (tried.length === statuses.length && tried.every((s) => s === 'acquired')) return done || script !== 'caps' ? 'acquired' : 'progress';
  return 'progress';
}

export function keyStatus(key, script = 'caps') {
  const lesson = lessonForKey(key);
  const st = statusFromStats(scriptStats(script).graphemes[key]);
  if (st) return st;
  if (script === 'caps' && lesson && isLessonDone(lesson.id)) return 'progress';
  return 'discover';
}

// Graphèmes connus pour jouer au niveau n (parcours capitales) :
// tous ceux des niveaux précédents + ceux du niveau dont la leçon est faite.
// Pour les autres parcours : tous (null).
export function allowedKeys(n) {
  const L = levelInfo(n);
  if (L.kind !== 'graphemes') return null;
  const st = getState();
  const whole = st.settings.unlockAll || levelComplete(n);
  const keys = new Set();
  const fresh = new Set();
  for (const lv of LEVELS) {
    if (lv.kind !== 'graphemes' || lv.n > n) continue;
    for (const id of lv.lessons) {
      const les = lessonById(id);
      if (lv.n < n) les.keys.forEach((k) => keys.add(k));
      else if (whole || isLessonDone(id)) les.keys.forEach((k) => { keys.add(k); fresh.add(k); });
    }
  }
  return { keys, fresh };
}

// Lettres apprises dans un parcours (script ou cursive) jusqu'au niveau n.
export function learnedLetters(n) {
  const L = levelInfo(n);
  const track = L.track === 'final' ? 'cursive' : L.track;
  if (track === 'caps') return [];
  const st = getState();
  const out = [];
  for (const lv of LEVELS) {
    if (lv.track !== track || lv.kind !== 'letters') continue;
    for (const id of lv.lessons) {
      const les = lessonById(id);
      if (lv.n < n || L.kind !== 'letters' || st.settings.unlockAll || isLessonDone(id)) out.push(les.letter);
    }
  }
  return out;
}

// Notions difficiles : statut « À consolider », toutes écritures confondues.
export function difficultNotions() {
  const out = [];
  for (const script of ['caps', 'lower', 'cursive']) {
    const b = scriptStats(script);
    for (const [key, s] of Object.entries(b.graphemes)) if (statusFromStats(s) === 'consolidate') out.push({ key, script, type: 'grapheme' });
    for (const [key, s] of Object.entries(b.letters)) if (statusFromStats(s) === 'consolidate') out.push({ key, script, type: 'letter' });
  }
  return out;
}
