// Rendu des mots avec le code couleur pédagogique.
//   rouge = voyelle (v), bleu = consonne (c), vert = digramme/trigramme (d), noir = muette (m)
import { displayText, letterKinds, concreteScript } from './words.js';
export { concreteScript };

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) node.style.setProperty(sk, sv); else node.style[sk] = sv;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/**
 * Rend un mot colorié.
 * @param word    objet mot (voir core/words.js)
 * @param opts.script  'caps' | 'lower' | 'cursive' | 'bridge' | 'cbridge' | 'mixed'
 * @param opts.colors  true/false — false = tout en gris foncé (lecture autonome)
 * @param opts.size    'sm' | 'md' | 'lg' | 'xl'
 * @param opts.bridge  force l'affichage du rappel en capitales sous le mot
 * @param opts.syllables  true = regroupe les lettres par syllabe (arcs)
 */
export function renderWord(word, opts = {}) {
  const script = opts.script || 'caps';
  const shown = concreteScript(script);
  const colors = opts.colors !== false;
  const size = opts.size || 'md';
  const wrap = el('span', { class: `word word-${size} ${colors ? '' : 'no-colors'} script-${shown}`, 'data-word': word.id, lang: 'fr' });

  if (opts.syllables) {
    const kinds = letterKinds(word);
    let i = 0;
    word.syllables.forEach((syl, si) => {
      const s = el('span', { class: 'syl', 'data-syl': si });
      for (const ch of syl) {
        const k = kinds[i] ? kinds[i].k : 'c';
        s.append(el('span', { class: `g k-${k}` }, displayText(ch, shown)));
        i++;
      }
      wrap.append(s);
    });
  } else {
    for (const g of word.graphemes) {
      wrap.append(el('span', { class: `g k-${g.k}`, title: '' }, displayText(g.t, shown)));
    }
  }

  if (opts.bridge || script === 'bridge' || script === 'cbridge') {
    // Rappel sous le mot : en capitales (découverte du script) ou en script (découverte de la cursive).
    const under = script === 'cbridge' || shown === 'cursive' ? 'lower' : 'caps';
    const box = el('span', { class: `word-bridge word-${size}` });
    box.append(wrap, el('span', { class: `bridge-caps script-${under}`, 'aria-hidden': 'true' }, displayText(word.text, under)));
    return box;
  }
  return wrap;
}

// Rend un graphème isolé (tuile du jeu "Je construis le mot").
export function renderGrapheme(g, script, colors = true) {
  const shown = concreteScript(script);
  return el('span', { class: `g k-${g.k} ${colors ? '' : 'no-colors'} script-${shown}` }, displayText(g.t, shown));
}

// Rend une phrase : tableau de mots (objets mot) + ponctuation finale.
export function renderSentence(words, { script = 'lower', colors = true, punct = '.' } = {}) {
  script = concreteScript(script); // une seule écriture par phrase
  const ws = script === 'caps' ? 'caps' : script;
  const line = el('span', { class: `sentence script-${ws}` });
  words.forEach((w, i) => {
    let node;
    if (i === 0 && script !== 'caps') {
      // Majuscule en début de phrase : on garde la couleur du premier graphème.
      node = renderWord(w, { script: ws, colors, size: 'md' });
      const first = node.querySelector('.g');
      if (first) first.textContent = first.textContent.charAt(0).toLocaleUpperCase('fr-FR') + first.textContent.slice(1);
    } else {
      node = renderWord(w, { script: ws, colors, size: 'md' });
    }
    line.append(node);
  });
  line.append(el('span', { class: 'punct' }, punct));
  return line;
}

// Réduit la taille des mots trop longs pour qu'ils tiennent dans leur conteneur
// et dans l'écran (ex. HIPPOPOTAME sur un téléphone). Sans effet sur les mots qui tiennent.
export function fitWords(root) {
  for (const w of root.querySelectorAll('.word')) {
    w.style.fontSize = '';
    const box = w.parentElement;
    const r = w.getBoundingClientRect();
    if (!r.width) continue;
    const cs = box ? getComputedStyle(box) : null;
    const inner = box && cs.display !== 'inline' && cs.display !== 'inline-flex'
      ? box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : Infinity;
    const limit = Math.min(inner > 0 ? inner : Infinity, window.innerWidth - 24);
    const overflowRight = r.right - (window.innerWidth - 8);
    const needed = Math.max(r.width - limit, overflowRight, 8 - r.left);
    if (needed > 0.5) {
      const size = parseFloat(getComputedStyle(w).fontSize);
      const ratio = Math.max(0.35, (r.width - needed) / r.width);
      w.style.fontSize = Math.floor(size * ratio) + 'px';
    }
  }
}
