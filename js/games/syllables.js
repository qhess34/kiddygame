// Jeu 3 — « Je découpe les syllabes » : l'enfant coupe le mot avec les ciseaux.
// Les coupures se font sur les SYLLABES ; les couleurs restent celles des GRAPHÈMES.
import { letterKinds, displayText, concreteScript } from '../core/words.js';
import { speak, stopSpeaking } from '../core/audio.js';

const AUTO_WIN_MS = 6000;

function pickWord(ctx) {
  const multi = (arr) => arr.filter((w) => w.syllables.length >= 2);
  let pool = multi(ctx.pool());
  if (pool.length < 4) {
    const have = new Set(pool.map((w) => w.id));
    pool = pool.concat(multi(ctx.widePool()).filter((w) => !have.has(w.id)));
  }
  if (!pool.length) pool = multi(ctx.pool()).concat(ctx.pool());
  const picked = ctx.pick(1, pool)[0] || ctx.pickRandom(pool, 1)[0];
  return picked;
}

export default {
  id: 'syllables', title: 'Je découpe les syllabes', icon: '✂️', color: '#b388eb', minLevel: 1,
  instruction: () => 'Écoute le mot, puis coupe-le en syllabes avec les ciseaux.',

  start(root, ctx) {
    const { el } = ctx;
    const word = pickWord(ctx);
    const timers = new Set();
    let destroyed = false, won = false, seq = 0, busy = false;
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!destroyed) fn(); }, ms); timers.add(t); return t; };
    const sleep = (ms) => new Promise((r) => later(r, ms));

    // Écriture concrète pour cette manche (mixed => au hasard, une fois).
    const script = concreteScript(ctx.script);

    // Prononciation (jeton : une nouvelle parole annule les séquences en cours).
    const say = (text, opts) => { seq++; return speak(text, opts); };
    const sylSay = (i) => (word.sylSay && word.sylSay[i]) || word.syllables[i];
    async function saySyllables(idxs, { slow = false, onEach, gap = 120 } = {}) {
      const my = ++seq;
      for (const i of idxs) {
        if (destroyed || my !== seq) return false;
        onEach && onEach(i);
        await speak(sylSay(i), { slow });
        if (destroyed || my !== seq) return false;
        await sleep(gap);
      }
      return my === seq && !destroyed;
    }

    // Bornes de syllabes (positions de coupure correctes).
    const bounds = [];
    word.syllables.reduce((acc, s) => { acc += s.length; bounds.push(acc); return acc; }, 0);
    const cutsNeeded = bounds.slice(0, -1);             // positions 1..n-1
    const startOf = (i) => (i === 0 ? 0 : bounds[i - 1]);
    const letters = [...word.text];
    const kinds = letterKinds(word);
    const found = new Set();

    // ---- Construction -------------------------------------------------
    const n = letters.length;
    const card = el('div', { class: 'img-card sy-img' }, el('span', { class: 'emoji-img' }, word.img));
    const btnListen = el('button', { class: 'round-btn sy-tool', 'aria-label': 'Écouter le mot' }, '🔊');
    const btnSlow = el('button', { class: 'round-btn sy-tool', 'aria-label': 'Écouter lentement' }, '🐢');
    const btnHint = el('button', { class: 'round-btn sy-tool sy-hint-btn', 'aria-label': 'Aide' }, '💡');
    const tools = el('div', { class: 'sy-tools' }, btnListen, btnSlow, btnHint);
    const top = el('div', { class: 'sy-top' }, card, tools);

    const wordEl = el('div', { class: `sy-word script-${script} ${ctx.colors ? '' : 'no-colors'}`, style: { '--n': n }, 'data-word': word.id });
    const letterEls = [];
    const slots = [];
    letters.forEach((ch, i) => {
      const k = kinds[i] ? kinds[i].k : 'c';
      const g = el('span', { class: `g k-${k} sy-letter`, 'data-i': i }, displayText(ch, script));
      letterEls.push(g);
      wordEl.append(g);
      if (i < n - 1) {
        const pos = i + 1;
        const slot = el('span', { class: 'sy-slot', 'data-pos': pos },
          el('span', { class: 'sy-line' }),
          el('span', { class: 'sy-zone', 'data-pos': pos }),
          el('span', { class: 'sy-scissors', 'aria-hidden': 'true' }, '✂️'));
        slots.push(slot);
        wordEl.append(slot);
      }
    });
    const stage = el('div', { class: 'sy-stage' }, wordEl);
    const nextBtn = el('button', { class: 'big-btn sy-next', 'aria-label': 'Suivant' }, '▶️');
    const foot = el('div', { class: 'sy-foot' }, nextBtn);
    root.append(top, stage, foot);

    // ---- Boutons d'écoute --------------------------------------------
    const tap = (btn, fn) => btn.addEventListener('click', () => { ctx.sfx('tap'); fn(); });
    tap(btnListen, () => { say(word.say); });
    tap(btnSlow, () => { say(word.say, { slow: true }); });
    tap(btnHint, () => {
      if (won) return;
      hints++;
      const all = word.syllables.map((_, i) => i);
      saySyllables(all, { slow: true, gap: 250, onEach: (i) => highlight(i) });
    });
    let hints = 0;
    function highlight(si, ms = 700) {
      const a = startOf(si), b = bounds[si];
      for (let i = a; i < b; i++) {
        const l = letterEls[i];
        l.classList.add('sy-hl');
        later(() => l.classList.remove('sy-hl'), ms);
      }
    }

    // ---- Coupures -----------------------------------------------------
    // Syllabes « détachées » : segments dont les deux bornes sont coupées (ou extrémités).
    function detachedSyllables() {
      const edges = [0, ...cutsNeeded.filter((p) => found.has(p)), n];
      const out = [];
      for (let e = 0; e < edges.length - 1; e++) {
        const si = bounds.indexOf(edges[e + 1]);
        if (si >= 0 && startOf(si) === edges[e]) out.push(si);
      }
      return out;
    }

    let lastBad = 0;
    function attempt(pos) {
      if (won || destroyed || found.has(pos)) return;
      const slot = slots[pos - 1];
      if (cutsNeeded.includes(pos)) {
        found.add(pos);
        slot.classList.add('cut');
        ctx.sfx('cut');
        ctx.fx.sparkle(slot);
        const det = detachedSyllables();
        det.forEach((si) => highlight(si, 500));
        if (found.size === cutsNeeded.length) { finish(); }
        else if (det.length) saySyllables(det);
        else say(word.say);
      } else {
        const now = Date.now();
        if (now - lastBad < 500) return;
        lastBad = now;
        slot.classList.remove('shake'); void slot.offsetWidth; slot.classList.add('shake');
        later(() => slot.classList.remove('shake'), 600);
        ctx.bad(word, slot, { say: true });
      }
    }

    // Toucher une zone, ou glisser le doigt dessus (coup de ciseaux).
    let down = false;
    const tried = new Set();
    const zoneAt = (x, y) => {
      const t = document.elementFromPoint(x, y);
      return t && t.closest ? t.closest('.sy-zone') : null;
    };
    const onDown = (e) => {
      down = true; tried.clear();
      const z = zoneAt(e.clientX, e.clientY) || (e.target.closest && e.target.closest('.sy-zone'));
      if (z) { tried.add(z); attempt(+z.dataset.pos); }
    };
    const onMove = (e) => {
      if (!down) return;
      const z = zoneAt(e.clientX, e.clientY);
      if (z && !tried.has(z)) { tried.add(z); attempt(+z.dataset.pos); }
    };
    const onUp = () => { down = false; tried.clear(); };
    wordEl.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // ---- Animation finale -------------------------------------------
    function finish() {
      if (won || busy) return;
      busy = true;
      const arcColors = ['var(--arc-a)', 'var(--arc-b)'];
      const finalEl = el('div', { class: `sy-final script-${script} ${ctx.colors ? '' : 'no-colors'}`, style: { '--n': n } });
      const sylBtns = word.syllables.map((syl, si) => {
        const b = el('button', { class: 'sy-syl', style: { '--arc': arcColors[si % 2] }, 'aria-label': 'Écouter la syllabe' },
          el('span', { class: 'sy-syl-letters' },
            ...[...syl].map((ch, j) => {
              const idx = startOf(si) + j;
              return el('span', { class: `g k-${kinds[idx] ? kinds[idx].k : 'c'}` }, displayText(ch, script));
            })),
          el('span', { class: 'sy-arc' }));
        b.addEventListener('click', () => { ctx.sfx('tap'); b.classList.add('say'); later(() => b.classList.remove('say'), 600); say(sylSay(si)); });
        return b;
      });
      finalEl.append(...sylBtns);
      // Les lettres s'écartent déjà (coupures), puis on bascule vers la vue finale.
      later(() => {
        stage.innerHTML = '';
        stage.append(finalEl);
        finalEl.classList.add('enter');
        ctx.sfx('pop');
        (async () => {
          await sleep(500);
          const ok = await saySyllables(word.syllables.map((_, i) => i), {
            gap: 200,
            onEach: (i) => { sylBtns[i].classList.add('say'); later(() => sylBtns[i].classList.remove('say'), 700); },
          });
          if (!ok) { reveal(); return; }
          await speak(word.say + ' !');
          reveal();
        })();
      }, 650);
    }

    let revealed = false;
    function reveal() {
      if (revealed || destroyed) return;
      revealed = true;
      const target = root.querySelector('.sy-final') || card;
      ctx.good(word, target, { say: false });
      foot.classList.add('show');
      later(() => done(), AUTO_WIN_MS);
    }
    function done() {
      if (won || destroyed) return;
      won = true;
      ctx.win();
    }
    nextBtn.addEventListener('click', () => { ctx.sfx('tap'); if (!revealed) { revealed = true; } done(); });

    // ---- Démarrage : la voix dit le mot (après la consigne au 1er tour) ----
    function startWhenQuiet(tries = 0) {
      const busySpeech = window.speechSynthesis && window.speechSynthesis.speaking;
      if (busySpeech && tries < 25) { later(() => startWhenQuiet(tries + 1), 300); return; }
      say(word.say);
    }
    later(() => startWhenQuiet(), ctx.round === 0 ? 700 : 350);

    return {
      destroy() {
        destroyed = true;
        timers.forEach(clearTimeout); timers.clear();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        stopSpeaking();
      },
    };
  },
};
