// Jeu « Je construis le mot » : reconstituer un mot (image donnée) avec des tuiles
// (graphèmes ou syllabes), en glissant ou en touchant.
import { letterKinds, displayText, concreteScript } from '../core/words.js';

const DRAG_THRESHOLD = 12;
let lastMode = 'letters';

// Unités d'un mot : graphèmes ou syllabes écrites.
function unitsOf(word, mode) {
  if (mode === 'syllables') {
    const kinds = letterKinds(word);
    let i = 0;
    return word.syllables.map((syl) => {
      const ks = [...syl].map(() => kinds[i++].k);
      return { key: syl, text: syl, kinds: ks, syl: true };
    });
  }
  return word.graphemes.map((g) => ({ key: g.key, text: g.t, kinds: [g.k], g }));
}

export default {
  id: 'build', title: 'Je construis le mot', icon: '🧱', color: '#4cc9f0', minLevel: 1,
  instruction: () => (lastMode === 'syllables'
    ? 'Regarde l’image et construis le mot avec les syllabes.'
    : 'Regarde l’image et construis le mot avec les lettres.'),

  start(root, ctx) {
    const { el } = ctx;
    const level = ctx.stage;
    const setMode = ctx.settings.buildMode || 'auto';

    // ---- choix du mot ----
    let pool = ctx.pool();
    if (level <= 2) {
      const short = pool.filter((w) => w.text.length <= 6);
      if (short.length >= 3) pool = short;
    }
    if (setMode === 'syllables') {
      const multi = pool.filter((w) => w.syllables.length >= 2);
      if (multi.length >= 2) pool = multi;
    } else if (setMode === 'auto' && level <= 2) {
      // de temps en temps un mot de 3 syllabes pour travailler les syllabes
      const three = pool.filter((w) => w.syllables.length >= 3);
      if (three.length && Math.random() < 0.3) pool = three;
    }
    const word = ctx.pick(1, pool)[0] || ctx.pickRandom(pool, 1)[0];
    let mode = 'letters';
    if (setMode === 'syllables' && word.syllables.length >= 2) mode = 'syllables';
    else if (setMode === 'auto' && level <= 2 && word.syllables.length >= 3) mode = 'syllables';
    lastMode = mode;

    // écriture de la manche (une seule par manche)
    const script = concreteScript(ctx.script);

    const needed = unitsOf(word, mode);

    // ---- intrus (niveau 3+) ----
    let intruders = [];
    if (level >= 3) {
      const nInt = Math.floor(Math.random() * 3);
      if (nInt) {
        const have = new Set(needed.map((u) => u.text));
        const cand = [];
        const seen = new Set();
        for (const w of ctx.shuffle(ctx.pool())) {
          if (w.text === word.text) continue;
          for (const u of unitsOf(w, mode)) {
            if (have.has(u.text) || seen.has(u.text)) continue;
            if (mode === 'syllables' && u.text.length > 4) continue;
            seen.add(u.text); cand.push(u);
          }
          if (cand.length > 20) break;
        }
        intruders = ctx.pickRandom(cand, nInt);
      }
    }

    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

    // ---- rendu d'une unité ----
    function renderUnit(u) {
      if (u.g) return ctx.renderGrapheme(u.g, { script });
      const wrap = el('span', { class: 'b-syl' });
      [...u.text].forEach((ch, i) => {
        wrap.append(el('span', { class: `g k-${u.kinds[i]} ${ctx.colors ? '' : 'no-colors'} script-${script}` }, displayText(ch, script)));
      });
      return wrap;
    }

    // ---- DOM ----
    const slots = needed.map((u, i) => {
      const n = [...u.text].length;
      return { u, i, tile: null, el: el('div', { class: 'b-slot', 'data-i': String(i), style: { '--n': String(n) } }) };
    });
    const slotsRow = el('div', { class: 'b-slots' }, ...slots.map((s) => s.el));

    const tiles = [];
    const order = (() => {
      const all = needed.map((u) => ({ u, intruder: false })).concat(intruders.map((u) => ({ u, intruder: true })));
      let out = ctx.shuffle(all);
      for (let t = 0; t < 6 && all.length > 1 && out.every((x, i) => x === all[i]); t++) out = ctx.shuffle(all);
      return out;
    })();
    const poolRow = el('div', { class: 'b-pool' });
    order.forEach(({ u, intruder }) => {
      const tile = el('div', { class: `b-tile ${u.syl ? 'is-syl' : ''}`, role: 'button', tabindex: '0', style: { '--n': String([...u.text].length) } }, renderUnit(u));
      const cell = el('div', { class: 'b-cell' }, tile);
      const t = { u, el: tile, cell, intruder, placed: false, busy: false };
      tile._t = t;
      tiles.push(t);
      poolRow.append(cell);
    });

    const btnSound = el('button', { class: 'round-btn b-help', 'aria-label': 'Écouter le mot' }, '🔊');
    const btnHint = el('button', { class: 'round-btn b-help', 'aria-label': 'Un indice' }, '💡');
    const picture = el('div', { class: 'b-picture' },
      el('div', { class: 'img-card b-img' }, el('span', { class: 'emoji-img' }, word.img)),
      el('div', { class: 'b-helps' }, btnSound, btnHint));
    const work = el('div', { class: 'b-work' }, slotsRow, poolRow);
    const board = el('div', { class: 'game-build-board' }, picture, work);
    root.append(board);

    btnSound.addEventListener('click', () => ctx.speak(word.say));
    btnHint.addEventListener('click', () => {
      const slot = slots.find((s) => !s.tile);
      if (!slot) return;
      const t = tiles.find((x) => !x.placed && !x.busy && x.u.key === slot.u.key);
      if (!t) return;
      ctx.sfx('tap');
      t.el.classList.remove('hint'); void t.el.offsetWidth; t.el.classList.add('hint');
      slot.el.classList.add('hint');
      later(() => { t.el.classList.remove('hint'); slot.el.classList.remove('hint'); }, 1900);
    });

    // ---- placement ----
    let done = false;
    function freezeCell(t) {
      const r = t.el.getBoundingClientRect();
      t.cell.style.width = r.width + 'px';
      t.cell.style.height = r.height + 'px';
    }
    function flipInto(t, slot, from) {
      slot.tile = t; t.placed = true;
      t.el.style.cssText = '';
      t.el.classList.remove('dragging', 'hint');
      t.el.classList.add('placed');
      slot.el.append(t.el);
      slot.el.classList.add('filled'); slot.el.classList.remove('hint');
      const to = t.el.getBoundingClientRect();
      const dx = from.left - to.left; const dy = from.top - to.top;
      t.el.style.transition = 'none';
      t.el.style.transform = `translate(${dx}px, ${dy}px)`;
      void t.el.offsetWidth;
      t.el.style.transition = 'transform .22s ease-out';
      t.el.style.transform = '';
      later(() => { t.el.style.transition = ''; }, 260);
      if (slots.every((s) => s.tile)) complete(t); else ctx.good(null, t.el);
    }
    function complete(lastTile) {
      done = true;
      ctx.sfx('good');
      later(() => {
        slotsRow.classList.add('complete');
        ctx.good(word, slotsRow);
        ctx.speak(word.say);
        later(() => ctx.win(), 900);
      }, 240);
    }
    function giveBack(t, wiggleIt) {
      // la tuile revient doucement dans la réserve
      const home = t.cell.getBoundingClientRect();
      t.busy = true;
      const el_ = t.el;
      if (el_.classList.contains('dragging')) {
        el_.style.transition = 'left .26s ease, top .26s ease';
        el_.style.left = home.left + 'px';
        el_.style.top = home.top + 'px';
        later(() => {
          el_.style.cssText = ''; el_.classList.remove('dragging');
          t.cell.style.width = ''; t.cell.style.height = '';
          t.busy = false;
        }, 280);
      } else {
        t.busy = false;
      }
      if (wiggleIt) ctx.bad(word, el_); else ctx.bad(word, el_);
    }

    function tryPlace(t, slot, from) {
      if (!slot || slot.tile) { giveBack(t); return; }
      if (slot.u.key === t.u.key && !t.intruder) flipInto(t, slot, from);
      else giveBack(t);
    }

    // ---- gestes ----
    let st = null;
    function onDown(e) {
      if (st || done) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const tile = e.target.closest && e.target.closest('.b-tile');
      if (!tile || !tile._t || tile._t.placed || tile._t.busy) return;
      const r = tile.getBoundingClientRect();
      st = { id: e.pointerId, t: tile._t, x0: e.clientX, y0: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, dragging: false, w: r.width, h: r.height };
      try { tile.setPointerCapture(e.pointerId); } catch (err) { /* */ }
      e.preventDefault();
    }
    function onMove(e) {
      if (!st || e.pointerId !== st.id) return;
      const t = st.t;
      if (!st.dragging) {
        if (Math.hypot(e.clientX - st.x0, e.clientY - st.y0) < DRAG_THRESHOLD) return;
        st.dragging = true;
        freezeCell(t);
        t.el.style.width = st.w + 'px'; t.el.style.height = st.h + 'px';
        t.el.classList.add('dragging');
        ctx.sfx('tap');
      }
      t.el.style.left = (e.clientX - st.ox) + 'px';
      t.el.style.top = (e.clientY - st.oy) + 'px';
      // case visée mise en valeur
      const slot = slotAt(e.clientX, e.clientY);
      slots.forEach((s) => s.el.classList.toggle('over', s === slot));
      e.preventDefault();
    }
    function slotAt(x, y) {
      let best = null; let bd = 1e9;
      for (const s of slots) {
        if (s.tile) continue;
        const r = s.el.getBoundingClientRect();
        const cx = Math.max(r.left, Math.min(x, r.right));
        const cy = Math.max(r.top, Math.min(y, r.bottom));
        const d = Math.hypot(x - cx, y - cy);
        if (d < 44 && d < bd) { bd = d; best = s; }
      }
      return best;
    }
    function onUp(e) {
      if (!st || e.pointerId !== st.id) return;
      const s = st; st = null;
      const t = s.t;
      try { t.el.releasePointerCapture(e.pointerId); } catch (err) { /* */ }
      slots.forEach((x) => x.el.classList.remove('over'));
      if (s.dragging) {
        const from = t.el.getBoundingClientRect();
        const slot = slotAt(e.clientX, e.clientY);
        if (!slot) { giveBack(t); return; }
        tryPlace(t, slot, from);
        return;
      }
      // tap : première case vide
      const from = t.el.getBoundingClientRect();
      const slot = slots.find((x) => !x.tile);
      if (slot && slot.u.key === t.u.key && !t.intruder) { freezeCell(t); flipInto(t, slot, from); }
      else ctx.bad(word, t.el);
    }
    function onCancel(e) {
      if (!st || e.pointerId !== st.id) return;
      const s = st; st = null;
      slots.forEach((x) => x.el.classList.remove('over'));
      if (s.dragging) giveBack(s.t);
    }
    board.addEventListener('pointerdown', onDown);
    board.addEventListener('pointermove', onMove);
    board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', onCancel);
    // capture sur la tuile : les évènements arrivent à la tuile puis remontent au board
    function onKey(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const tile = e.target.closest && e.target.closest('.b-tile');
      if (!tile || !tile._t || tile._t.placed || done) return;
      e.preventDefault();
      const t = tile._t;
      const from = tile.getBoundingClientRect();
      const slot = slots.find((x) => !x.tile);
      if (slot && slot.u.key === t.u.key && !t.intruder) { freezeCell(t); flipInto(t, slot, from); }
      else ctx.bad(word, t.el);
    }
    board.addEventListener('keydown', onKey);

    return {
      destroy() {
        board.removeEventListener('pointerdown', onDown);
        board.removeEventListener('pointermove', onMove);
        board.removeEventListener('pointerup', onUp);
        board.removeEventListener('pointercancel', onCancel);
        board.removeEventListener('keydown', onKey);
        timers.forEach(clearTimeout); timers.clear();
      },
    };
  },
};
