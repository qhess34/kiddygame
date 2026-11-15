// Jeu bonus « Capitales et minuscules » : découverte des deux écritures.
//   Type 1 : présentation (MOTO -> moto), puis enchaîne un type 3.
//   Type 2 : relier capitales et minuscules (tracé ou touchers).
//   Type 3 : « le même mot » (capitales <-> minuscules).
const SVGNS = 'http://www.w3.org/2000/svg';
const CHANGING = 'abdeghlmnqrt';
const MIRROR = 'bdpq';
const VOWELS = 'aeiouy';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function baseLetters(word) {
  const out = [];
  for (const ch of word.text.normalize('NFD')) if (/[a-z]/.test(ch)) out.push(ch);
  return out;
}

export default {
  id: 'cases', title: 'Capitales et minuscules', icon: '🔠', color: '#e0709a', minLevel: 5,
  instruction: (ctx) => {
    const t = typeFor(ctx);
    if (t === 1) return 'Regarde : les mêmes lettres peuvent s’écrire de deux façons !';
    if (t === 2) return 'Relie chaque grande lettre à sa petite lettre.';
    return 'Trouve le même mot écrit en petites lettres.';
  },
  start(root, ctx) {
    const { el } = ctx;
    const type = typeFor(ctx);
    const timers = new Set();
    let dead = false;
    let won = false;
    let cleanup = () => {};
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms); timers.add(t); return t; };
    const finish = () => { if (won || dead) return; won = true; ctx.win(); };
    const area = el('div', { class: `cases-area cases-t${type}` });
    root.append(area);
    const clear = () => { cleanup(); cleanup = () => {}; area.innerHTML = ''; };

    // ---------- Type 1 : les deux écritures ----------
    function presentation(word, next) {
      clear();
      area.className = 'cases-area cases-t1';
      const caps = ctx.renderWord(word, { script: ctx.pair[0], size: 'xl' });
      const low = ctx.renderWord(word, { script: ctx.pair[1], size: 'xl' });
      const lowGs = [...low.querySelectorAll('.g')];
      lowGs.forEach((g) => g.classList.add('c1-hidden'));
      const capGs = [...caps.querySelectorAll('.g')];
      const go = el('button', { class: 'big-btn cases-go', 'aria-label': 'Continuer', hidden: true }, '▶️');
      go.hidden = true;
      go.addEventListener('click', () => { ctx.sfx('tap'); go.disabled = true; next(); });
      area.append(
        el('div', { class: 'card cases-pic' }, el('span', { class: 'emoji-img' }, word.img)),
        el('div', { class: 'cases-rows' },
          el('div', { class: 'cases-row cases-row-caps' }, caps),
          el('div', { class: 'cases-arrow', 'aria-hidden': 'true' }, '⬇'),
          el('div', { class: 'cases-row cases-row-low' }, low)),
        go);
      const say = word.say;
      later(() => ctx.speak(`${say}… s’écrit aussi ${say}. C’est le même mot !`), 300);
      capGs.forEach((cg, i) => {
        later(() => {
          ctx.sfx('pop');
          cg.classList.add('c1-flip');
          lowGs[i].classList.remove('c1-hidden');
          lowGs[i].classList.add('c1-in');
          later(() => cg.classList.remove('c1-flip'), 500);
        }, 1100 + i * 650);
      });
      later(() => { go.hidden = false; go.classList.add('cases-go-on'); }, 1100 + capGs.length * 650 + 300);
    }

    // ---------- Type 3 : le même mot ----------
    function sameWord(first, count, startReverse) {
      let q = 0;
      let reverse = startReverse;
      const next = () => {
        if (q >= count) return finish();
        clear();
        area.className = 'cases-area cases-t3';
        const target = (q === 0 && first) ? first : ctx.pick(1)[0];
        const opts = distinctOptions(ctx, target);
        const fromScript = reverse ? ctx.pair[1] : ctx.pair[0];
        const toScript = reverse ? ctx.pair[0] : ctx.pair[1];
        let locked = false;
        const choices = el('div', { class: 'cases-choices' });
        ctx.shuffle(opts).forEach((w) => {
          const b = el('button', { class: 'cases-choice', 'data-word': w.text, 'aria-label': w.say },
            ctx.renderWord(w, { script: toScript, size: 'lg' }));
          b.addEventListener('click', () => {
            if (locked || b.classList.contains('cases-done')) return;
            if (w.text === target.text) {
              locked = true;
              b.classList.add('cases-right');
              ctx.good(target, b);
              ctx.speak(target.say);
              q += 1; reverse = !reverse;
              later(next, 1300);
            } else {
              b.classList.add('cases-done');
              ctx.bad(target, b);
            }
          });
          choices.append(b);
        });
        area.append(
          el('div', { class: 'cases-target' },
            el('div', { class: 'card cases-pic cases-pic-s' }, el('span', { class: 'emoji-img' }, target.img)),
            el('div', { class: 'cases-tword' }, ctx.renderWord(target, { script: fromScript, size: 'xl' }))),
          choices);
      };
      next();
    }

    // ---------- Type 2 : relier ----------
    function link() {
      clear();
      area.className = 'cases-area cases-t2';
      const letters = chooseLetters(ctx);
      const n = letters.length;
      const mk = (l, script, side) => {
        const kind = VOWELS.includes(l) ? 'v' : 'c';
        const g = ctx.renderGrapheme({ t: l, k: kind }, { script });
        return el('button', { class: `cases-card cases-${side}`, 'data-letter': l, 'data-side': side, 'aria-label': l }, g);
      };
      const top = el('div', { class: 'cases-lrow' }, letters.map((l) => mk(l, ctx.pair[0], 'cap')));
      const bot = el('div', { class: 'cases-lrow' }, ctx.shuffle(letters).map((l) => mk(l, ctx.pair[1], 'low')));
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('class', 'cases-svg');
      area.append(top, bot, svg);
      const cards = [...area.querySelectorAll('.cases-card')];
      const rel = (card) => {
        const r = card.getBoundingClientRect(); const a = area.getBoundingClientRect();
        const isTop = card.dataset.side === 'cap';
        return { x: r.left + r.width / 2 - a.left, y: (isTop ? r.bottom - 6 : r.top + 6) - a.top };
      };
      const mkLine = (cls) => {
        const ln = document.createElementNS(SVGNS, 'line');
        ln.setAttribute('class', cls); svg.append(ln); return ln;
      };
      const setLine = (ln, p, q) => { ln.setAttribute('x1', p.x); ln.setAttribute('y1', p.y); ln.setAttribute('x2', q.x); ln.setAttribute('y2', q.y); };
      let sel = null; let drag = null; let matched = 0; let busy = false;
      const unsel = () => { if (sel) sel.classList.remove('cases-sel'); sel = null; };
      const attempt = (a, b) => {
        const cap = a.dataset.side === 'cap' ? a : b; const low = cap === a ? b : a;
        unsel();
        const okPair = cap.dataset.letter === low.dataset.letter;
        if (ctx.recordLetter) ctx.recordLetter(cap.dataset.letter, okPair);
        if (okPair) {
          cap.classList.add('cases-ok'); low.classList.add('cases-ok');
          cap.disabled = true; low.disabled = true;
          setLine(mkLine('cases-line cases-line-ok'), rel(cap), rel(low));
          ctx.good(null, low);
          matched += 1;
          if (matched === n) { busy = true; later(finish, 900); }
          return true;
        }
        ctx.bad(null, a);
        return false;
      };
      const cardAt = (x, y) => {
        const e = document.elementFromPoint(x, y);
        return e && e.closest ? e.closest('.cases-card') : null;
      };
      const down = (ev) => {
        if (busy) return;
        const card = ev.target.closest && ev.target.closest('.cases-card');
        if (!card || card.disabled) return;
        ev.preventDefault();
        ctx.sfx('tap');
        if (sel && sel !== card && sel.dataset.side !== card.dataset.side) { // 2e toucher
          attempt(sel, card); return;
        }
        const was = sel === card;
        unsel(); sel = card; card.classList.add('cases-sel');
        drag = { card, was, moved: false, id: ev.pointerId, line: mkLine('cases-line cases-line-drag'), from: rel(card) };
        try { area.setPointerCapture(ev.pointerId); } catch (e) { /* */ }
        const a = area.getBoundingClientRect();
        setLine(drag.line, drag.from, drag.from);
        drag.a = a;
      };
      const move = (ev) => {
        if (!drag || ev.pointerId !== drag.id) return;
        const p = { x: ev.clientX - drag.a.left, y: ev.clientY - drag.a.top };
        if (Math.hypot(p.x - drag.from.x, p.y - drag.from.y) > 12) drag.moved = true;
        if (drag.moved) setLine(drag.line, drag.from, p);
      };
      const up = (ev) => {
        if (!drag || ev.pointerId !== drag.id) return;
        const d = drag; drag = null;
        d.line.remove();
        try { area.releasePointerCapture(ev.pointerId); } catch (e) { /* */ }
        if (ev.type === 'pointercancel') { unsel(); return; }
        if (d.moved) {
          const t = cardAt(ev.clientX, ev.clientY);
          if (t && t !== d.card && !t.disabled && t.dataset.side !== d.card.dataset.side) attempt(d.card, t);
          else unsel();
        } else if (d.was) unsel();
      };
      area.addEventListener('pointerdown', down);
      area.addEventListener('pointermove', move);
      area.addEventListener('pointerup', up);
      area.addEventListener('pointercancel', up);
      cleanup = () => {
        area.removeEventListener('pointerdown', down); area.removeEventListener('pointermove', move);
        area.removeEventListener('pointerup', up); area.removeEventListener('pointercancel', up);
      };
      void cards;
    }

    if (type === 1) {
      const w = ctx.pick(1)[0];
      presentation(w, () => sameWord(w, 3, false));
    } else if (type === 2) link();
    else sameWord(null, 3, Math.random() < 0.5);

    return { destroy() { dead = true; timers.forEach(clearTimeout); timers.clear(); cleanup(); } };
  },
};

function typeFor(ctx) {
  if (ctx.forceType) return ctx.forceType;
  // Niveau 5 : on commence par le type 1.
  return ((ctx.round + Math.max(0, ctx.stage - 5)) % 3) + 1;
}

// 3 mots distincts (texte et image) : la cible + 2 distracteurs.
export function distinctOptions(ctx, target) {
  const out = [target];
  const ok = (w) => w && !out.some((o) => o.text === w.text || o.img === w.img);
  for (const w of ctx.distractors(target, 2, 0.6)) if (ok(w)) out.push(w);
  if (out.length < 3) for (const w of ctx.shuffle(ctx.pool())) { if (ok(w)) out.push(w); if (out.length === 3) break; }
  return out;
}

export function chooseLetters(ctx) {
  // Jeu « Les lettres jumelles » : seulement les lettres apprises, de plus en plus nombreuses.
  if (ctx.letterSet) {
    const set = ctx.letterSet;
    const n = Math.min(4, set.length, Math.max(1, Math.ceil(set.length / 2)));
    const focus = (ctx.focus || []).filter((k) => k.startsWith('L:')).map((k) => k.slice(2)).filter((l) => set.includes(l));
    const recent = set.slice(-3); // les dernières lettres apprises reviennent plus souvent
    const chosen = [];
    for (const l of [...focus, ...ctx.shuffle(recent), ...ctx.shuffle(set)]) {
      if (chosen.length >= n) break;
      if (!chosen.includes(l)) chosen.push(l);
    }
    return ctx.shuffle(chosen);
  }
  const early = ctx.stage === 5 && ctx.round < 4;
  const n = ctx.round < 2 ? 3 : 4;
  const seen = new Set();
  ctx.pool().forEach((w) => baseLetters(w).forEach((l) => seen.add(l)));
  let all = [...seen];
  for (const l of 'amtrelnghdbq') if (all.length < 8 && !all.includes(l)) all.push(l);
  const chosen = [];
  const mirrorOk = (l) => !(early && MIRROR.includes(l) && chosen.some((c) => MIRROR.includes(c)));
  const prefer = ctx.shuffle(all.filter((l) => CHANGING.includes(l)));
  const rest = ctx.shuffle(all.filter((l) => !CHANGING.includes(l)));
  for (const l of [...prefer, ...rest]) {
    if (chosen.length >= n) break;
    if (mirrorOk(l)) chosen.push(l);
  }
  return ctx.shuffle(chosen);
}
