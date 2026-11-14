// Animations : confettis, étoiles, mascotte qui parle.
import { el } from './render.js';
import { speak, sfx } from './audio.js';

// ---- Mascotte : Lulu la chouette ------------------------------------------
export function mascotSVG(mood = 'happy') {
  const mouth = mood === 'wow'
    ? '<ellipse cx="60" cy="74" rx="6" ry="7" fill="#e8743b"/>'
    : '<path d="M52 70 L60 80 L68 70 Z" fill="#f2a03d" stroke="#d9822b" stroke-width="2" stroke-linejoin="round"/>';
  return `
<svg viewBox="0 0 120 130" class="mascot-svg" aria-hidden="true">
  <ellipse cx="60" cy="124" rx="34" ry="5" fill="rgba(0,0,0,.12)"/>
  <path d="M24 40 L30 14 L46 32 Z" fill="#8a5a3c"/>
  <path d="M96 40 L90 14 L74 32 Z" fill="#8a5a3c"/>
  <ellipse cx="60" cy="72" rx="42" ry="50" fill="#b07a52"/>
  <ellipse cx="60" cy="88" rx="28" ry="32" fill="#f3dcc0"/>
  <path d="M44 86 q4 4 8 0 M56 94 q4 4 8 0 M68 86 q4 4 8 0 M50 104 q4 4 8 0 M62 104 q4 4 8 0" stroke="#d9b48f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="20" cy="80" rx="9" ry="22" fill="#8a5a3c" class="wing wing-l"/>
  <ellipse cx="100" cy="80" rx="9" ry="22" fill="#8a5a3c" class="wing wing-r"/>
  <circle cx="42" cy="52" r="17" fill="#fff"/>
  <circle cx="78" cy="52" r="17" fill="#fff"/>
  <g class="eyes">
    <circle cx="44" cy="54" r="8" fill="#2b2b3a"/>
    <circle cx="80" cy="54" r="8" fill="#2b2b3a"/>
    <circle cx="47" cy="51" r="3" fill="#fff"/>
    <circle cx="83" cy="51" r="3" fill="#fff"/>
  </g>
  <circle cx="30" cy="66" r="5" fill="#ff9aa8" opacity=".7"/>
  <circle cx="90" cy="66" r="5" fill="#ff9aa8" opacity=".7"/>
  ${mouth}
  <path d="M46 120 l-4 6 M52 121 l0 7 M58 120 l4 6" stroke="#f2a03d" stroke-width="3" stroke-linecap="round" transform="translate(-6 -4)"/>
  <path d="M70 120 l-4 6 M76 121 l0 7 M82 120 l4 6" stroke="#f2a03d" stroke-width="3" stroke-linecap="round" transform="translate(-6 -4)"/>
</svg>`;
}

// Bulle de la mascotte (en bas de l'écran). Parle aussi à voix haute si say=true.
let bubbleTimer = null;
export function mascotSay(text, { say = true, mood = 'happy', duration = 2600 } = {}) {
  let box = document.getElementById('mascot-pop');
  if (!box) {
    box = el('div', { id: 'mascot-pop', class: 'mascot-pop', 'aria-live': 'polite' });
    document.body.append(box);
  }
  box.innerHTML = `<div class="mascot-pop-owl">${mascotSVG(mood)}</div><div class="mascot-pop-bubble"></div>`;
  box.querySelector('.mascot-pop-bubble').textContent = text;
  box.classList.remove('show');
  void box.offsetWidth;
  box.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => box.classList.remove('show'), duration);
  if (say) return speak(text);
  return Promise.resolve();
}

// ---- Confettis -------------------------------------------------------------
export function confetti({ count = 140, duration = 2600 } = {}) {
  const canvas = el('canvas', { class: 'confetti-canvas' });
  document.body.append(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = (canvas.width = innerWidth * dpr);
  const H = (canvas.height = innerHeight * dpr);
  const c = canvas.getContext('2d');
  const colors = ['#e5383b', '#2f6fdb', '#2a9d3a', '#ffbe0b', '#ff7eb6', '#9b5de5'];
  const parts = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.45,
    vx: (Math.random() - 0.5) * 22 * dpr,
    vy: (-Math.random() * 20 - 8) * dpr,
    r: (5 + Math.random() * 6) * dpr,
    rot: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.3,
    col: colors[Math.floor(Math.random() * colors.length)],
    star: Math.random() < 0.25,
  }));
  const t0 = performance.now();
  function frame(t) {
    const el_ = t - t0;
    c.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.55 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col;
      c.globalAlpha = Math.max(0, 1 - el_ / duration);
      if (p.star) drawStar(c, p.r * 1.4); else c.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      c.restore();
    }
    if (el_ < duration) requestAnimationFrame(frame); else canvas.remove();
  }
  requestAnimationFrame(frame);
}

function drawStar(c, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r / 2.2 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath(); c.fill();
}

// Petites étoiles qui jaillissent d'un élément (bonne réponse).
export function sparkle(target) {
  if (!target) return;
  const r = target.getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const s = el('span', { class: 'sparkle' }, '⭐');
    const a = (Math.PI * 2 * i) / 8;
    s.style.left = r.left + r.width / 2 + 'px';
    s.style.top = r.top + r.height / 2 + 'px';
    s.style.setProperty('--dx', Math.cos(a) * 70 + 'px');
    s.style.setProperty('--dy', Math.sin(a) * 70 + 'px');
    document.body.append(s);
    setTimeout(() => s.remove(), 900);
  }
}

// Secoue doucement un élément (erreur, sans sanction).
export function wiggle(target) {
  if (!target) return;
  target.classList.remove('wiggle');
  void target.offsetWidth;
  target.classList.add('wiggle');
  setTimeout(() => target.classList.remove('wiggle'), 600);
}

export function bounce(target) {
  if (!target) return;
  target.classList.remove('bounce');
  void target.offsetWidth;
  target.classList.add('bounce');
  setTimeout(() => target.classList.remove('bounce'), 700);
}

export { sfx };
