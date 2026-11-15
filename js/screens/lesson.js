// MINI-LEÇON : une nouveauté à la fois (un graphème, ou une lettre dans une nouvelle écriture).
// Étapes : 1 découvrir en grand · 2 écouter / réécouter le son · 3 le reconnaître parmi
// plusieurs propositions · 4 le retrouver dans des mots illustrés · 5 bravo, puis
// entraînement dans les jeux. Aucune sanction : en cas d'erreur, Lulu refait entendre le son.
import { el, renderWord, renderGrapheme } from '../core/render.js';
import { speak, instruct, stopSpeaking, sfx, randomPraise } from '../core/audio.js';
import { mascotSVG, mascotSay, confetti, sparkle, wiggle, bounce } from '../core/fx.js';
import { awardLesson, isLessonDone, nextLesson, recordGrapheme, recordLetter } from '../core/state.js';
import { stopGame } from '../core/gamehost.js';
import { allWords, isWordActive, wordHas } from '../core/library.js';
import { shuffle, pickRandom } from '../core/words.js';
import { LESSONS, lessonById, levelInfo, wordCapsLevel } from '../data/curriculum.js';
import { GRAPHEMES } from '../data/graphemes.js';
import { playSound } from '../core/sounds.js';

const STEPS = ['👀', '👂', '🎯', '🖼️', '⭐'];
const SCRIPT_NAME = { lower: 'en script', cursive: 'en lettres attachées' };

const kindOf = (lesson, t) => {
  if (lesson.kind === 'letter') return 'aeiouy'.includes(t) ? 'v' : 'c';
  if (lesson.kind === 'x') return 'c';
  return lesson.kind;
};
const keyOf = (l) => (l.kind === 'letter' ? 'L:' + l.letter : l.keys[0]);

// Mots illustrés qui contiennent (ou non) la notion. Les mots lisibles sont préférés.
function exampleWords(lesson, has) {
  const words = allWords().filter(isWordActive);
  const contains = (w) => (lesson.kind === 'letter' ? wordHas(w, 'L:' + lesson.letter) : lesson.keys.some((k) => wordHas(w, k)));
  const match = words.filter((w) => contains(w) === has);
  const lv = lesson.level || 99;
  const readable = match.filter((w) => wordCapsLevel(w) <= lv);
  return readable.length >= 3 ? readable : match;
}

function mainExample(lesson) {
  const ref = GRAPHEMES.find((g) => g.key === lesson.keys[0]);
  const words = exampleWords(lesson, true);
  const preferred = lesson.words ? words.find((w) => lesson.words.includes(w.text)) : null;
  return preferred || (ref && words.find((w) => w.text === ref.example)) || words.sort((a, b) => a.text.length - b.text.length)[0] || null;
}

/**
 * Ouvre une mini-leçon.
 * @param lessonId  id de leçon (ex. 'g:on', 'lower:a', 'cursive:b')
 * @param level     niveau d'où elle est lancée
 * @param onExit    retour (menu du niveau)
 * @param onPractice(gameId, focus) lance l'entraînement dans un jeu
 * @param onNext(lessonId) enchaîne la leçon suivante
 */
export function openLesson(lessonId, { level, onExit, onPractice, onNext } = {}) {
  stopGame();
  const lesson = lessonById(lessonId);
  const L = levelInfo(level || lesson.level || 1);
  const app = document.getElementById('app');
  app.innerHTML = '';
  const isLetter = lesson.kind === 'letter';
  const script = isLetter ? lesson.track : 'caps';
  const recScript = isLetter ? lesson.track : 'caps';
  const timers = new Set();
  let dead = false;
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms); timers.add(t); };
  const exit = (fn) => { dead = true; timers.forEach(clearTimeout); stopSpeaking(); fn && fn(); };

  const screen = el('div', { class: 'screen lesson-screen', style: { '--world': L.color, background: `linear-gradient(160deg, ${L.bg[0]}, ${L.bg[1]})` } });
  const btnHome = el('button', { class: 'round-btn', 'aria-label': 'Retour' }, '🏠');
  btnHome.addEventListener('click', () => { sfx('tap'); exit(onExit); });
  const btnEar = el('button', { class: 'round-btn', 'aria-label': 'Réécouter le son' }, '👂');
  btnEar.addEventListener('click', () => { sfx('tap'); playSound(lesson); });
  const dots = el('div', { class: 'ls-steps' }, STEPS.map((s) => el('span', { class: 'ls-step' }, s)));
  const titleTxt = isLetter ? `${lesson.letter.toUpperCase()} ${SCRIPT_NAME[lesson.track]}` : lesson.show.map((s) => s.toUpperCase()).join(' ');
  screen.append(
    el('header', { class: 'hud' }, btnHome, el('div', { class: 'hud-title' }, '🎓 ', titleTxt), el('div', { class: 'hud-right' }, dots, btnEar)),
  );
  const stage = el('main', { class: 'ls-stage' });
  const owl = el('div', { class: 'ls-owl', html: mascotSVG('happy') });
  screen.append(stage, owl);
  app.append(screen);

  const setStep = (i) => [...dots.children].forEach((d, j) => { d.classList.toggle('on', j === i); d.classList.toggle('done', j < i); });
  const nextBtn = (fn) => {
    const b = el('button', { class: 'big-btn ls-next', 'aria-label': 'Continuer' }, '▶️');
    b.addEventListener('click', () => { sfx('tap'); b.disabled = true; fn(); });
    return b;
  };
  const bigForm = (t, sc = script, cls = '') => el('div', { class: `ls-form card ${cls}` }, renderGrapheme({ t, k: kindOf(lesson, t) }, sc));

  // ── 1. Découvrir
  function discover() {
    setStep(0);
    stage.innerHTML = '';
    const go = nextBtn(listen);
    go.hidden = true;
    if (isLetter) {
      const forms = lesson.track === 'cursive' ? ['caps', 'lower', 'cursive'] : ['caps', 'lower'];
      const row = el('div', { class: 'ls-forms' });
      forms.forEach((sc, i) => {
        const f = bigForm(lesson.letter, sc, i ? 'ls-hidden' : '');
        if (i) row.append(el('span', { class: 'ls-arrow ls-hidden' }, '➜'));
        row.append(f);
      });
      stage.append(row, go);
      const intro = lesson.track === 'cursive'
        ? 'Voici une lettre que tu connais. Regarde comment elle s’écrit en script, puis en lettres attachées !'
        : 'Voici une lettre que tu connais en capitale. Regarde comment elle s’écrit en script !';
      speak(intro);
      [...row.querySelectorAll('.ls-hidden')].forEach((n, i) => later(() => { n.classList.remove('ls-hidden'); n.classList.add('ls-pop'); sfx('pop'); }, 1200 + i * 700));
      later(() => { go.hidden = false; }, 1400 + forms.length * 700);
      return;
    }
    const row = el('div', { class: 'ls-forms' }, lesson.show.map((t) => bigForm(t)));
    stage.append(row, go);
    const msg = {
      v: 'Voici un nouveau son. Regarde bien : il s’écrit comme ça.',
      c: 'Voici une nouvelle lettre. Regarde bien !',
      d: 'Regarde : ces lettres vont toujours ensemble. Elles font un seul son. Elles sont en vert.',
      m: 'Voici une lettre muette. Elle est en noir : on la voit, mais on ne l’entend pas !',
      x: 'Voici des consonnes amies : elles se lisent ensemble, collées.',
    }[lesson.kind];
    speak(msg).then(() => { if (!dead) go.hidden = false; });
    later(() => { go.hidden = false; }, 4500);
  }

  // ── 2. Écouter, réécouter
  function listen() {
    setStep(1);
    stage.innerHTML = '';
    const ex = mainExample(lesson);
    const ear = el('button', { class: 'ls-ear', 'aria-label': 'Écouter le son' }, '🔊');
    const go = nextBtn(recognize);
    go.hidden = true;
    let plays = 0;
    const play = () => {
      ear.classList.add('ls-playing');
      return playSound(lesson).then(() => {
        ear.classList.remove('ls-playing'); plays += 1;
        if (plays >= 2) go.hidden = false;
      });
    };
    ear.addEventListener('click', () => { sfx('tap'); play(); });
    const forms = el('div', { class: 'ls-forms ls-forms-sm' }, (isLetter ? [lesson.letter] : lesson.show).map((t) => bigForm(t)));
    const exBox = ex ? el('div', { class: 'ls-example card' }, el('span', { class: 'emoji-img' }, ex.img), renderWord(ex, { script, size: 'lg' })) : null;
    if (exBox && !isLetter) exBox.querySelectorAll('.g').forEach((g, i) => { if (lesson.keys.includes(ex.graphemes[i].key)) g.classList.add('ls-hl'); });
    stage.append(el('div', { class: 'ls-listen' }, forms, ear, exBox), go);
    const exSay = ex ? ex.say : '';
    const intro = lesson.kind === 'm' ? 'Écoute bien.' : isLetter ? 'Cette lettre fait toujours le même son. Écoute :' : 'Écoute son son :';
    speak(intro).then(() => play()).then(() => {
      if (dead || !ex) return null;
      return speak(lesson.kind === 'm' ? `${exSay}. La lettre noire ne se prononce pas.` : `Comme dans… ${exSay}.`);
    }).then(() => { if (!dead) instruct('Appuie sur le haut-parleur pour l’écouter encore !'); });
    later(() => { go.hidden = false; }, 9000);
  }

  // ── 3. Reconnaître parmi plusieurs propositions (3 fois)
  function recognize() {
    setStep(2);
    let n = 0;
    const N = 3;
    const others = () => {
      if (isLetter) {
        const pool = 'abcdefghijklmnopqrstuvwxyz'.split('').filter((c) => c !== lesson.letter && !(lesson.letter === 'b' && c === 'd') && !(lesson.letter === 'p' && c === 'q'));
        return pickRandom(pool, 2).map((c) => ({ show: [c], letter: c }));
      }
      if (lesson.kind === 'x') return [];
      const before = LESSONS.filter((l) => l.kind !== 'letter' && l.kind !== 'x' && l.kind !== 'm' && l.id !== lesson.id && (l.level || 0) <= (lesson.level || 99) && !lesson.show.includes(l.show[0]));
      const done = before.filter((l) => isLessonDone(l.id));
      const pool = done.length >= 2 ? done : before;
      return pickRandom(pool, 2);
    };
    const round = () => {
      if (dead) return;
      stage.innerHTML = '';
      const prog = el('div', { class: 'ls-mini' }, Array.from({ length: N }, (_, i) => el('span', { class: i < n ? 'on' : '' }, '●')));
      // Lettre muette : on la cherche dans un mot.
      if (lesson.kind === 'm') {
        const w = pickRandom(exampleWords(lesson, true), 1)[0];
        const wordEl = el('div', { class: 'ls-wordpick' });
        w.graphemes.forEach((g) => {
          const b = el('button', { class: 'ls-gbtn', 'data-ok': lesson.keys.includes(g.key) ? '1' : null }, renderGrapheme(g, 'caps'));
          b.addEventListener('click', () => {
            if (lesson.keys.includes(g.key)) { good(b); } else { recordGrapheme(lesson.keys[0], false, recScript); sfx('soft'); wiggle(b); }
          });
          wordEl.append(b);
        });
        stage.append(prog, el('div', { class: 'ls-example card' }, el('span', { class: 'emoji-img' }, w.img)), wordEl);
        speak(`${w.say}. Touche la lettre qu’on n’entend pas.`);
        return;
      }
      // Consonnes amies : on entend une syllabe, on la retrouve.
      if (lesson.kind === 'x') {
        const syl = shuffle(lesson.syl);
        const target = syl[0];
        const row = el('div', { class: 'ls-tiles' });
        shuffle(syl.slice(0, 3)).forEach((s) => {
          const b = el('button', { class: 'ls-tile card', 'data-ok': s === target ? '1' : null }, el('span', { class: 'g k-c' }, s.toUpperCase()));
          b.addEventListener('click', () => { if (s === target) good(b); else { recordGrapheme('cluster', false, recScript); sfx('soft'); wiggle(b); speak(target); } });
          row.append(b);
        });
        const ear = el('button', { class: 'round-btn ls-ear-sm' }, '🔊');
        ear.addEventListener('click', () => speak(target));
        stage.append(prog, ear, row);
        speak('Trouve :').then(() => speak(target, { slow: true }));
        return;
      }
      const opts = shuffle([{ show: lesson.show, target: true, letter: lesson.letter }, ...others()]);
      const row = el('div', { class: 'ls-tiles' });
      for (const o of opts) {
        const t = o.show[0];
        const k = o.target ? kindOf(lesson, t) : isLetter ? kindOf({ kind: 'letter' }, t) : kindOf(o, t);
        const b = el('button', { class: 'ls-tile card', 'data-ok': o.target ? '1' : null }, renderGrapheme({ t, k }, script));
        b.addEventListener('click', () => {
          if (o.target) good(b);
          else {
            if (isLetter) recordLetter(lesson.letter, false, recScript); else recordGrapheme(lesson.keys[0], false, recScript);
            sfx('soft'); wiggle(b); later(() => playSound(lesson), 400);
          }
        });
        row.append(b);
      }
      const model = isLetter ? el('div', { class: 'ls-model' }, bigForm(lesson.letter, lesson.track === 'cursive' ? 'lower' : 'caps', 'ls-form-sm')) : null;
      stage.append(...[prog, model, row].filter(Boolean));
      if (isLetter) speak(`Trouve la même lettre ${SCRIPT_NAME[lesson.track]}.`);
      else speak('Trouve :').then(() => { if (!dead) playSound(lesson); });
    };
    const good = (b) => {
      if (isLetter) recordLetter(lesson.letter, true, recScript); else lesson.keys.forEach((k) => recordGrapheme(k, true, recScript));
      sfx('good'); sparkle(b); bounce(b);
      [...stage.querySelectorAll('button')].forEach((x) => { x.disabled = true; });
      n += 1;
      if (n >= N) later(find, 900); else later(round, 900);
    };
    round();
  }

  // ── 4. Retrouver dans des mots illustrés
  function find() {
    setStep(3);
    stage.innerHTML = '';
    const yes = pickRandom(exampleWords(lesson, true), 2);
    if (!yes.length) { finish(); return; } // aucun mot illustré (ex. « un »)
    // Mot « intrus » : il ne doit contenir AUCUNE des lettres montrées (ex. pas CRAYON pour le son A).
    const letters = (isLetter ? [lesson.letter] : lesson.show).join('');
    const plain = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const noAll = allWords().filter(isWordActive).filter((w) => !yes.some((y) => y.img === w.img) && ![...plain(letters)].some((c) => plain(w.text).includes(c)));
    const noRead = noAll.filter((w) => wordCapsLevel(w) <= (lesson.level || 99));
    const noPool = noRead.length ? noRead : noAll;
    const no = pickRandom(noPool, 1);
    const opts = shuffle([...yes, ...no]);
    let found = 0;
    const need = yes.length;
    const row = el('div', { class: 'ls-cards' });
    for (const w of opts) {
      const has = yes.includes(w);
      const b = el('button', { class: 'ls-card card', 'aria-label': w.say, 'data-ok': has ? '1' : null }, el('span', { class: 'emoji-img' }, w.img), renderWord(w, { script, size: 'md' }));
      b.addEventListener('click', () => {
        if (b.classList.contains('ls-ok')) return;
        speak(w.say);
        if (has) {
          b.classList.add('ls-ok'); sfx('good'); sparkle(b);
          if (isLetter) recordLetter(lesson.letter, true, recScript);
          else {
            lesson.keys.forEach((k) => { if (w.skills.includes(k)) recordGrapheme(k, true, recScript); });
            b.querySelectorAll('.g').forEach((g, i) => { if (lesson.keys.includes(w.graphemes[i] && w.graphemes[i].key)) g.classList.add('ls-hl'); });
          }
          if (isLetter) {
            b.querySelectorAll('.g').forEach((g) => { if (g.textContent.normalize('NFD').includes(lesson.letter)) g.classList.add('ls-hl'); });
          }
          found += 1;
          if (found >= need) later(finish, 1600);
        } else {
          if (isLetter) recordLetter(lesson.letter, false, recScript); else recordGrapheme(lesson.keys[0], false, recScript);
          sfx('soft'); wiggle(b);
          mascotSay('Regarde bien chaque lettre !', { mood: 'happy' });
        }
      });
      row.append(b);
    }
    stage.append(el('div', { class: 'ls-model' }, el('div', { class: 'ls-forms ls-forms-sm' }, (isLetter ? [lesson.letter] : lesson.show).map((t) => bigForm(t)))), row);
    const nb = need === 1 ? 'l’image' : 'les deux images';
    speak(`Touche ${nb} dont le mot a ${isLetter ? 'cette lettre' : lesson.kind === 'm' ? 'cette lettre muette' : 'ce son'}.`);
  }

  // ── 5. Bravo !
  function finish() {
    setStep(4);
    stage.innerHTML = '';
    const news = awardLesson(lesson.id, L.n);
    confetti(); sfx('win');
    const nxt = nextLesson(L.n);
    const practiceGame = isLetter ? 'letters' : 'sounds';
    const actions = el('div', { class: 'ls-actions' });
    const mk = (cls, label, icon, fn) => {
      const b = el('button', { class: `big-btn ${cls}`, 'aria-label': label }, icon, el('span', { class: 'ls-btn-label' }, label));
      b.addEventListener('click', () => { sfx('tap'); exit(fn); });
      actions.append(b);
    };
    mk('ls-practice', 'Je m’entraîne', '🎯', () => onPractice && onPractice(practiceGame, [keyOf(lesson)]));
    if (nxt) mk('ls-go-next', 'Leçon suivante', '🎓', () => onNext && onNext(nxt));
    mk('ls-menu', 'Menu', '🏠', onExit);
    stage.append(
      el('div', { class: 'ls-bravo card' },
        el('div', { class: 'ls-bravo-owl', html: mascotSVG('wow') }),
        el('div', { class: 'ls-forms ls-forms-sm' }, (isLetter ? [lesson.letter] : lesson.show).map((t) => bigForm(t))),
        el('div', { class: 'ls-bravo-stars' }, '⭐'),
        news.sticker ? el('div', { class: 'victory-gift' }, '🎁 ', el('span', { class: 'big-emoji' }, news.sticker)) : null,
        news.unlockedLevel ? el('div', { class: 'victory-gift' }, '🗺️ ', levelInfo(news.unlockedLevel).world, ' ', levelInfo(news.unlockedLevel).emoji) : null,
        actions));
    owl.hidden = true;
    let msg = `${randomPraise()} Tu as appris une nouvelle ${isLetter ? 'écriture de lettre' : lesson.kind === 'm' ? 'lettre muette' : 'chose'} ! Maintenant, entraîne-toi en jouant.`;
    if (news.sticker) msg += ' Tu as gagné une surprise !';
    speak(msg);
  }

  discover();
  return { close: () => exit() };
}
