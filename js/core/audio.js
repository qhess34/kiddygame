// Voix française (synthèse vocale du navigateur) + petits effets sonores.
import { getState } from './state.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];

// Voix françaises "naturelles" connues, par ordre de préférence.
const PREFERRED = [/natural/i, /neural/i, /premium/i, /enhanced/i, /amélie|amelie/i, /audrey/i, /thomas/i, /google.*fran/i, /denise/i, /julie/i, /marie/i, /hortense/i];

function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices().filter((v) => /^fr/i.test(v.lang));
}
if (synth) {
  loadVoices();
  if ('onvoiceschanged' in synth) synth.onvoiceschanged = loadVoices;
}

export function frenchVoices() { loadVoices(); return voices; }

function pickVoice() {
  const wanted = getState().settings.voiceName;
  if (wanted) {
    const v = voices.find((x) => x.name === wanted);
    if (v) return v;
  }
  const frFR = voices.filter((v) => /fr[-_]FR/i.test(v.lang));
  const list = frFR.length ? frFR : voices;
  for (const re of PREFERRED) {
    const v = list.find((x) => re.test(x.name));
    if (v) return v;
  }
  return list[0] || null;
}

export function hasSpeech() { return !!synth; }

/**
 * Prononce un texte en français.
 * @param text
 * @param opts.slow  prononciation ralentie
 * @param opts.rate  vitesse explicite
 * @returns Promise résolue à la fin de la phrase (ou après un délai de secours)
 */
export function speak(text, opts = {}) {
  return new Promise((resolve) => {
    if (!synth || !text) return resolve();
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      const v = pickVoice();
      if (v) u.voice = v;
      const base = getState().settings.voiceRate || 0.85;
      u.rate = opts.rate || (opts.slow ? Math.max(0.45, base * 0.6) : base);
      u.pitch = opts.pitch || 1.05;
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      u.onend = finish;
      u.onerror = finish;
      setTimeout(finish, 1500 + text.length * 160 / u.rate);
      synth.speak(u);
    } catch (e) { resolve(); }
  });
}

export function stopSpeaking() { try { synth && synth.cancel(); } catch (e) { /* */ } }

// Consigne orale (peut être coupée par le parent).
export function instruct(text) {
  if (!getState().settings.speakInstructions) return Promise.resolve();
  return speak(text);
}

const PRAISE = ['Bravo, tu as trouvé !', 'Super, tu as réussi !', 'Tu progresses !', 'Génial !', 'Très bien !', 'Bien joué !', 'Excellent !', 'Tu lis très bien !'];
const RETRY = ['Encore un petit effort !', 'Essaie encore, tu vas y arriver !', 'Presque ! Regarde bien.', 'On réessaie ensemble ?'];

export function randomPraise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }
export function randomRetry() { return RETRY[Math.floor(Math.random() * RETRY.length)]; }

// ---- Effets sonores générés (pas de fichiers à charger) -----------------
let ctx = null;
function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', gain = 0.18) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = a.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export function sfx(name) {
  if (!getState().settings.sound) return;
  try {
    switch (name) {
      case 'tap': tone(660, 0, 0.08, 'triangle', 0.08); break;
      case 'good': tone(660, 0, 0.15, 'triangle'); tone(880, 0.1, 0.2, 'triangle'); break;
      case 'soft': tone(330, 0, 0.18, 'sine', 0.1); tone(294, 0.12, 0.2, 'sine', 0.08); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle', 0.16)); break;
      case 'star': tone(1175, 0, 0.12, 'sine', 0.12); tone(1568, 0.08, 0.18, 'sine', 0.1); break;
      case 'pop': tone(520, 0, 0.06, 'square', 0.05); break;
      case 'cut': tone(900, 0, 0.05, 'square', 0.06); tone(600, 0.04, 0.06, 'square', 0.05); break;
      default: break;
    }
  } catch (e) { /* audio indisponible */ }
}

// Débloque l'audio sur iOS / Safari au premier contact.
export function unlockAudio() {
  ac();
  if (synth) {
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) { /* */ }
  }
}
