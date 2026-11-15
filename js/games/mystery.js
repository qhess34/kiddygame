// Jeu 4 — « Le mot mystère » : choisir, parmi 3 mots, celui qui correspond à l'image.
import { allWords } from '../core/library.js';
import { speak, stopSpeaking } from '../core/audio.js';

const QUESTIONS = 3;

export function hardFor(level) {
  if (level <= 1) return 0;
  if (level === 2) return 0.3;
  if (level <= 4) return 0.5;
  return 0.7;
}

// Variante avec / sans couleurs pour cette manche.
export function useColors(ctx) {
  if (ctx.colors === false) return false;
  const mode = (ctx.settings && ctx.settings.mysteryColors) || 'auto';
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  if (ctx.stage <= 1) return true;
  const r = ctx.round;
  if (r < 2) return true;
  return (r - 2) % 2 !== 0;      // manche 2 : sans, 3 : avec, 4 : sans…
}

// Trois propositions distinctes (texte, image) : cible + 2 distracteurs.
export function buildChoices(ctx, target, hard) {
  const ok = (w, chosen) => w.text !== target.text && w.img !== target.img && w.say !== target.say
    && !chosen.some((c) => c.text === w.text || c.img === w.img);
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
  id: 'mystery', title: 'Le mot mystère', icon: '🔍', color: '#48bfe3', minLevel: 1,
  instruction: () => 'Regarde l\'image. Quel est le bon mot ?',

  start(root, ctx) {
    const { el } = ctx;
    const colors = useColors(ctx);
    const hard = hardFor(ctx.stage);
    const targets = ctx.pick(QUESTIONS, ctx.pool());
    const timers = new Set();
    let destroyed = false, won = false, qi = 0, locked = false, helps = 0;
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!destroyed) fn(); }, ms); timers.add(t); return t; };

    const badge = el('div', { class: 'my-variant', title: colors ? 'Avec couleurs' : 'Sans couleurs', 'aria-label': colors ? 'Avec couleurs' : 'Sans couleurs' }, colors ? '🎨' : '⚫');
    const dots = el('div', { class: 'my-dots' }, ...targets.map(() => el('span', { class: 'my-dot' })));
    const bar = el('div', { class: 'my-bar' }, badge, dots);
    const card = el('div', { class: 'img-card my-img' });
    const help = el('button', { class: 'round-btn my-help', 'aria-label': 'Écouter le mot' }, '🔊');
    const picture = el('div', { class: 'my-picture' }, card, help);
    const choices = el('div', { class: 'my-choices' });
    root.append(bar, picture, choices);

    let target = null;
    help.addEventListener('click', () => { ctx.sfx('tap'); helps++; speak(target.say); });

    function showQuestion() {
      target = targets[qi];
      locked = false;
      card.innerHTML = '';
      card.append(el('span', { class: 'emoji-img my-emoji' }, target.img));
      card.classList.remove('jump');
      [...dots.children].forEach((d, i) => d.classList.toggle('done', i < qi));
      [...dots.children].forEach((d, i) => d.classList.toggle('now', i === qi));
      choices.innerHTML = '';
      buildChoices(ctx, target, hard).forEach((w) => {
        const btn = el('button', { class: 'my-choice', 'data-word': w.id, style: { '--n': w.text.length } },
          ctx.renderWord(w, { size: 'lg', colors }));
        btn.addEventListener('click', () => answer(w, btn));
        choices.append(btn);
      });
    }

    function answer(w, btn) {
      if (locked || won) return;
      if (w.id === target.id) {
        locked = true;
        ctx.good(target, btn);
        btn.classList.add('right');
        choices.classList.add('locked');
        card.classList.add('jump');
        const said = speak(target.say);
        const wait = new Promise((r) => later(r, 2600));
        const min = new Promise((r) => later(r, 1100));
        Promise.all([Promise.race([said, wait]), min]).then(() => {
          if (destroyed) return;
          choices.classList.remove('locked');
          qi++;
          if (qi >= targets.length) {
            if (!won) { won = true; [...dots.children].forEach((d) => d.classList.add('done')); ctx.win(); }
          } else showQuestion();
        });
      } else {
        btn.classList.add('dim');
        ctx.bad(target, btn); // l’erreur porte sur le mot à lire, pas sur le distracteur
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
