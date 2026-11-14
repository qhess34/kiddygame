// Jeu bonus « Je lis des phrases » : phrase -> image, ou image -> phrase.
import { SENTENCES, SMALL_WORDS } from '../data/sentences.js';
import { allWords } from '../core/library.js';
import { buildWord } from '../core/words.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let warned = new Set();

// Construit les objets phrase { text, img, lvl, group, words:[mot] } ; ignore celles dont un mot manque.
export function buildSentences() {
  const known = new Map();
  for (const w of allWords()) if (!known.has(w.text)) known.set(w.text, w);
  const small = new Map();
  SMALL_WORDS.forEach((raw, i) => { if (!small.has(raw.w)) small.set(raw.w, buildWord(raw, 20000 + i)); });
  const out = [];
  for (const s of SENTENCES) {
    const words = [];
    let ok = true;
    for (const tok of s.text.trim().split(/\s+/)) {
      const w = known.get(tok) || small.get(tok);
      if (!w) { ok = false; if (!warned.has(s.text)) { warned.add(s.text); console.warn('[sentences] mot introuvable « ' + tok + ' » : phrase ignorée :', s.text); } break; }
      words.push(w);
    }
    if (ok && words.length) out.push({ text: s.text, img: s.img, lvl: s.lvl || 7, group: s.group || null, words });
  }
  return out;
}

// Phrase cible + 2 autres (même groupe si possible), images toutes différentes.
export function pickOptions(target, all, shuffle) {
  const out = [target];
  const ok = (s) => s.text !== target.text && !out.some((o) => o.text === s.text || o.img === s.img);
  const same = target.group ? all.filter((s) => s.group === target.group) : [];
  for (const s of shuffle(same)) if (out.length < 3 && ok(s)) out.push(s);
  for (const s of shuffle(all)) if (out.length < 3 && ok(s)) out.push(s);
  return out;
}

export default {
  id: 'sentences', title: 'Je lis des phrases', icon: '📖', color: '#7a4fd1', minLevel: 7,
  instruction: (ctx) => (ctx.round % 2 === 0 ? 'Lis la phrase et trouve la bonne image.' : 'Regarde l’image et trouve la bonne phrase.'),
  start(root, ctx) {
    const { el } = ctx;
    const all = buildSentences();
    const timers = new Set();
    let dead = false; let won = false; let token = 0;
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms); timers.add(t); return t; };
    const script = ctx.settings && ctx.settings.script === 'caps' ? 'caps' : 'lower';
    const area = el('div', { class: 'sent-area' });
    root.append(area);
    if (!all.length) { area.append(el('p', {}, 'Pas de phrases pour le moment.')); later(() => { if (!won) { won = true; ctx.win(); } }, 800); return { destroy() { dead = true; } }; }

    const allowed = all.filter((s) => s.lvl <= ctx.level);
    const pool = allowed.length ? allowed : all;
    // 3 phrases cibles, images et textes distincts.
    const targets = [];
    for (const s of ctx.shuffle(pool)) {
      if (targets.length >= 3) break;
      if (!targets.some((t) => t.img === s.img)) targets.push(s);
    }
    for (const s of ctx.shuffle(pool)) if (targets.length < 3 && !targets.includes(s)) targets.push(s);
    const sentenceNode = (s, opts = {}) => ctx.renderSentence(s.words, { script, colors: ctx.colors, ...opts });

    // Lecture « karaoké » : surligne chaque mot l'un après l'autre.
    async function karaoke(s, node, slow) {
      const my = ++token;
      const spans = [...node.querySelectorAll('.word')];
      for (let i = 0; i < s.words.length; i++) {
        if (dead || my !== token) return;
        spans.forEach((x) => x.classList.remove('sent-hl'));
        if (spans[i]) spans[i].classList.add('sent-hl');
        await Promise.all([ctx.speak(s.words[i].say, { slow }), wait(slow ? 750 : 480)]);
      }
      if (my === token) spans.forEach((x) => x.classList.remove('sent-hl'));
    }

    let q = 0;
    function next() {
      if (dead) return;
      if (q >= 3 || q >= targets.length) { if (!won) { won = true; ctx.win(); } return; }
      area.innerHTML = '';
      const target = targets[q];
      const variantA = (ctx.round + q) % 2 === 0;
      const opts = ctx.shuffle(pickOptions(target, pool.length >= 3 ? pool : all, ctx.shuffle));
      let locked = false;
      const answer = (s, node, show) => {
        if (locked) return;
        if (s.text === target.text) {
          locked = true; token++;
          node.classList.add('sent-right');
          ctx.good(null, node);
          for (const w of target.words) ctx.record(w, true);
          const reader = show || area.querySelector('.sent-line .sentence');
          karaoke(target, reader, false).then(() => { q += 1; later(next, 500); });
        } else {
          node.classList.add('sent-wrong');
          ctx.bad(null, node);
        }
      };
      area.className = 'sent-area ' + (variantA ? 'sent-va' : 'sent-vb');
      if (variantA) {
        const line = sentenceNode(target);
        const hear = el('button', { class: 'round-btn sent-hear', 'aria-label': 'Écouter la phrase', onclick: () => { ctx.sfx('tap'); karaoke(target, line, false); } }, '🔊');
        area.append(el('div', { class: 'sent-top' }, el('div', { class: 'sent-line' }, line), hear));
        const row = el('div', { class: 'sent-pics' });
        opts.forEach((s) => {
          const b = el('button', { class: 'sent-pic', 'aria-label': 'image' }, el('span', { class: 'emoji-img sent-emoji' }, s.img));
          b.addEventListener('click', () => answer(s, b, line));
          row.append(b);
        });
        area.append(row);
      } else {
        const hint = el('button', { class: 'round-btn sent-hint', 'aria-label': 'Aide' }, '💡');
        area.append(el('div', { class: 'sent-top' }, el('div', { class: 'card sent-bigpic' }, el('span', { class: 'emoji-img sent-emoji' }, target.img)), hint));
        const col = el('div', { class: 'sent-sentences' });
        const nodes = new Map();
        opts.forEach((s) => {
          const line = sentenceNode(s);
          nodes.set(s.text, line);
          const b = el('button', { class: 'sent-choice' }, line);
          b.addEventListener('click', () => answer(s, b, line));
          col.append(b);
        });
        hint.addEventListener('click', () => { ctx.sfx('tap'); karaoke(target, nodes.get(target.text), true); });
        area.append(col);
      }
    }
    next();
    return { destroy() { dead = true; token++; timers.forEach(clearTimeout); timers.clear(); } };
  },
};
