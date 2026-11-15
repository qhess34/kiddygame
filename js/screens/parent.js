// Espace parent : accès protégé par un code, tableau de bord, réglages, bibliothèque de mots.
import { el, renderWord } from '../core/render.js';
import { parseGraphemes, buildWord, VOWEL_LETTERS } from '../core/words.js';
import { allWords, isWordActive, invalidate } from '../core/library.js';
import {
  getState, update, resetProgress, exportJSON, importJSON, isUnlocked, levelData, STICKERS, MEDALS,
} from '../core/state.js';
import { showBreak } from '../core/breaks.js';
import { speak, stopSpeaking, frenchVoices, hasSpeech } from '../core/audio.js';
import { LEVELS, STARS_TO_UNLOCK } from '../data/levels.js';
import { GRAPHEMES } from '../data/graphemes.js';

const AVATARS = ['🦊', '🐻', '🐰', '🐱', '🐶', '🦁', '🐼', '🐸', '🦄', '🐯', '🐨', '🐵'];
const GAME_NAMES = {
  match: 'Je relie', build: 'Je construis', syllables: 'Les syllabes', mystery: 'Mot mystère',
  listen: 'J’écoute', cases: 'Capitales et minuscules', sentences: 'Les phrases',
};
const MIN_ACTIVE_WORDS = 6;

// ===========================================================================
// Aides pures : proposition de segmentation d'un mot (exportées pour les tests)
// ===========================================================================
const VOWELS = VOWEL_LETTERS;
const isVowelCh = (c) => !!c && VOWELS.includes(c);

// [motif, nasale ?] — du plus long au plus court.
const PATTERNS = [
  ['eau', false], ['ain', 'n'], ['ein', 'n'], ['ill', false],
  ['ch', false], ['ou', false], ['on', 'nm'], ['an', 'nm'], ['en', 'nm'], ['am', 'nm'], ['em', 'nm'],
  ['in', 'nm'], ['im', 'nm'], ['ai', false], ['ei', false], ['au', false], ['oi', false], ['eu', false],
  ['œu', false], ['gn', false], ['ph', false], ['qu', false], ['gu', 'gu'],
];
const NASALS = new Set(['on', 'an', 'en', 'am', 'em', 'in', 'im', 'ain', 'ein']);

/** Propose une segmentation en graphèmes (notation d'auteur : « b a t eau »). */
export function suggestGraphemes(word) {
  const w = (word || '').trim().toLocaleLowerCase('fr-FR');
  if (!w) return '';
  const chars = [...w];
  const toks = [];
  let i = 0;
  while (i < chars.length) {
    let done = false;
    for (const len of [3, 2]) {
      if (i + len > chars.length) continue;
      const s = chars.slice(i, i + len).join('');
      const pat = PATTERNS.find((p) => p[0] === s);
      if (!pat) continue;
      const next = chars[i + len];
      if (pat[1] === 'nm' && (isVowelCh(next) || next === 'n' || next === 'm')) continue;
      if (pat[1] === 'n' && (isVowelCh(next) || next === 'n')) continue;
      if (pat[1] === 'gu' && !'eiyéèê'.includes(next || '#')) continue;
      // er / ez finaux : traités plus bas
      toks.push({ t: s, nasal: NASALS.has(s) });
      i += len;
      done = true;
      break;
    }
    if (done) continue;
    // er / ez en fin de mot (mots d'au moins 4 / 3 lettres) : é
    const rest = chars.slice(i).join('');
    if ((rest === 'er' && chars.length >= 4) || (rest === 'ez' && chars.length >= 3)) {
      toks.push({ t: rest, nasal: false });
      break;
    }
    toks.push({ t: chars[i], nasal: false });
    i += 1;
  }
  // Lettres muettes finales
  const n = toks.length;
  if (n >= 2) {
    const last = toks[n - 1];
    const prev = toks[n - 2];
    if (last.t === 'e' && chars.length >= 3) last.mute = true;
    else if ('stdx'.includes(last.t) && last.t.length === 1) {
      const pt = prev.t;
      if (prev.nasal || isVowelCh(pt[pt.length - 1])) last.mute = true;
    }
  }
  return toks.map((x) => (x.mute ? x.t + '_' : x.t)).join(' ');
}

const CLUSTER_2 = /^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|tr|vr)$/;
const CONSONANT_DIGRAPHS = new Set(['ch', 'gn', 'ph', 'qu', 'gu', 'ill']);

/** Propose une coupe en syllabes écrites (« ba-teau ») — heuristique VC-CV. */
export function suggestSyllables(word, gStr) {
  const w = (word || '').trim().toLocaleLowerCase('fr-FR');
  if (!w) return '';
  let toks = null;
  try {
    const p = parseGraphemes(gStr || '');
    if (p.map((g) => g.t).join('') === w) toks = p;
  } catch (e) { /* */ }
  if (!toks) toks = parseGraphemes(suggestGraphemes(w) || w);
  const last = toks.length - 1;
  const isNucleus = (g, idx) => {
    if (g.k === 'v') return true;
    if (g.k === 'd') return !CONSONANT_DIGRAPHS.has(g.t) && [...g.t].some(isVowelCh);
    if (g.k === 'm') {
      // e muet final après une consonne = dernière syllabe écrite (lu-ne)
      return idx === last && g.t === 'e' && idx > 0 && toks[idx - 1].k !== 'v' && !(toks[idx - 1].k === 'd' && [...toks[idx - 1].t].some(isVowelCh) && !CONSONANT_DIGRAPHS.has(toks[idx - 1].t));
    }
    return false;
  };
  const nuclei = [];
  toks.forEach((g, i) => { if (isNucleus(g, i)) nuclei.push(i); });
  const starts = new Set();
  for (let k = 0; k + 1 < nuclei.length; k++) {
    const a = nuclei[k];
    const b = nuclei[k + 1];
    const c = b - a - 1;
    if (c === 0) starts.add(b);
    else if (c === 1) starts.add(a + 1);
    else {
      const pair = toks[b - 2].t + toks[b - 1].t;
      if (CLUSTER_2.test(pair) && toks[b - 2].k === 'c' && toks[b - 1].k === 'c') starts.add(b - 2);
      else starts.add(a + 2);
    }
  }
  const out = [];
  let cur = '';
  toks.forEach((g, i) => {
    if (starts.has(i) && cur) { out.push(cur); cur = ''; }
    cur += g.t;
  });
  if (cur) out.push(cur);
  return out.join('-');
}

// ===========================================================================
// Infrastructure d'écran
// ===========================================================================
let exitCb = null;
let keyHandler = null;
const appEl = () => document.getElementById('app');

function setKeys(fn) {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = fn || null;
  if (keyHandler) document.addEventListener('keydown', keyHandler);
}

function mount(node, onKey) {
  const app = appEl();
  app.innerHTML = '';
  app.append(node);
  setKeys(onKey);
}

function leave() {
  setKeys(null);
  stopSpeaking();
  const cb = exitCb;
  exitCb = null;
  if (cb) cb();
}

function toast(msg, kind = '') {
  const old = document.querySelector('.pr-toast');
  if (old) old.remove();
  const t = el('div', { class: `pr-toast ${kind}`, role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3200);
}

function modal({ title, text, okLabel = 'OK', cancelLabel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    const close = (v) => { back.remove(); resolve(v); };
    const back = el('div', { class: 'pr-modal-back' },
      el('div', { class: 'pr-modal', role: 'dialog', 'aria-modal': 'true' },
        el('h3', {}, title),
        el('p', {}, text),
        el('div', { class: 'pr-modal-actions' },
          el('button', { class: 'pr-btn', 'data-act': 'cancel', onclick: () => close(false) }, cancelLabel),
          el('button', { class: `pr-btn ${danger ? 'danger' : 'primary'}`, 'data-act': 'ok', onclick: () => close(true) }, okLabel),
        )));
    document.body.append(back);
  });
}

// ===========================================================================
// Accès : code parent
// ===========================================================================
export function openParentGate({ onExit } = {}) {
  exitCb = onExit || null;
  const pin = String(getState().settings.pin || '');
  if (!/^\d{4}$/.test(pin)) {
    showCodeCreate({
      title: 'Créez un code parent à 4 chiffres',
      sub: 'Ce code empêche l’accès à cet espace. Notez-le bien.',
      onDone: () => showDashboard('progress'),
      onCancel: leave,
    });
  } else {
    showCodeEnter();
  }
}

function keypad(onKey) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'clear'];
  return el('div', { class: 'pr-pad', role: 'group', 'aria-label': 'Pavé numérique' }, keys.map((k) => el('button', {
    class: `pr-key ${k.length > 1 ? 'fn' : ''}`, 'data-key': k, 'aria-label': k === 'back' ? 'Effacer le dernier chiffre' : k === 'clear' ? 'Tout effacer' : k,
    onclick: () => onKey(k),
  }, k === 'back' ? '⌫' : k === 'clear' ? 'C' : k)));
}

// Construit l'écran de saisie d'un code (n chiffres). onValue(value) appelé quand plein.
function gateFrame({ title, sub, maxLen = 4, onValue, onCancel, extra, submitLabel }) {
  let value = '';
  const dots = el('div', { class: 'pr-dots', 'aria-live': 'polite' });
  const msg = el('div', { class: 'pr-gate-msg', role: 'alert' });
  const submit = submitLabel ? el('button', { class: 'pr-btn primary pr-gate-submit', onclick: () => { if (value) onValue(value, api); } }, submitLabel) : null;
  function draw() {
    dots.innerHTML = '';
    if (submit) {
      dots.classList.add('number');
      dots.textContent = value || ' ';
    } else {
      for (let i = 0; i < maxLen; i++) dots.append(el('span', { class: 'pr-dot' + (i < value.length ? ' on' : '') }));
    }
  }
  const api = {
    error(text) {
      msg.textContent = text;
      dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
      value = ''; draw();
    },
    info(text) { msg.textContent = text; },
    reset() { value = ''; draw(); },
  };
  function press(k) {
    msg.textContent = '';
    if (k === 'back') value = value.slice(0, -1);
    else if (k === 'clear') value = '';
    else if (/^\d$/.test(k) && value.length < maxLen) value += k;
    draw();
    if (!submit && value.length === maxLen) {
      const v = value;
      setTimeout(() => onValue(v, api), 160);
    }
  }
  draw();
  const node = el('div', { class: 'pr pr-gate' },
    el('button', { class: 'pr-close', 'aria-label': 'Fermer et revenir au jeu', onclick: onCancel }, '✖'),
    el('div', { class: 'pr-gate-card' },
      el('div', { class: 'pr-gate-lock' }, '🔒'),
      el('h1', {}, title),
      sub ? el('p', { class: 'pr-gate-sub' }, sub) : null,
      dots, msg,
      keypad(press),
      submit,
      extra,
    ));
  const onKey = (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('back');
    else if (e.key === 'Enter' && submit && value) onValue(value, api);
    else if (e.key === 'Escape') onCancel();
  };
  mount(node, onKey);
  return api;
}

function showCodeCreate({ title, sub, onDone, onCancel }) {
  let first = null;
  let ui;
  const step1 = () => {
    first = null;
    ui = gateFrame({ title, sub, onCancel, onValue: (v) => { first = v; step2(); } });
  };
  const step2 = () => {
    ui = gateFrame({
      title: 'Confirmez le code', sub: 'Saisissez-le une seconde fois.', onCancel,
      onValue: (v, api) => {
        if (v !== first) { api.error('Les deux codes ne sont pas identiques. On recommence.'); setTimeout(step1, 1100); return; }
        update((s) => { s.settings.pin = v; });
        onDone();
      },
    });
  };
  step1();
}

function showCodeEnter() {
  gateFrame({
    title: 'Espace parent', sub: 'Saisissez votre code à 4 chiffres.', onCancel: leave,
    onValue: (v, api) => {
      if (v === String(getState().settings.pin)) showDashboard('progress');
      else api.error('Ce n’est pas le bon code. Réessayez.');
    },
    extra: el('button', { class: 'pr-link', onclick: showForgot }, 'Code oublié ?'),
  });
}

function showForgot() {
  const a = 6 + Math.floor(Math.random() * 4);
  const b = 6 + Math.floor(Math.random() * 4);
  gateFrame({
    title: `${a} × ${b} = ?`, sub: 'Question pour adultes : répondez pour redéfinir le code.',
    maxLen: 3, submitLabel: 'Valider', onCancel: showCodeEnter,
    onValue: (v, api) => {
      if (Number(v) === a * b) {
        showCodeCreate({
          title: 'Choisissez un nouveau code', sub: 'Code parent à 4 chiffres.',
          onDone: () => showDashboard('progress'), onCancel: showCodeEnter,
        });
      } else api.error('Ce n’est pas la bonne réponse. Essayez encore.');
    },
  });
}

// ===========================================================================
// Tableau de bord
// ===========================================================================
const TABS = [
  ['progress', '📈 Progression'],
  ['words-done', '📖 Mots travaillés'],
  ['graphemes', '🔤 Graphèmes'],
  ['settings', '⚙️ Réglages'],
  ['library', '📚 Mots'],
  ['data', '💾 Données'],
];

let currentTab = 'progress';

function showDashboard(tab = currentTab) {
  currentTab = tab;
  const body = el('div', { class: 'pr-body' });
  const tabsBar = el('nav', { class: 'pr-tabs', role: 'tablist' }, TABS.map(([id, label]) => el('button', {
    class: 'pr-tab' + (id === tab ? ' active' : ''), role: 'tab', 'aria-selected': id === tab ? 'true' : 'false', 'data-tab': id,
    onclick: () => showDashboard(id),
  }, label)));
  const root = el('div', { class: 'pr pr-dash' },
    el('header', { class: 'pr-head' },
      el('h1', {}, '🔒 Espace parent'),
      el('button', { class: 'pr-btn primary pr-back', 'data-act': 'back-to-game', onclick: leave }, '🎮 Retour au jeu'),
    ),
    tabsBar,
    body);
  mount(root, (e) => { if (e.key === 'Escape' && !document.querySelector('.pr-modal-back')) leave(); });
  const rerender = () => {
    const y = body.scrollTop;
    body.innerHTML = '';
    RENDERERS[tab](body, rerender);
    body.scrollTop = y;
  };
  RENDERERS[tab](body, rerender);
  body.scrollTop = 0;
}

const section = (title, ...children) => el('section', { class: 'pr-card' }, title ? el('h2', {}, title) : null, ...children);
const hint = (t) => el('p', { class: 'pr-hint' }, t);
const levelName = (n) => `Niveau ${n} · ${LEVELS[n - 1].world}`;

function segmented(options, value, onPick, name) {
  return el('div', { class: 'pr-seg', role: 'radiogroup', 'data-name': name || null }, options.map(([v, label, sub]) => el('button', {
    class: 'pr-seg-btn' + (String(v) === String(value) ? ' on' : ''), role: 'radio', 'aria-checked': String(v) === String(value) ? 'true' : 'false', 'data-value': v,
    onclick: () => onPick(v),
  }, el('span', {}, label), sub ? el('small', {}, sub) : null)));
}

function switchRow(label, desc, checked, onChange, name) {
  const btn = el('button', {
    class: 'pr-switch' + (checked ? ' on' : ''), role: 'switch', 'aria-checked': checked ? 'true' : 'false', 'aria-label': label, 'data-name': name || null,
    onclick: () => onChange(!checked),
  }, el('span', { class: 'pr-knob' }));
  return el('div', { class: 'pr-row' }, el('div', { class: 'pr-row-text' }, el('strong', {}, label), desc ? el('small', {}, desc) : null), btn);
}

function wordStatus(s) {
  const tot = s.ok + s.err;
  if (!tot) return { id: 'new', label: 'pas encore vu' };
  const rate = s.err / tot;
  if (s.err >= 1 && rate >= 0.4) return { id: 'review', label: 'à revoir' };
  if (s.ok >= 4 && rate <= 0.2) return { id: 'solid', label: 'bien installé' };
  return { id: 'learning', label: 'en découverte' };
}

function graphemeStatus(s) {
  if (!s || s.ok + s.err === 0) return { id: 'new', label: 'pas encore vu' };
  const tot = s.ok + s.err;
  if (s.err >= s.ok && s.err >= 2) return { id: 'review', label: 'à revoir' };
  if (s.ok >= 5 && s.ok / tot >= 0.8) return { id: 'solid', label: 'bien installé' };
  return { id: 'learning', label: 'en découverte' };
}

const RENDERERS = {
  progress: renderProgress,
  'words-done': renderWordsDone,
  graphemes: renderGraphemes,
  settings: renderSettings,
  library: renderLibrary,
  data: renderData,
};

// ---------------------------------------------------------------------------
// Progression
// ---------------------------------------------------------------------------
function renderProgress(body, rerender) {
  const st = getState();
  const nameInput = el('input', {
    class: 'pr-input', type: 'text', maxlength: '16', value: st.child.name, placeholder: 'Prénom', 'aria-label': 'Prénom de l’enfant', autocomplete: 'off',
    onchange: (e) => update((s) => { s.child.name = e.target.value.trim().slice(0, 16); }),
  });
  nameInput.addEventListener('input', (e) => update((s) => { s.child.name = e.target.value.trim().slice(0, 16); }));
  const avatars = el('div', { class: 'pr-avatars' }, AVATARS.map((a) => el('button', {
    class: 'pr-avatar' + (a === st.child.avatar ? ' on' : ''), 'aria-label': 'Avatar ' + a,
    onclick: () => { update((s) => { s.child.avatar = a; }); rerender(); },
  }, a)));
  body.append(section('Votre enfant',
    el('div', { class: 'pr-profile' },
      el('div', { class: 'pr-profile-av' }, st.child.avatar),
      el('label', { class: 'pr-field' }, 'Prénom', nameInput),
      el('div', { class: 'pr-bigstat' }, el('b', {}, '⭐ ' + st.progress.totalStars), el('small', {}, 'étoiles gagnées'))),
    avatars));

  const grid = el('div', { class: 'pr-levels' });
  LEVELS.forEach((L) => {
    const ld = levelData(L.n);
    const open = isUnlocked(L.n);
    const pct = Math.min(100, Math.round((ld.stars / STARS_TO_UNLOCK) * 100));
    const rounds = Object.entries(ld.rounds || {}).filter(([, n]) => n > 0);
    grid.append(el('div', { class: 'pr-level' + (st.progress.currentLevel === L.n ? ' current' : ''), style: { '--c': L.color } },
      el('div', { class: 'pr-level-top' }, el('span', { class: 'pr-level-emoji' }, L.emoji),
        el('div', {}, el('strong', {}, `${L.n}. ${L.world}`), el('small', {}, open ? 'Monde ouvert' : 'Pas encore ouvert'))),
      el('div', { class: 'pr-bar' }, el('span', { style: { width: pct + '%' } })),
      el('div', { class: 'pr-level-stars' }, `⭐ ${ld.stars}`, el('small', {}, ` / ${STARS_TO_UNLOCK} pour ouvrir la suite`)),
      el('div', { class: 'pr-level-rounds' }, rounds.length
        ? rounds.map(([g, n]) => el('span', { class: 'pr-chip' }, `${GAME_NAMES[g] || g} · ${n} manche${n > 1 ? 's' : ''}`))
        : el('small', {}, 'Aucune manche jouée pour l’instant'))));
  });
  body.append(section('Les mondes', grid));

  const days = Object.entries(st.stats.days || {}).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 10);
  const maxDay = Math.max(1, ...days.map((d) => d[1]));
  body.append(section('Jours de jeu récents',
    days.length
      ? el('div', { class: 'pr-days' }, days.map(([d, n]) => el('div', { class: 'pr-day' },
        el('span', { class: 'pr-day-date' }, new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })),
        el('div', { class: 'pr-bar thin' }, el('span', { style: { width: Math.round((n / maxDay) * 100) + '%' } })),
        el('span', { class: 'pr-day-n' }, `${n} manche${n > 1 ? 's' : ''}`))))
      : hint('Pas encore de partie. Les jours de jeu apparaîtront ici.')));

  body.append(section('Médailles et surprises',
    el('div', { class: 'pr-medals' }, MEDALS.map((m) => {
      const own = st.progress.medals.includes(m.id);
      return el('div', { class: 'pr-medal' + (own ? ' own' : '') }, el('span', {}, own ? m.icon : '⚪'), el('small', {}, m.label));
    })),
    el('div', { class: 'pr-stickers' }, STICKERS.map((s) => el('span', { class: 'pr-sticker' + (st.progress.stickers.includes(s) ? ' own' : '') }, st.progress.stickers.includes(s) ? s : '❔'))),
    hint(`${st.progress.stickers.length} surprise${st.progress.stickers.length > 1 ? 's' : ''} sur ${STICKERS.length}.`)));
}

// ---------------------------------------------------------------------------
// Mots travaillés
// ---------------------------------------------------------------------------
let wordsFilter = 0;

function levelChips(current, onPick, withAll = true) {
  const opts = (withAll ? [[0, 'Tous']] : []).concat(LEVELS.map((L) => [L.n, `Niv. ${L.n}`]));
  return el('div', { class: 'pr-chips', role: 'group', 'aria-label': 'Filtrer par niveau' }, opts.map(([v, label]) => el('button', {
    class: 'pr-chipbtn' + (v === current ? ' on' : ''), 'data-level': v, onclick: () => onPick(v),
  }, label)));
}

function renderWordsDone(body, rerender) {
  const st = getState();
  const byId = new Map(allWords().map((w) => [w.id, w]));
  let rows = Object.entries(st.stats.words || {})
    .map(([id, s]) => ({ w: byId.get(id), s, st: wordStatus(s) }))
    .filter((r) => r.w);
  const order = { review: 0, learning: 1, new: 2, solid: 3 };
  const rate = (r) => (r.s.ok + r.s.err ? r.s.err / (r.s.ok + r.s.err) : 0);
  rows.sort((a, b) => order[a.st.id] - order[b.st.id] || rate(b) - rate(a) || b.s.err - a.s.err);
  const total = rows.length;
  if (wordsFilter) rows = rows.filter((r) => r.w.level === wordsFilter);
  const toReview = rows.filter((r) => r.st.id === 'review').length;
  body.append(section('Mots travaillés',
    hint('Les mots à revoir sont en premier : le jeu les proposera plus souvent. Ce n’est pas une évaluation, juste un repère pour accompagner votre enfant.'),
    levelChips(wordsFilter, (v) => { wordsFilter = v; rerender(); })));
  if (!rows.length) {
    body.append(section('', hint(total ? 'Aucun mot de ce niveau pour l’instant.' : 'Pas encore de mot travaillé. Dès que votre enfant jouera, ils apparaîtront ici.')));
    return;
  }
  const list = el('div', { class: 'pr-list' });
  rows.forEach((r) => {
    list.append(el('div', { class: 'pr-wrow', 'data-word': r.w.id },
      el('span', { class: 'pr-wimg' }, r.w.img),
      el('span', { class: 'pr-wword' }, renderWord(r.w, { script: 'caps', size: 'sm' })),
      el('span', { class: 'pr-wlvl' }, `Niv. ${r.w.level}`),
      el('span', { class: 'pr-wscore' }, `${r.s.ok} réussi${r.s.ok > 1 ? 's' : ''} sur ${r.s.ok + r.s.err}`),
      el('span', { class: `pr-badge ${r.st.id}` }, r.st.label)));
  });
  body.append(section(`${rows.length} mot${rows.length > 1 ? 's' : ''}${toReview ? ` · ${toReview} à revoir` : ''}`, list));
}

// ---------------------------------------------------------------------------
// Graphèmes (+ code couleur)
// ---------------------------------------------------------------------------
function colorGuide() {
  const lib = allWords();
  const make = (w, g) => lib.find((x) => x.text === w) || buildWord({ w, g, lvl: 1 });
  const examples = [make('chat', 'ch a t_'), make('moto', 'm o t o'), make('petit', 'p e t i t_'), make('chou', 'ch ou')];
  return section('Le code couleur',
    el('div', { class: 'pr-legend' },
      el('span', { class: 'pr-lg' }, el('b', { class: 'k-v' }, 'a'), ' voyelles : rouge'),
      el('span', { class: 'pr-lg' }, el('b', { class: 'k-c' }, 'm'), ' consonnes : bleu'),
      el('span', { class: 'pr-lg' }, el('b', { class: 'k-d' }, 'ch'), ' digrammes : vert'),
      el('span', { class: 'pr-lg' }, el('b', { class: 'k-m' }, 't'), ' lettres muettes : noir')),
    el('div', { class: 'pr-examples' }, examples.map((w) => el('span', { class: 'pr-ex' }, renderWord(w, { script: 'caps', size: 'md' })))),
    hint('Deux lettres qui font un seul son (CH, OU, EAU…) restent vertes et se lisent ensemble. Une lettre muette (le T de CHAT) s’écrit mais ne se prononce pas.'));
}

function activeCount(level) {
  const words = allWords().filter((w) => w.level === level);
  return { n: words.filter(isWordActive).length, total: words.length };
}

function renderGraphemes(body, rerender) {
  const st = getState();
  body.append(colorGuide());
  const disabled = new Set(st.settings.disabledGraphemes);
  const wrapper = section('Graphèmes par niveau',
    hint('Un graphème est une lettre ou un groupe de lettres qui fait un son. Désactivez ceux que votre enfant n’a pas encore vus : les mots qui les contiennent ne seront plus proposés.'));
  body.append(wrapper);
  LEVELS.forEach((L) => {
    const gs = GRAPHEMES.filter((g) => g.level === L.n);
    const { n, total } = activeCount(L.n);
    const low = n < MIN_ACTIVE_WORDS;
    const head = el('div', { class: 'pr-ghead' },
      el('strong', {}, levelName(L.n)),
      el('span', { class: 'pr-count' + (low ? ' low' : ''), 'data-level-count': L.n }, `${n} mot${n > 1 ? 's' : ''} actif${n > 1 ? 's' : ''} sur ${total}`));
    const block = el('div', { class: 'pr-gblock' }, head,
      low ? el('p', { class: 'pr-warn', role: 'alert' }, `⚠️ Moins de ${MIN_ACTIVE_WORDS} mots actifs : les manches de ce niveau risquent de se répéter.`) : null);
    if (!gs.length) block.append(hint('Aucun graphème nouveau dans ce niveau.'));
    const grid = el('div', { class: 'pr-ggrid' });
    gs.forEach((g) => {
      const stt = graphemeStatus(st.stats.graphemes[g.key]);
      const off = disabled.has(g.key);
      const stat = st.stats.graphemes[g.key];
      grid.append(el('div', { class: 'pr-g' + (off ? ' off' : ''), 'data-grapheme': g.key },
        el('div', { class: 'pr-g-top' },
          el('span', { class: `pr-g-sym k-${g.kind}` }, g.key.endsWith('_') ? g.key.slice(0, -1) : g.key),
          el('div', { class: 'pr-g-info' },
            g.kind === 'm' ? el('small', {}, 'muette') : null,
            g.example ? el('small', {}, `ex. ${g.example}`) : null)),
        el('span', { class: `pr-badge ${stt.id}` }, stt.label),
        stat ? el('small', { class: 'pr-g-stat' }, `${stat.ok} bien · ${stat.err} à revoir`) : null,
        el('button', {
          class: 'pr-switch' + (off ? '' : ' on'), role: 'switch', 'aria-checked': off ? 'false' : 'true', 'aria-label': `Activer ${g.label}`,
          'data-switch': g.key,
          onclick: () => {
            update((s) => {
              const arr = s.settings.disabledGraphemes;
              const i = arr.indexOf(g.key);
              if (i >= 0) arr.splice(i, 1); else arr.push(g.key);
            });
            rerender();
          },
        }, el('span', { class: 'pr-knob' }))));
    });
    block.append(grid);
    wrapper.append(block);
  });
}

// ---------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------
const SCRIPT_OPTS = [
  ['auto', 'Automatique', 'selon le niveau'],
  ['caps', 'Capitales', ''],
  ['bridge', 'Découverte des minuscules', 'avec rappel en capitales'],
  ['lower', 'Script', 'minuscules'],
  ['mixed', 'Mélange', ''],
];

function previewWord() {
  const lib = allWords();
  return lib.find((w) => w.text === 'chat') || lib.find((w) => w.text === 'moto') || lib[0]
    || buildWord({ w: 'chat', g: 'ch a t_', lvl: 3 });
}

function renderSettings(body, rerender) {
  const st = getState();
  const s = st.settings;
  const set = (fn) => { update((x) => fn(x.settings)); rerender(); };

  body.append(section('Niveau de jeu',
    hint('Choisissez le monde où votre enfant reprend la partie.'),
    segmented(LEVELS.map((L) => [L.n, `${L.n}`, L.emoji]), st.progress.currentLevel, (v) => { update((x) => { x.progress.currentLevel = Number(v); }); rerender(); }, 'level'),
    el('p', { class: 'pr-hint' }, levelName(st.progress.currentLevel)),
    switchRow('Débloquer tous les niveaux', 'Tous les mondes sont ouverts, sans attendre les étoiles.', !!s.unlockAll, (v) => set((x) => { x.unlockAll = v; }), 'unlockAll')));

  // Écriture
  const scriptNow = s.script || 'auto';
  const cur = st.progress.currentLevel;
  const concrete = scriptNow === 'auto' ? LEVELS[cur - 1].script : scriptNow;
  const pw = previewWord();
  const preview = el('div', { class: 'pr-preview', 'data-script': concrete, 'aria-label': 'Aperçu de l’écriture' },
    renderWord(pw, { script: concrete, colors: s.colors !== 'off', size: 'lg' }),
    el('span', { class: 'pr-wimg big' }, pw.img));
  body.append(section('Écriture',
    segmented(SCRIPT_OPTS, scriptNow, (v) => set((x) => { x.script = v; }), 'script'),
    scriptNow === 'auto'
      ? hint('Automatique : capitales aux niveaux 1 à 4, découverte des minuscules au niveau 5, script au niveau 6, mélange au niveau 7.')
      : hint('Cette écriture est utilisée à tous les niveaux.'),
    preview,
    hint(scriptNow === 'auto' ? `Aperçu pour le niveau ${cur}.` : 'Aperçu en direct.'),
    switchRow('Couleurs pédagogiques', 'Voyelles rouges, consonnes bleues, digrammes verts, lettres muettes noires.', s.colors !== 'off', (v) => set((x) => { x.colors = v ? 'on' : 'off'; }), 'colors')));

  // Jeux
  body.append(section('Jeux',
    el('div', { class: 'pr-setting' }, el('strong', {}, 'Mot mystère : variante sans couleurs'),
      segmented([['auto', 'Automatique'], ['on', 'Toujours'], ['off', 'Jamais']], s.mysteryColors, (v) => set((x) => { x.mysteryColors = v; }), 'mysteryColors'),
      hint('Automatique : le jeu propose parfois le mot sans couleurs, pour une lecture autonome. « Jamais » : toujours en couleurs.')),
    el('div', { class: 'pr-setting' }, el('strong', {}, 'Je construis'),
      segmented([['auto', 'Automatique'], ['letters', 'Lettres'], ['syllables', 'Syllabes']], s.buildMode, (v) => set((x) => { x.buildMode = v; }), 'buildMode')),
    el('div', { class: 'pr-setting' }, el('strong', {}, 'Éléments par manche'),
      segmented([[2, '2'], [3, '3'], [4, '4']], s.itemsPerRound, (v) => set((x) => { x.itemsPerRound = Number(v); }), 'itemsPerRound'))));

  // Pauses actives
  const breakOn = s.breakEnabled !== false;
  body.append(section('Pauses actives',
    switchRow('Proposer des pauses pour bouger', 'Après un temps de jeu, Lulu propose un petit exercice physique (sauter comme une grenouille, faire l’avion…). La pause arrive toujours à la fin d’une manche, jamais au milieu.', breakOn, (v) => set((x) => { x.breakEnabled = v; }), 'breakEnabled'),
    breakOn ? el('div', { class: 'pr-setting' }, el('strong', {}, 'Une pause toutes les'),
      segmented([[5, '5 min'], [10, '10 min'], [15, '15 min'], [20, '20 min'], [30, '30 min']], Number(s.breakMinutes) || 15, (v) => set((x) => { x.breakMinutes = Number(v); }), 'breakMinutes'),
      hint('Seul le temps passé à jouer est compté (pas quand l’application est fermée ou en arrière-plan).')) : null,
    el('button', { class: 'pr-btn', 'data-act': 'test-break', onclick: () => showBreak() }, '🤸 Essayer une pause maintenant')));

  // Voix
  const voices = frenchVoices();
  const sel = el('select', {
    class: 'pr-input', 'aria-label': 'Voix',
    onchange: (e) => update((x) => { x.settings.voiceName = e.target.value; }),
  }, el('option', { value: '' }, voices.length ? 'Voix automatique (la plus naturelle)' : 'Voix par défaut de l’appareil'),
  voices.map((v) => el('option', { value: v.name, selected: v.name === s.voiceName ? true : null }, `${v.name} (${v.lang})`)));
  const rateOut = el('output', { class: 'pr-rate' }, `${Math.round((s.voiceRate || 0.85) * 100)} %`);
  const rate = el('input', {
    class: 'pr-range', type: 'range', min: '0.6', max: '1.1', step: '0.05', value: String(s.voiceRate || 0.85), 'aria-label': 'Vitesse de la voix',
  });
  rate.addEventListener('input', () => {
    const v = Number(rate.value);
    rateOut.textContent = `${Math.round(v * 100)} %`;
    update((x) => { x.settings.voiceRate = v; });
  });
  body.append(section('Voix et sons',
    !hasSpeech() ? hint('La synthèse vocale n’est pas disponible sur cet appareil.') : null,
    el('label', { class: 'pr-field' }, 'Voix', sel),
    el('label', { class: 'pr-field' }, 'Vitesse de la voix', el('div', { class: 'pr-rate-row' }, el('span', {}, 'Lente'), rate, el('span', {}, 'Vive'), rateOut)),
    el('button', { class: 'pr-btn', 'data-act': 'test-voice', onclick: () => speak('Bonjour, on va lire ensemble !') }, '🔊 Tester la voix'),
    switchRow('Sons du jeu', 'Petits bruits de réussite et de touche.', !!s.sound, (v) => set((x) => { x.sound = v; }), 'sound'),
    switchRow('Consignes orales', 'La chouette lit la consigne à voix haute au début de chaque jeu.', !!s.speakInstructions, (v) => set((x) => { x.speakInstructions = v; }), 'speakInstructions')));
}

// ---------------------------------------------------------------------------
// Bibliothèque de mots
// ---------------------------------------------------------------------------
let libFilter = 0;
let addOpen = false;

function renderLibrary(body, rerender) {
  body.append(addWordForm(rerender));
  const st = getState();
  const hidden = new Set(st.settings.hiddenWords);
  const disabled = new Set(st.settings.disabledGraphemes);
  const lib = allWords();

  const customs = st.customWords || [];
  if (customs.length) {
    const list = el('div', { class: 'pr-list' });
    customs.forEach((raw, i) => {
      const w = buildWord({ ...raw, custom: true, id: 'custom:' + raw.w }, 0);
      list.append(el('div', { class: 'pr-wrow', 'data-custom': raw.w },
        el('span', { class: 'pr-wimg' }, raw.img),
        el('span', { class: 'pr-wword' }, renderWord(w, { script: 'lower', size: 'sm' })),
        el('span', { class: 'pr-wlvl' }, `Niv. ${raw.lvl}`),
        el('span', { class: 'pr-wsyl' }, (raw.s || raw.w)),
        el('button', {
          class: 'pr-btn danger small', 'data-act': 'delete-custom', 'aria-label': `Supprimer ${raw.w}`,
          onclick: async () => {
            if (!(await modal({ title: 'Supprimer ce mot ?', text: `« ${raw.w} » sera retiré de vos mots ajoutés.`, okLabel: 'Supprimer', danger: true }))) return;
            update((s) => {
              const idx = s.customWords.findIndex((c) => c.w === raw.w);
              if (idx >= 0) s.customWords.splice(idx, 1);
              s.settings.hiddenWords = s.settings.hiddenWords.filter((h) => h !== 'custom:' + raw.w);
            });
            invalidate();
            toast(`« ${raw.w} » supprimé.`);
            rerender();
          },
        }, '🗑 Supprimer')));
    });
    body.append(section(`Mots ajoutés (${customs.length})`, list));
  }

  body.append(section('Modifier les exercices',
    hint('Masquez un mot pour qu’il ne soit plus proposé dans les jeux ; vous pourrez le réafficher à tout moment.'),
    levelChips(libFilter, (v) => { libFilter = v; rerender(); })));

  LEVELS.forEach((L) => {
    if (libFilter && libFilter !== L.n) return;
    const words = lib.filter((w) => w.level === L.n);
    if (!words.length) return;
    const nHidden = words.filter((w) => hidden.has(w.id)).length;
    const list = el('div', { class: 'pr-list' });
    words.forEach((w) => {
      const isHidden = hidden.has(w.id);
      const byGrapheme = !isHidden && w.skills.some((k) => disabled.has(k));
      list.append(el('div', { class: 'pr-wrow' + (isHidden || byGrapheme ? ' off' : ''), 'data-word': w.id },
        el('span', { class: 'pr-wimg' }, w.img),
        el('span', { class: 'pr-wword' }, renderWord(w, { script: 'lower', size: 'sm' })),
        el('span', { class: 'pr-wsyl' }, w.syllables.join('-')),
        byGrapheme ? el('span', { class: 'pr-badge learning' }, 'graphème désactivé') : null,
        el('button', {
          class: 'pr-btn small' + (isHidden ? ' primary' : ''), 'data-act': 'toggle-hide', 'aria-pressed': isHidden ? 'true' : 'false',
          onclick: () => {
            update((s) => {
              const arr = s.settings.hiddenWords;
              const i = arr.indexOf(w.id);
              if (i >= 0) arr.splice(i, 1); else arr.push(w.id);
            });
            rerender();
          },
        }, isHidden ? '👁 Afficher' : '🙈 Masquer')));
    });
    body.append(section(`${levelName(L.n)} · ${words.length} mot${words.length > 1 ? 's' : ''}${nHidden ? ` (${nHidden} masqué${nHidden > 1 ? 's' : ''})` : ''}`, list));
  });
}

function addWordForm(rerender) {
  const state = { w: '', img: '', lvl: getState().progress.currentLevel || 1, g: '', s: '', gTouched: false, sTouched: false };
  const inW = el('input', { class: 'pr-input', id: 'aw-word', type: 'text', placeholder: 'ex. bateau', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Mot en minuscules' });
  const inImg = el('input', { class: 'pr-input emoji', id: 'aw-emoji', type: 'text', placeholder: '🚢', autocomplete: 'off', 'aria-label': 'Emoji' });
  const inLvl = el('select', { class: 'pr-input', id: 'aw-level', 'aria-label': 'Niveau' },
    LEVELS.map((L) => el('option', { value: L.n, selected: L.n === state.lvl ? true : null }, `${L.n} · ${L.world}`)));
  const inG = el('input', { class: 'pr-input mono', id: 'aw-graphemes', type: 'text', placeholder: 'b a t eau', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Graphèmes' });
  const inS = el('input', { class: 'pr-input mono', id: 'aw-syllables', type: 'text', placeholder: 'ba-teau', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Syllabes' });
  const prevBox = el('div', { class: 'pr-aw-preview', 'aria-live': 'polite' });
  const errBox = el('div', { class: 'pr-errors', role: 'alert' });
  const addBtn = el('button', { class: 'pr-btn primary', 'data-act': 'add-word', disabled: true }, '➕ Ajouter ce mot');

  function currentRaw() {
    const w = state.w.trim().toLocaleLowerCase('fr-FR');
    return { w, g: state.g.trim() || undefined, s: state.s.trim() || undefined, img: state.img.trim(), lvl: Number(state.lvl) };
  }
  function check() {
    const raw = currentRaw();
    prevBox.innerHTML = ''; errBox.innerHTML = '';
    const errs = [];
    if (!raw.w) { addBtn.disabled = true; prevBox.append(el('span', { class: 'pr-hint' }, 'L’aperçu du mot coloré apparaîtra ici.')); return; }
    if (!/^\p{L}+$/u.test(raw.w)) errs.push('Le mot ne doit contenir que des lettres.');
    let word = null;
    try {
      word = buildWord({ ...raw, id: 'custom:' + raw.w, custom: true });
      errs.push(...word.errors);
    } catch (e) { errs.push('Notation illisible : vérifiez les espaces entre graphèmes.'); }
    if (!raw.img) errs.push('Choisissez un emoji pour illustrer le mot.');
    if (allWords().some((x) => x.text === raw.w)) errs.push('Ce mot existe déjà dans la bibliothèque.');
    if (word) {
      prevBox.append(el('div', { class: 'pr-aw-word' }, renderWord(word, { script: 'lower', size: 'lg' }), renderWord(word, { script: 'caps', size: 'md' }), el('span', { class: 'pr-wimg big' }, raw.img || '❓')),
        el('div', { class: 'pr-aw-syl' }, 'Syllabes : ', renderWord(word, { script: 'lower', size: 'sm', syllables: true }), el('small', {}, ` (${word.syllables.join(' · ')})`)));
    }
    errs.forEach((e) => errBox.append(el('div', {}, '⚠️ ' + e)));
    addBtn.disabled = errs.length > 0;
  }
  function suggest(force = false) {
    const w = state.w.trim().toLocaleLowerCase('fr-FR');
    if (force || !state.gTouched) { state.g = suggestGraphemes(w); inG.value = state.g; }
    if (force || !state.sTouched) { state.s = suggestSyllables(w, state.g); inS.value = state.s; }
  }
  inW.addEventListener('input', () => { state.w = inW.value; suggest(); check(); });
  inImg.addEventListener('input', () => { state.img = inImg.value; check(); });
  inLvl.addEventListener('change', () => { state.lvl = inLvl.value; check(); });
  inG.addEventListener('input', () => {
    state.gTouched = true; state.g = inG.value;
    if (!state.sTouched) { state.s = suggestSyllables(state.w.trim().toLocaleLowerCase('fr-FR'), state.g); inS.value = state.s; }
    check();
  });
  inS.addEventListener('input', () => { state.sTouched = true; state.s = inS.value; check(); });
  addBtn.addEventListener('click', () => {
    const raw = currentRaw();
    const entry = { w: raw.w, g: raw.g || [...raw.w].join(' '), s: raw.s || raw.w, img: raw.img, lvl: raw.lvl };
    update((s) => { s.customWords.push(entry); });
    invalidate();
    toast(`« ${entry.w} » ajouté au niveau ${entry.lvl}.`, 'ok');
    addOpen = true;
    rerender();
  });

  check();
  const help = el('details', { class: 'pr-help' }, el('summary', {}, 'Comment écrire les graphèmes ?'),
    el('ul', {},
      el('li', {}, 'Séparez les graphèmes par des espaces : ', el('code', {}, 'ch a t_')),
      el('li', {}, 'Un groupe de lettres qui fait un seul son reste collé : ', el('code', {}, 'eau'), ', ', el('code', {}, 'ou'), ', ', el('code', {}, 'on'), '.'),
      el('li', {}, el('code', {}, '_'), ' à la fin = lettre muette : ', el('code', {}, 't_'), ', ', el('code', {}, 'e_'), '.'),
      el('li', {}, el('code', {}, ':v'), ' ou ', el('code', {}, ':c'), ' force la couleur (voyelle ou consonne), ex. ', el('code', {}, 'y:c'), '.'),
      el('li', {}, 'Syllabes : tirets entre les syllabes écrites, ex. ', el('code', {}, 'ba-teau'), '. Les lettres mises bout à bout doivent redonner exactement le mot.')));
  const details = el('details', { class: 'pr-card pr-add', open: addOpen ? true : null },
    el('summary', {}, '➕ Ajouter un mot'),
    el('div', { class: 'pr-aw-grid' },
      el('label', { class: 'pr-field' }, 'Mot (minuscules)', inW),
      el('label', { class: 'pr-field' }, 'Emoji', inImg),
      el('label', { class: 'pr-field' }, 'Niveau', inLvl),
      el('label', { class: 'pr-field wide' }, 'Graphèmes (proposition automatique, à corriger si besoin)', inG),
      el('label', { class: 'pr-field wide' }, 'Syllabes', inS)),
    el('div', { class: 'pr-aw-actions' },
      el('button', { class: 'pr-btn', onclick: () => { state.gTouched = false; state.sTouched = false; suggest(true); check(); } }, '✨ Proposer à nouveau'),
      addBtn),
    prevBox, errBox, help);
  return details;
}

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------
function renderData(body, rerender) {
  const fileInput = el('input', { type: 'file', accept: '.json,application/json', class: 'pr-hidden', 'aria-label': 'Fichier de sauvegarde' });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    let txt;
    try { txt = await f.text(); } catch (e) { toast('Impossible de lire ce fichier.', 'bad'); return; }
    let parsed;
    try { parsed = JSON.parse(txt); } catch (e) { toast('Ce fichier n’est pas une sauvegarde valide.', 'bad'); fileInput.value = ''; return; }
    if (!parsed || typeof parsed !== 'object' || (!parsed.child && !parsed.progress && !parsed.settings)) {
      toast('Ce fichier ne ressemble pas à une sauvegarde de l’application.', 'bad'); fileInput.value = ''; return;
    }
    const ok = await modal({ title: 'Importer cette sauvegarde ?', text: 'La progression et les réglages actuels seront remplacés par ceux du fichier.', okLabel: 'Importer' });
    if (ok) {
      try {
        importJSON(txt);
        invalidate();
        toast('Sauvegarde importée.', 'ok');
        showDashboard('data');
      } catch (e) { toast('L’import a échoué.', 'bad'); }
    }
    fileInput.value = '';
  });

  body.append(section('Sauvegarde',
    hint('La progression est enregistrée sur cet appareil. Exportez un fichier pour la conserver ou la transférer sur une autre tablette.'),
    el('div', { class: 'pr-actions' },
      el('button', {
        class: 'pr-btn primary', 'data-act': 'export',
        onclick: () => {
          const blob = new Blob([exportJSON()], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = el('a', { href: url, download: `lire-en-jouant-sauvegarde-${new Date().toISOString().slice(0, 10)}.json` });
          document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          toast('Sauvegarde exportée.', 'ok');
        },
      }, '⬇️ Exporter la sauvegarde'),
      el('button', { class: 'pr-btn', 'data-act': 'import', onclick: () => fileInput.click() }, '⬆️ Importer une sauvegarde'),
      fileInput)));

  body.append(section('Code parent',
    el('button', {
      class: 'pr-btn', 'data-act': 'change-pin',
      onclick: () => showCodeCreate({
        title: 'Choisissez un nouveau code', sub: 'Code parent à 4 chiffres.',
        onDone: () => { showDashboard('data'); toast('Code parent modifié.', 'ok'); }, onCancel: () => showDashboard('data'),
      }),
    }, '🔑 Changer le code parent')));

  body.append(section('Recommencer à zéro',
    hint('Efface les étoiles, les surprises et les statistiques. Le prénom, les réglages et les mots ajoutés sont conservés.'),
    el('button', {
      class: 'pr-btn danger', 'data-act': 'reset',
      onclick: async () => {
        const a = await modal({ title: 'Réinitialiser la progression ?', text: 'Toutes les étoiles, surprises et statistiques seront effacées.', okLabel: 'Continuer', danger: true });
        if (!a) return;
        const b = await modal({ title: 'Vraiment tout effacer ?', text: 'Cette action est définitive. Pensez à exporter une sauvegarde avant.', okLabel: 'Oui, réinitialiser', cancelLabel: 'Non, garder', danger: true });
        if (!b) return;
        resetProgress({ keepSettings: true });
        invalidate();
        toast('Progression réinitialisée.', 'ok');
        showDashboard('data');
      },
    }, '🧹 Réinitialiser la progression')));
}
