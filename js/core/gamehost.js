// Hôte des jeux : en-tête, consigne orale, gestion des manches, victoire.
//
// CONTRAT D'UN JEU (voir js/games/*.js) :
//   export default {
//     id: 'match', title: 'Je relie', icon: '🔗', color: '#...', minLevel: 1,
//     instruction: (ctx) => 'Relie chaque mot à son image.',
//     start(root, ctx) { ...construit UNE manche dans root...; return { destroy() {} } }
//   }
// Le jeu appelle ctx.good(word, el) / ctx.bad(word, el) à chaque réponse,
// puis ctx.win() quand la manche est terminée. L'hôte affiche la victoire et
// relance une nouvelle manche si l'enfant veut continuer.
import { el, renderWord, renderGrapheme, renderSentence, fitWords } from './render.js';
import { speak, instruct, stopSpeaking, sfx, randomPraise, randomRetry } from './audio.js';
import { confetti, sparkle, wiggle, bounce, mascotSay, mascotSVG } from './fx.js';
import { getState, scriptFor, awardRound, recordAnswer } from './state.js';
import { poolForLevel, weightedPick } from './library.js';
import { pickDistractors, shuffle, pickRandom } from './words.js';
import { levelInfo } from '../data/levels.js';

let active = null;

export function stopGame() {
  if (active) {
    try { active.inst && active.inst.destroy && active.inst.destroy(); } catch (e) { console.error(e); }
    try { active.cleanup && active.cleanup(); } catch (e) { /* */ }
    active = null;
  }
  stopSpeaking();
}

export function runGame(game, { level, onExit, options = {} }) {
  stopGame();
  const app = document.getElementById('app');
  app.innerHTML = '';
  const info = levelInfo(level);
  const screen = el('div', { class: 'screen game-screen', style: { '--world': info.color } });
  screen.style.background = `linear-gradient(160deg, ${info.bg[0]}, ${info.bg[1]})`;

  const starCount = el('span', { class: 'hud-stars-n' }, String(getState().progress.totalStars));
  const btnHome = el('button', { class: 'round-btn hud-home', 'aria-label': 'Retour au menu' }, '🏠');
  const btnHelp = el('button', { class: 'round-btn hud-help', 'aria-label': 'Réécouter la consigne' }, '👂');
  const header = el('header', { class: 'hud' },
    btnHome,
    el('div', { class: 'hud-title' }, el('span', { class: 'hud-icon' }, game.icon), ' ', game.title),
    el('div', { class: 'hud-right' }, btnHelp, el('div', { class: 'hud-stars' }, '⭐ ', starCount)),
  );
  const root = el('main', { class: `game-root game-${game.id}` });
  screen.append(header, root);
  app.append(screen);

  const session = { game, level, round: 0, errors: 0, inst: null };
  active = session;

  // Ajuste automatiquement les mots trop longs (après chaque changement de contenu ou de taille).
  let fitQueued = false;
  const queueFit = () => {
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { fitQueued = false; fitWords(root); }));
  };
  const mo = new MutationObserver(queueFit);
  mo.observe(root, { childList: true, subtree: true });
  window.addEventListener('resize', queueFit);
  session.cleanup = () => { mo.disconnect(); window.removeEventListener('resize', queueFit); };

  btnHome.addEventListener('click', () => { sfx('tap'); stopGame(); onExit && onExit(); });
  btnHelp.addEventListener('click', () => { sfx('tap'); speak(game.instruction(ctx)); });

  const settings = getState().settings;
  const script = options.script || scriptFor(level);
  const ctx = {
    level,
    script,
    // Couleurs pédagogiques : désactivables globalement par le parent.
    colors: settings.colors !== 'off',
    settings,
    options,
    el,
    renderWord: (w, o = {}) => renderWord(w, { script, colors: ctx.colors, ...o }),
    renderGrapheme: (g, o = {}) => renderGrapheme(g, o.script || script, o.colors ?? ctx.colors),
    renderSentence,
    pool: () => poolForLevel(level),
    pick: (n, pool) => weightedPick(pool || poolForLevel(level), n),
    distractors: (target, n, hard = 0, pool) => pickDistractors(target, pool || poolForLevel(level).concat(poolForLevel(Math.max(1, level - 1))), n, hard),
    shuffle,
    pickRandom,
    speak,
    instruct,
    sfx,
    fx: { sparkle, wiggle, bounce, confetti, mascotSay },
    record: (word, ok) => recordAnswer(word, ok),
    good(word, node, { say = false } = {}) {
      if (word) recordAnswer(word, true);
      sfx('good');
      sparkle(node);
      bounce(node);
      if (say) speak(typeof say === 'string' ? say : randomPraise());
    },
    bad(word, node, { say = true } = {}) {
      session.errors += 1;
      if (word) recordAnswer(word, false);
      sfx('soft');
      wiggle(node);
      if (say) mascotSay(randomRetry(), { mood: 'happy' });
    },
    win() { victory(); },
    // Pour les jeux qui veulent connaître la manche en cours (progressivité).
    get round() { return session.round; },
  };

  function startRound() {
    if (active !== session) return;
    root.innerHTML = '';
    session.errors = 0;
    try {
      session.inst = game.start(root, ctx) || null;
    } catch (e) {
      console.error(e);
      root.append(el('p', { class: 'error' }, 'Oups ! Ce jeu a un souci. ', String(e.message || e)));
    }
    if (session.round === 0) setTimeout(() => instruct(game.instruction(ctx)), 300);
    session.round += 1;
  }

  function victory() {
    if (active !== session) return;
    const news = awardRound(game.id, level, session.errors);
    starCount.textContent = String(getState().progress.totalStars);
    sfx('win');
    confetti();
    const praise = randomPraise();
    const overlay = el('div', { class: 'victory' },
      el('div', { class: 'victory-card' },
        el('div', { class: 'victory-owl', html: mascotSVG('wow') }),
        el('div', { class: 'victory-stars' }, el('span', {}, '⭐'), el('span', {}, '⭐'), el('span', {}, '⭐')),
        el('div', { class: 'victory-text' }, praise),
        news.sticker ? el('div', { class: 'victory-gift' }, '🎁 Nouvelle surprise : ', el('span', { class: 'big-emoji' }, news.sticker)) : null,
        ...news.medals.map((m) => el('div', { class: 'victory-gift' }, 'Médaille : ', el('span', { class: 'big-emoji' }, m.icon))),
        news.unlockedLevel ? el('div', { class: 'victory-gift' }, '🗺️ Nouveau monde : ', levelInfo(news.unlockedLevel).world, ' ', levelInfo(news.unlockedLevel).emoji) : null,
        el('div', { class: 'victory-actions' },
          el('button', { class: 'big-btn btn-again', 'aria-label': 'Encore', onclick: () => { sfx('tap'); overlay.remove(); startRound(); } }, '▶️'),
          el('button', { class: 'big-btn btn-menu', 'aria-label': 'Menu', onclick: () => { sfx('tap'); overlay.remove(); stopGame(); onExit && onExit(); } }, '🏠'),
        ),
      ),
    );
    screen.append(overlay);
    let msg = praise;
    if (news.sticker) msg += ' Tu as gagné une surprise !';
    if (news.unlockedLevel) msg += ` Tu as débloqué un nouveau monde : ${levelInfo(news.unlockedLevel).world} !`;
    setTimeout(() => speak(msg), 250);
    try { session.inst && session.inst.destroy && session.inst.destroy(); } catch (e) { /* */ }
    session.inst = null;
  }

  startRound();
  return session;
}
