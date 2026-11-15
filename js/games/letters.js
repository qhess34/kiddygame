// Jeu « Les lettres jumelles » (parcours script et cursive) : relier une lettre à ses autres
// formes (capitale ↔ script, script ↔ cursive…). Seulement les lettres déjà apprises en
// mini-leçon ; d'abord une seule paire, puis de plus en plus de lettres.
// Réutilise le mode « relier » du jeu Capitales et minuscules (tracé au doigt ou deux touchers).
import cases from './cases.js';

export default {
  id: 'letters', title: 'Les lettres jumelles', icon: '🔤', color: '#f28482', minLevel: 1,
  instruction: (ctx) => (ctx.learnedLetters().length <= 1
    ? 'Relie la lettre à son autre écriture.'
    : 'Relie chaque lettre à son autre écriture.'),
  start(root, ctx) {
    const letters = ctx.learnedLetters();
    // En cursive, on alterne : script ↔ cursive, puis capitale ↔ cursive.
    let pair = ctx.pair;
    if (ctx.track === 'cursive' && ctx.round % 2 === 1) pair = ['caps', 'cursive'];
    const sub = Object.create(ctx, {
      forceType: { value: 2 },
      letterSet: { value: letters.length ? letters : ['o', 'a'] },
      pair: { value: pair },
      recordLetter: { value: (l, ok) => ctx.recordLetter(l, ok, pair[1]) },
    });
    return cases.start(root, sub);
  },
};
