// Jeu 5 — « J'écoute et je lis » : entendre un mot, toucher le mot écrit correspondant.
import { allWords } from '../core/library.js';
import { speak, stopSpeaking } from '../core/audio.js';

const QUESTIONS = 3;

export function hardFor(level) {
  if (level <= 1) return 0;
  if (level === 2) return 0.2;
  if (level === 3) return 0.5;
  if (level === 4) return 0.6;
  return 0.7;
}

// Cible + 2 distracteurs : textes, prononciations et images tous différents.
export function buildChoices(ctx, target, hard) {
  const ok = (w, chosen) => w.text !== target.text && w.say !== target.say && w.img !== target.img
    && !chosen.some((c) => c.text === w.text || c.say === w.say);
  const chosen = [];
  for (let attempt = 0; attempt < 6 && chosen.length < 2; attempt++) {
    for (const d of ctx.distractors(target, 4, hard)) {
      if (chosen.length < 2 && ok(d, chosen)) chosen.push(d);
    }
  }
  if (chosen.length < 2) {
    for (const d of ctx.shuffle(allWords())) {
      if (chosen.length < 2 && ok(d, chosen)) chosen.push(d);
    }
  }
  return ctx.shuffle([target, ...chosen]);
}

export default {
  id: 'listen', title: 'J\'écoute et je lis', icon: '👂', color: '#ffa94d', minLevel: 1,
  instruction: () => 'Écoute bien le mot, puis touche le mot que tu as entendu.',

  start(root, ctx) {
    const { el } = ctx;
    const hard = hardFor(ctx.stage);
    const targets = ctx.pick(QUESTIONS, ctx.pool());
    const timers = new Set();
    let destroyed = false, won = false, qi = 0, locked = false, target = null, first = true;
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!destroyed) fn(); }, ms); timers.add(t); return t; };

    const dots = el('div', { class: 'ls-dots' }, ...targets.map(() => el('span', { class: 'ls-dot' })));
    const big = el('button', { class: 'ls-big', 'aria-label': 'Écouter le mot' }, '🔊');
    const slow = el('button', { class: 'round-btn ls-slow', 'aria-label': 'Écouter lentement' }, '🐢');
    const reward = el('div', { class: 'img-card ls-reward' });
    const stage = el('div', { class: 'ls-stage' }, slow, big, reward);
    const choices = el('div', { class: 'ls-choices' });
    root.append(dots, stage, choices);

    big.addEventListener('click', () => { ctx.sfx('tap'); big.classList.remove('pulse'); void big.offsetWidth; big.classList.add('pulse'); speak(target.say); });
    slow.addEventListener('click', () => { ctx.sfx('tap'); speak(target.say, { slow: true }); });

    function sayTarget(delay = 350) {
      const my = target;
      later(() => {
        // Au premier tour, attendre la fin de la consigne orale.
        const wait = (tries) => {
          const talking = window.speechSynthesis && window.speechSynthesis.speaking;
          if (first && talking && tries < 25) { later(() => wait(tries + 1), 300); return; }
          first = false;
          if (my === target && !locked) speak(my.say);
        };
        wait(0);
      }, delay);
    }

    function showQuestion() {
      target = targets[qi];
      locked = false;
      reward.classList.remove('show');
      reward.innerHTML = '';
      choices.classList.remove('locked');
      [...dots.children].forEach((d, i) => { d.classList.toggle('done', i < qi); d.classList.toggle('now', i === qi); });
      choices.innerHTML = '';
      buildChoices(ctx, target, hard).forEach((w) => {
        const btn = el('button', { class: 'ls-choice', 'data-word': w.id, style: { '--n': w.text.length } }, ctx.renderWord(w, { size: 'lg' }));
        btn.addEventListener('click', () => answer(w, btn));
        choices.append(btn);
      });
      big.classList.add('pulse');
      sayTarget(ctx.round === 0 && qi === 0 ? 700 : 400);
    }

    function answer(w, btn) {
      if (locked || won) return;
      if (w.id === target.id) {
        locked = true;
        ctx.good(target, btn);
        btn.classList.add('right');
        choices.classList.add('locked');
        reward.append(el('span', { class: 'emoji-img ls-emoji' }, target.img));
        reward.classList.add('show');
        const said = speak(target.say);
        const wait = new Promise((r) => later(r, 2600));
        const min = new Promise((r) => later(r, 1500));
        Promise.all([Promise.race([said, wait]), min]).then(() => {
          if (destroyed) return;
          qi++;
          if (qi >= targets.length) {
            if (!won) { won = true; [...dots.children].forEach((d) => d.classList.add('done')); ctx.win(); }
          } else showQuestion();
        });
      } else {
        btn.classList.add('dim');
        ctx.bad(target, btn); // l’erreur porte sur le mot à lire, pas sur le distracteur
        const my = target;
        // Après l'encouragement, on redit le mot.
        later(() => { if (my === target && !locked) speak(my.say); }, 2400);
      }
    }

    showQuestion();
    return {
      destroy() {
        destroyed = true;
        timers.forEach(clearTimeout); timers.clear();
        stopSpeaking();
      },
    };
  },
};
