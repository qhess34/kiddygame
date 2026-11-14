// Jeu « Je relie » : relier chaque mot à son image en traçant un trait au doigt
// (ou en touchant un mot puis une image, ou l'inverse).
const DRAG_THRESHOLD = 12; // px : en dessous, c'est un simple tap
const SVG_NS = 'http://www.w3.org/2000/svg';

function derange(arr) {
  // Mélange sans point fixe (l'image n'est jamais en face de son mot).
  if (arr.length < 2) return arr.slice();
  for (let t = 0; t < 40; t++) {
    const a = arr.map((_, i) => i).sort(() => Math.random() - 0.5);
    if (a.every((v, i) => v !== i)) return a;
  }
  return arr.map((_, i) => (i + 1) % arr.length);
}

export default {
  id: 'match', title: 'Je relie', icon: '🔗', color: '#ff8fab', minLevel: 1,
  instruction: () => 'Lis chaque mot et relie-le à son image avec ton doigt.',

  start(root, ctx) {
    const { el } = ctx;
    const want = Math.round(Number(ctx.settings.itemsPerRound)) || 3;
    const n = Math.max(2, Math.min(4, want));
    const words = ctx.pick(n);
    const count = words.length;
    const imgOrder = derange(words); // imgOrder[row] = index du mot illustré à cette ligne

    const pairs = words.map((word, i) => ({ word, i, found: false, wordCard: null, imgCard: null, line: null }));
    const timers = new Set();
    const rafs = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'm-lines');
    svg.setAttribute('aria-hidden', 'true');

    const dot = () => el('span', { class: 'm-dot' });
    const wordCol = el('div', { class: 'm-col m-col-words' });
    const imgCol = el('div', { class: 'm-col m-col-imgs' });
    words.forEach((word, i) => {
      const card = el('div', { class: 'm-card m-word', 'data-side': 'word', 'data-i': String(i), role: 'button', tabindex: '0' },
        ctx.renderWord(word, { size: 'lg' }), dot());
      pairs[i].wordCard = card;
      wordCol.append(card);
    });
    imgOrder.forEach((wi) => {
      const word = words[wi];
      const card = el('div', { class: 'm-card m-img img-card', 'data-side': 'img', 'data-i': String(wi), role: 'button', tabindex: '0', 'aria-label': 'image' },
        el('span', { class: 'emoji-img' }, word.img), dot());
      pairs[wi].imgCard = card;
      imgCol.append(card);
    });
    const board = el('div', { class: 'game-match-board' }, wordCol, imgCol, svg);
    const wrap = el('div', { class: 'game-match-wrap' }, board);
    root.append(wrap);

    const allCards = () => pairs.flatMap((p) => [p.wordCard, p.imgCard]);
    const sideOf = (c) => c.dataset.side;
    const pairOf = (c) => pairs[Number(c.dataset.i)];

    // ---- géométrie ----
    function anchor(card) {
      const r = card.getBoundingClientRect();
      const b = board.getBoundingClientRect();
      return { x: (sideOf(card) === 'word' ? r.right : r.left) - b.left, y: r.top + r.height / 2 - b.top };
    }
    function setLine(line, a, b) {
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
    }
    function mkLine(cls) {
      const l = document.createElementNS(SVG_NS, 'line');
      l.setAttribute('class', cls);
      svg.append(l);
      return l;
    }
    function layoutLines() {
      for (const p of pairs) if (p.found && p.line) setLine(p.line, anchor(p.wordCard), anchor(p.imgCard));
    }
    const onResize = () => layoutLines();
    window.addEventListener('resize', onResize);
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(layoutLines); ro.observe(board); }

    // ---- sélection par touchers ----
    let sel = null;
    function clearSel() {
      sel = null;
      for (const c of allCards()) c.classList.remove('sel', 'target');
    }
    function select(card) {
      clearSel();
      sel = card;
      card.classList.add('sel');
      const opp = sideOf(card) === 'word' ? 'img' : 'word';
      for (const c of allCards()) if (sideOf(c) === opp && !pairOf(c).found) c.classList.add('target');
      ctx.sfx('tap');
    }

    // ---- résultat d'une tentative ----
    function attempt(from, to) {
      const wordCard = sideOf(from) === 'word' ? from : to;
      const imgCard = sideOf(from) === 'word' ? to : from;
      const wp = pairOf(wordCard);
      const ip = pairOf(imgCard);
      clearSel();
      if (wp === ip) {
        wp.found = true;
        wp.line = mkLine('m-line m-ok');
        setLine(wp.line, anchor(wp.wordCard), anchor(wp.imgCard));
        wp.wordCard.classList.add('found');
        wp.imgCard.classList.add('found');
        ctx.good(wp.word, wp.imgCard);
        ctx.speak(wp.word.say);
        if (pairs.every((p) => p.found)) later(() => ctx.win(), 700);
        return true;
      }
      ctx.bad(wp.word, to);
      return false;
    }

    function retract(line, a, b0) {
      // la ligne se rétracte en douceur vers son point de départ
      const t0 = performance.now();
      const dur = 240;
      const x0 = Number(line.getAttribute('x2')); const y0 = Number(line.getAttribute('y2'));
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        line.setAttribute('x2', x0 + (a.x - x0) * e);
        line.setAttribute('y2', y0 + (a.y - y0) * e);
        line.style.opacity = String(1 - k * 0.6);
        if (k < 1) { const id = requestAnimationFrame(step); rafs.add(id); }
        else line.remove();
      };
      const id = requestAnimationFrame(step); rafs.add(id);
    }

    function cardAt(x, y, side) {
      // carte du côté demandé sous le point (marge de 10 px autour des cartes)
      let best = null; let bd = 1e9;
      for (const c of allCards()) {
        if (sideOf(c) !== side || pairOf(c).found) continue;
        const r = c.getBoundingClientRect();
        if (x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 10 && y <= r.bottom + 10) {
          const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
          if (d < bd) { bd = d; best = c; }
        }
      }
      return best;
    }

    // ---- gestes ----
    let st = null; // { id, card, x0, y0, dragging, line, a }
    function onDown(e) {
      if (st) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const card = e.target.closest && e.target.closest('.m-card');
      if (!card) return;
      st = { id: e.pointerId, card, x0: e.clientX, y0: e.clientY, dragging: false, line: null, a: null };
      try { board.setPointerCapture(e.pointerId); } catch (err) { /* */ }
      e.preventDefault();
    }
    function onMove(e) {
      if (!st || e.pointerId !== st.id) return;
      if (!st.dragging) {
        if (pairOf(st.card).found) return;
        if (Math.hypot(e.clientX - st.x0, e.clientY - st.y0) < DRAG_THRESHOLD) return;
        st.dragging = true;
        clearSel();
        st.card.classList.add('sel');
        const opp = sideOf(st.card) === 'word' ? 'img' : 'word';
        for (const c of allCards()) if (sideOf(c) === opp && !pairOf(c).found) c.classList.add('target');
        st.a = anchor(st.card);
        st.line = mkLine('m-line m-drag');
      }
      const b = board.getBoundingClientRect();
      setLine(st.line, st.a, { x: e.clientX - b.left, y: e.clientY - b.top });
      e.preventDefault();
    }
    function onUp(e) {
      if (!st || e.pointerId !== st.id) return;
      const s = st; st = null;
      try { board.releasePointerCapture(e.pointerId); } catch (err) { /* */ }
      if (s.dragging) {
        s.card.classList.remove('sel');
        const opp = sideOf(s.card) === 'word' ? 'img' : 'word';
        const target = cardAt(e.clientX, e.clientY, opp);
        for (const c of allCards()) c.classList.remove('target');
        if (target) {
          const ok = attempt(s.card, target);
          if (ok) s.line.remove(); else retract(s.line, s.a);
        } else {
          retract(s.line, s.a);
        }
        return;
      }
      // simple tap
      const card = s.card;
      const p = pairOf(card);
      if (p.found) {
        if (sideOf(card) === 'word') { ctx.speak(p.word.say); ctx.fx.bounce(card); }
        return;
      }
      if (!sel) { select(card); return; }
      if (sel === card) { clearSel(); return; }
      if (sideOf(sel) === sideOf(card)) { select(card); return; }
      attempt(sel, card);
    }
    function onCancel(e) {
      if (!st || e.pointerId !== st.id) return;
      if (st.line) st.line.remove();
      if (st.card) st.card.classList.remove('sel');
      for (const c of allCards()) c.classList.remove('target');
      st = null;
    }
    board.addEventListener('pointerdown', onDown);
    board.addEventListener('pointermove', onMove);
    board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', onCancel);
    // Accessibilité clavier : Entrée / Espace = toucher
    function onKey(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest && e.target.closest('.m-card');
      if (!card) return;
      e.preventDefault();
      const p = pairOf(card);
      if (p.found) { if (sideOf(card) === 'word') ctx.speak(p.word.say); return; }
      if (!sel) select(card);
      else if (sel === card) clearSel();
      else if (sideOf(sel) === sideOf(card)) select(card);
      else attempt(sel, card);
    }
    board.addEventListener('keydown', onKey);

    return {
      destroy() {
        window.removeEventListener('resize', onResize);
        if (ro) ro.disconnect();
        board.removeEventListener('pointerdown', onDown);
        board.removeEventListener('pointermove', onMove);
        board.removeEventListener('pointerup', onUp);
        board.removeEventListener('pointercancel', onCancel);
        board.removeEventListener('keydown', onKey);
        timers.forEach(clearTimeout); timers.clear();
        rafs.forEach(cancelAnimationFrame); rafs.clear();
      },
    };
  },
};
