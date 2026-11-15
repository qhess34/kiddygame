// Jeu « La chasse aux sons » : reconnaître les graphèmes appris.
//   Mode A : Lulu fait entendre un son (ou montre une capitale) → l'enfant touche le bon graphème.
//   Mode B : un graphème est montré → l'enfant touche l'image dont le mot le contient.
// Utilise uniquement les graphèmes dont la mini-leçon est faite (ou les lettres apprises en
// script / cursive). ctx.focus (ex. ['on'] ou ['L:a']) fait revenir en priorité ces notions.
import { LESSONS, LEVELS, lessonById } from '../data/curriculum.js';
import { playSound } from '../core/sounds.js';
import { wordHas } from '../core/library.js';

const QUESTIONS = 4;

function candidates(ctx) {
  if (ctx.track === 'caps') {
    const known = new Set(ctx.knownKeys() || []);
    const out = [];
    for (const lv of LEVELS) for (const id of lv.lessons) {
      const l = lessonById(id);
      if (l.kind !== 'letter' && l.keys.every((k) => known.has(k))) out.push(l);
    }
    return out;
  }
  const track = ctx.track === 'final' ? 'cursive' : ctx.track;
  return ctx.learnedLetters().map((c) => lessonById(`${track}:${c}`)).filter(Boolean);
}

const keyOf = (l) => (l.kind === 'letter' ? 'L:' + l.letter : l.keys[0]);

export default {
  id: 'sounds', title: 'La chasse aux sons', icon: '🎯', color: '#06d6a0', minLevel: 1,
  instruction: (ctx) => (ctx.track === 'caps' ? 'Écoute bien et trouve le bon son !' : 'Trouve la même lettre !'),
  start(root, ctx) {
    const { el } = ctx;
    const timers = new Set();
    let dead = false; let won = false; let q = 0; let busy = false;
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms); timers.add(t); };
    const area = el('div', { class: 'snd-area' });
    root.append(area);

    const lettersMode = ctx.track !== 'caps';
    const tileScript = lettersMode ? ctx.pair[1] : ctx.script;
    let cands = candidates(ctx);
    const audible = (l) => l.kind !== 'm' && l.kind !== 'x';
    const fresh = new Set(ctx.freshKeys());
    const focus = (ctx.focus || []).slice();
    const fallback = LESSONS.filter((l) => l.kind !== 'letter' && audible(l)).slice(0, 12);
    if (!cands.length) cands = lettersMode ? ['o', 'a', 'i'].map((c) => lessonById(`lower:${c}`)) : fallback.slice(0, 3);

    // Cible : notion travaillée (focus) en priorité, puis nouveautés, puis le reste.
    function pickTarget(pool) {
      const f = pool.filter((l) => focus.some((k) => keyOf(l) === k || l.keys.includes(k)));
      if (f.length && Math.random() < 0.7) return ctx.pickRandom(f, 1)[0];
      const n = pool.filter((l) => l.keys.some((k) => fresh.has(k)));
      if (n.length && Math.random() < 0.6) return ctx.pickRandom(n, 1)[0];
      return ctx.pickRandom(pool, 1)[0];
    }
    const tile = (l, script = tileScript) => {
      const kind = l.kind === 'letter' ? ('aeiouy'.includes(l.letter) ? 'v' : 'c') : l.kind === 'x' ? 'c' : l.kind;
      return ctx.renderGrapheme({ t: l.show[0], k: kind }, { script });
    };
    const record = (l, ok) => {
      if (l.kind === 'letter') ctx.recordLetter(l.letter, ok, tileScript);
      else l.keys.forEach((k) => ctx.recordGrapheme(k, ok));
    };
    const progress = el('div', { class: 'snd-progress' });
    const drawProgress = () => { progress.innerHTML = ''; for (let i = 0; i < QUESTIONS; i++) progress.append(el('span', { class: 'snd-dot' + (i < q ? ' on' : '') }, '⭐')); };

    function done() { if (won || dead) return; won = true; later(() => ctx.win(), 600); }
    function next() {
      if (q >= QUESTIONS) { done(); return; }
      busy = false;
      area.innerHTML = '';
      drawProgress();
      const words = ctx.widePool();
      const target = pickTarget(cands.filter((l) => lettersMode || audible(l)).length ? cands.filter((l) => lettersMode || audible(l)) : cands);
      const withW = words.filter((w) => wordHas(w, keyOf(target)));
      const withoutW = words.filter((w) => !wordHas(w, keyOf(target)));
      const canB = withW.length >= 1 && withoutW.length >= 2;
      const modeB = canB && (q % 2 === 1 || (!lettersMode && !audible(target)));
      if (modeB) askWord(target, withW, withoutW); else askTile(target);
    }

    function hear(target) {
      if (lettersMode) return playSound(target);
      return playSound(target);
    }

    // Mode A : entendre (ou voir la capitale) → toucher le graphème.
    function askTile(target) {
      const others = ctx.shuffle(cands.filter((l) => l !== target && l.show[0] !== target.show[0] && (lettersMode || audible(l))));
      const pool = others.length >= 2 ? others : others.concat(ctx.shuffle(fallback.filter((l) => l !== target && !others.includes(l))));
      const opts = ctx.shuffle([target, ...pool.slice(0, 2)]);
      const ear = el('button', { class: 'round-btn snd-ear', 'aria-label': 'Réécouter' }, '🔊');
      ear.addEventListener('click', () => { ctx.sfx('tap'); hear(target); });
      const model = lettersMode
        ? el('div', { class: 'snd-model card' }, tile(target, ctx.pair[0]))
        : el('div', { class: 'snd-model snd-model-ear' }, ear);
      const row = el('div', { class: 'snd-tiles' });
      for (const l of opts) {
        const b = el('button', { class: 'snd-tile card', 'aria-label': 'Choix', 'data-ok': l === target ? '1' : null }, tile(l));
        b.addEventListener('click', () => {
          if (busy || dead) return;
          if (l === target) {
            busy = true; record(target, true); ctx.good(null, b); b.classList.add('snd-ok');
            q += 1; drawProgress(); later(next, 900);
          } else {
            record(target, false); ctx.bad(null, b, { say: false });
            later(() => hear(target), 500);
          }
        });
        row.append(b);
      }
      area.append(progress, lettersMode ? el('div', { class: 'snd-top' }, model, ear) : model, row);
      if (lettersMode) later(() => { ctx.speak(tileScript === 'cursive' ? 'Trouve la même lettre, attachée.' : 'Trouve la même lettre, en petit.'); }, 200);
      else later(() => { ctx.speak('Trouve :').then(() => { if (!dead) hear(target); }); }, 200);
    }

    // Mode B : voir le graphème → toucher l'image dont le mot le contient.
    function askWord(target, withW, withoutW) {
      const good = ctx.pickRandom(withW, 1)[0];
      const bad = [];
      for (const w of ctx.shuffle(withoutW)) { if (bad.length >= 2) break; if (w.img !== good.img && !bad.some((b) => b.img === w.img)) bad.push(w); }
      const opts = ctx.shuffle([good, ...bad]);
      const ear = el('button', { class: 'round-btn snd-ear', 'aria-label': 'Réécouter' }, '🔊');
      ear.addEventListener('click', () => { ctx.sfx('tap'); hear(target); });
      const row = el('div', { class: 'snd-cards' });
      for (const w of opts) {
        const b = el('button', { class: 'snd-card card', 'aria-label': w.say, 'data-ok': w === good ? '1' : null },
          el('span', { class: 'emoji-img' }, w.img), ctx.renderWord(w, { script: tileScript, size: 'sm' }));
        b.addEventListener('click', () => {
          if (busy || dead) return;
          if (w === good) {
            busy = true; record(target, true); ctx.good(w, b); b.classList.add('snd-ok');
            // Montre le graphème dans le mot.
            const k = keyOf(target);
            if (!k.startsWith('L:')) {
              const gs = b.querySelectorAll('.word .g');
              w.graphemes.forEach((g, i) => { if (target.keys.includes(g.key) && gs[i]) gs[i].classList.add('snd-hl'); });
            }
            ctx.speak(w.say);
            q += 1; drawProgress(); later(next, 1500);
          } else {
            record(target, false); ctx.bad(null, b, { say: false }); ctx.speak(w.say);
          }
        });
        row.append(b);
      }
      area.append(progress, el('div', { class: 'snd-top' }, el('div', { class: 'snd-model card' }, tile(target)), ear), row);
      later(() => {
        const sentence = lettersMode ? 'Dans quel mot vois-tu cette lettre ?' : (audible(target) ? 'Dans quel mot vois-tu ce son ?' : 'Dans quel mot vois-tu cette lettre muette ?');
        ctx.speak(sentence);
      }, 200);
    }

    next();
    return { destroy() { dead = true; timers.forEach(clearTimeout); timers.clear(); } };
  },
};
