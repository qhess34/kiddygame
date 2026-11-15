// Faire entendre le SON d'un graphème (jamais le nom de la lettre).
// 1. Si le parent a enregistré sa voix pour ce son (espace parent → Acquis), on la joue.
// 2. Sinon, synthèse vocale :
//    - voyelles et sons voyelles : un mot homophone (« on », « où », « eux », « hein »…) ;
//    - consonnes : des syllabes (« cha, cho, chi ») — la consonne seule serait épelée ;
//    - sons qui ne s'entendent que dans un mot (ill, muettes…) : des mots exemples.
import { speak } from './audio.js';
import { lessonById, lessonForKey } from '../data/curriculum.js';

const DB = 'lirejoue-voix';
const STORE = 'sons';

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('indexedDB indisponible')); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r && r.result);
    t.onerror = () => reject(t.error);
  });
}

let knownIds = null; // ids de leçon qui ont un enregistrement
export async function recordedIds() {
  if (knownIds) return knownIds;
  try { knownIds = new Set(await tx('readonly', (s) => s.getAllKeys())); } catch (e) { knownIds = new Set(); }
  return knownIds;
}
export async function saveRecording(id, blob) {
  await tx('readwrite', (s) => s.put(blob, id));
  (await recordedIds()).add(id);
}
export async function deleteRecording(id) {
  await tx('readwrite', (s) => s.delete(id));
  (await recordedIds()).delete(id);
}
async function getRecording(id) {
  if (!(await recordedIds()).has(id)) return null;
  try { return await tx('readonly', (s) => s.get(id)); } catch (e) { return null; }
}

// Leçon de référence pour le son (une leçon de lettre script/cursive reprend celle du graphème).
export function soundLesson(lesson) {
  if (typeof lesson === 'string') lesson = lessonById(lesson) || lessonForKey(lesson);
  if (lesson && lesson.kind === 'letter') return lessonForKey(lesson.letter) || lesson;
  return lesson;
}

let current = null;
export function playAudioBlob(blob) {
  return new Promise((resolve) => {
    if (current) { try { current.pause(); } catch (e) { /* */ } }
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    current = a;
    const end = () => { URL.revokeObjectURL(url); resolve(); };
    a.onended = end; a.onerror = end;
    a.play().catch(end);
  });
}

// Texte prononcé pour le son (synthèse).
export function soundText(lesson) {
  const l = soundLesson(lesson);
  if (!l) return '';
  if (l.kind === 'm') return '';
  if (l.say) return l.say;
  if (l.syl) return l.syl.join(', ');
  if (l.words) return l.words.join(', ');
  return '';
}

// Fait entendre le son. Retourne une promesse résolue à la fin.
export async function playSound(lesson, { slow = true } = {}) {
  const l = soundLesson(lesson);
  if (!l) return;
  const rec = await getRecording(l.id);
  if (rec) return playAudioBlob(rec);
  if (l.kind === 'm') return speak(`On ne l'entend pas. Écoute : ${(l.words || []).join(', ')}.`);
  const t = soundText(l);
  return speak(t, { slow, rate: l.syl || l.words ? undefined : 0.7 });
}
