/**
 * Lignes d'ondes qui épousent un titre.
 *
 * Deux usages :
 *  - « survol » (lignes de l'accueil) : au survol ou au focus, les lignes
 *    arrivent depuis la gauche, se serrent contre le mot, puis repartent.
 *  - « page » (titres des pages intérieures, cartes Productions) : les
 *    lignes arrivent au chargement et restent ; elles vibrent localement
 *    au passage de la souris, comme des cordes.
 *
 * Principe : chaque lettre du titre est redessinée, à sa position exacte à
 * l'écran, dans un canvas caché. On en tire, colonne par colonne, le haut
 * et le bas des lettres ; chaque ligne est déformée pour passer au-dessus
 * ou au-dessous du mot sans jamais le traverser.
 */

const COLORS = ['#FF5C8A', '#FFB347', '#4FE3D2', '#8A94FF'];
const SX = 3; // pas horizontal (px)
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Mode = 'survol' | 'page';

type Field = {
  host: HTMLElement;
  title: HTMLElement | null;
  mode: Mode;
  lines: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  base: number[];
  hug: Float32Array[];
  fadeFrom: number;
  fadeTo: number;
  pull: number;
  reveal: number;
  alpha: number;
  target: number;
  // vibration locale (mode page)
  px: number;
  py: number;
  energy: number;
  raf: number;
  last: number;
  time: number;
  ready: boolean;
};

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Haut/bas des lettres par colonne (NaN = pas de lettre). */
function silhouette(f: Field, cols: number) {
  const top = new Float32Array(cols).fill(NaN);
  const bot = new Float32Array(cols).fill(NaN);
  if (!f.title) return { top, bot };

  const off = document.createElement('canvas');
  off.width = Math.ceil(f.w);
  off.height = Math.ceil(f.h);
  const c = off.getContext('2d', { willReadFrequently: true })!;
  const cs = getComputedStyle(f.title);
  c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  c.textBaseline = 'alphabetic';
  const m = c.measureText('Hg');
  const asc = m.fontBoundingBoxAscent;
  const desc = m.fontBoundingBoxDescent;
  const hostBox = f.host.getBoundingClientRect();

  // Chaque lettre à sa position réelle (gère les titres sur plusieurs lignes)
  const walker = document.createTreeWalker(f.title, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (/\s/.test(ch)) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getClientRects()[0];
      if (!r) continue;
      const baseline = r.top - hostBox.top + (r.height - (asc + desc)) / 2 + asc;
      c.fillText(ch, r.left - hostBox.left, baseline);
    }
  }

  const data = c.getImageData(0, 0, off.width, off.height).data;
  for (let i = 0; i < cols; i++) {
    const x = Math.min(off.width - 1, i * SX);
    for (let y = 0; y < off.height; y++) {
      if (data[(y * off.width + x) * 4 + 3] > 100) {
        if (Number.isNaN(top[i])) top[i] = y;
        bot[i] = y;
      }
    }
  }
  return { top, bot };
}

/** Lisse un contour en restant toujours à l'extérieur des lettres. */
function smoothOutside(v: Float32Array, r: number, upper: boolean) {
  const n = v.length;
  const ext = new Float32Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    let m = NaN;
    for (let k = -r; k <= r; k++) {
      const x = v[i + k];
      if (x === undefined || Number.isNaN(x)) continue;
      if (Number.isNaN(m) || (upper ? x < m : x > m)) m = x;
    }
    ext[i] = m;
  }
  const out = new Float32Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let cnt = 0;
    for (let k = -r; k <= r; k++) {
      const x = ext[i + k];
      if (x === undefined || Number.isNaN(x)) continue;
      sum += x;
      cnt++;
    }
    if (cnt) out[i] = sum / cnt;
  }
  return out;
}

function prepare(f: Field) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = f.host.getBoundingClientRect();
  f.w = r.width;
  f.h = r.height;
  f.canvas.width = Math.round(r.width * dpr);
  f.canvas.height = Math.round(r.height * dpr);
  f.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cols = Math.ceil(f.w / SX) + 1;
  const raw = silhouette(f, cols);
  // rayon de lissage : plus large en mode page pour des courbes amples
  const R = f.mode === 'page' ? 18 : 8;
  const top = smoothOutside(raw.top, R, true);
  const bot = smoothOutside(raw.bot, R, false);
  const H = f.h;
  const PAD = 5;
  const RAMP = 230;

  let first = -1;
  let last = -1;
  let mid = 0;
  let nm = 0;
  for (let i = 0; i < cols; i++) {
    if (Number.isNaN(raw.top[i])) continue;
    if (first < 0) first = i;
    last = i;
    mid += (raw.top[i] + raw.bot[i]) / 2;
    nm++;
  }
  mid = nm ? mid / nm : H / 2;

  if (f.mode === 'survol') {
    const tb = f.title!.getBoundingClientRect();
    f.fadeFrom = Math.min(f.w, tb.right - r.left + 80);
    f.fadeTo = Math.min(f.w, tb.right - r.left + 520);
  } else {
    f.fadeFrom = f.w * 0.8;
    f.fadeTo = f.w;
  }

  f.base = [];
  f.hug = [];
  for (let l = 0; l < f.lines; l++) {
    const y0 = (H * (l + 0.5)) / f.lines;
    const ys = new Float32Array(cols);
    for (let i = 0; i < cols; i++) {
      if (first < 0) {
        ys[i] = y0;
        continue;
      }
      let a: number;
      let b: number;
      let wgt = 1;
      if (i >= first && i <= last && !Number.isNaN(top[i])) {
        a = top[i];
        b = bot[i];
      } else if (i < first) {
        // à gauche du mot (marge) : les lignes restent collées jusqu'au bord
        a = top[first];
        b = bot[first];
      } else {
        const j = last;
        const d = Math.abs(i - j) * SX;
        const t = Math.max(0, 1 - d / RAMP);
        wgt = t * t * (3 - 2 * t);
        a = top[j];
        b = bot[j];
      }
      // au-dessus du milieu : entre le haut et le contour ; dessous : entre le contour et le bas
      const ym =
        y0 < mid
          ? 1 + (y0 / mid) * Math.max(0, a - PAD - 1)
          : b + PAD + ((y0 - mid) / (H - mid)) * Math.max(0, H - 1 - b - PAD);
      ys[i] = y0 + (ym - y0) * wgt;
    }
    f.base.push(y0);
    f.hug.push(ys);
  }
  f.ready = true;
}

function draw(f: Field) {
  const { ctx, w, h, base, hug, pull, reveal, alpha, time } = f;
  ctx.clearRect(0, 0, w, h);
  if (alpha <= 0.001) return;
  const ease = pull * pull * (3 - 2 * pull);
  const head = reveal * (f.fadeTo + 160);
  const calm = f.mode === 'page' ? 0.25 : 1; // ondulation de fond plus discrète en mode page
  ctx.lineWidth = f.mode === 'page' ? 1.1 : 1.2;
  ctx.globalAlpha = alpha;
  for (let l = 0; l < base.length; l++) {
    const g = ctx.createLinearGradient(0, 0, f.fadeTo, 0);
    const fr = f.fadeFrom / f.fadeTo;
    for (let k = 0; k <= 3; k++) g.addColorStop((k / 3) * fr, rgba(COLORS[(k + l) % 4], 1));
    g.addColorStop(1, rgba(COLORS[(3 + l) % 4], 0));
    ctx.strokeStyle = g;
    ctx.beginPath();
    const ys = hug[l];
    const y0 = base[l];
    for (let i = 0; i < ys.length; i++) {
      const x = i * SX;
      if (x > head || x > f.fadeTo) break;
      let y = y0 + (ys[i] - y0) * ease;
      y += Math.sin(x * 0.018 + time * 1.6 + l * 0.7) * 2.2 * calm * (1 - ease * 0.6);
      if (f.energy > 0.01) {
        // vibration locale autour du curseur
        const dx = (x - f.px) / 140;
        const dy = (y - f.py) / 70;
        y += f.energy * Math.exp(-dx * dx - dy * dy) * Math.sin(x * 0.07 - time * 9 + l * 0.9);
      }
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function animate(f: Field) {
  if (reduce) {
    f.pull = f.reveal = f.alpha = f.target;
    f.energy = 0;
    draw(f);
    return;
  }
  if (f.raf) return;
  const step = (t: number) => {
    const dt = f.last ? Math.min((t - f.last) / 1000, 0.05) : 0.016;
    f.last = t;
    f.time += dt;
    const k = f.target;
    if (k) f.reveal += (1 - f.reveal) * (1 - Math.exp(-dt * (f.mode === 'page' ? 2.2 : 3.2)));
    f.pull += (k - f.pull) * (1 - Math.exp(-dt * (k ? 3.5 : 5)));
    f.alpha += (k - f.alpha) * (1 - Math.exp(-dt * (k ? 8 : 6)));
    f.energy *= Math.exp(-dt * 2.5);
    draw(f);

    const gone = !k && f.alpha < 0.01;
    const settled = f.mode === 'page' && k && f.reveal > 0.995 && f.pull > 0.995 && f.energy < 0.02;
    if (gone || settled) {
      if (gone) f.reveal = f.alpha = f.pull = 0;
      if (settled) f.energy = 0;
      f.raf = f.last = 0;
      draw(f);
      return;
    }
    f.raf = requestAnimationFrame(step);
  };
  f.raf = requestAnimationFrame(step);
}

function create(host: HTMLElement, title: HTMLElement | null, mode: Mode, lines: number): Field {
  const canvas = document.createElement('canvas');
  canvas.className = 'lignes';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  return {
    host,
    title,
    mode,
    lines,
    canvas,
    ctx: canvas.getContext('2d')!,
    w: 0,
    h: 0,
    base: [],
    hug: [],
    fadeFrom: 0,
    fadeTo: 1,
    pull: 0,
    reveal: 0,
    alpha: 0,
    target: 0,
    px: -1e4,
    py: -1e4,
    energy: 0,
    raf: 0,
    last: 0,
    time: Math.random() * 10,
    ready: false,
  };
}

function watchResize(f: Field) {
  let w = 0;
  new ResizeObserver(() => {
    const nw = f.host.clientWidth;
    if (!f.ready || Math.abs(nw - w) < 1) return;
    w = nw;
    prepare(f);
    draw(f);
  }).observe(f.host);
}

/** Lignes de l'accueil : au survol ou au focus. */
function initSurvol() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll<HTMLElement>('[data-lignes="survol"]').forEach((host) => {
    const f = create(host, host.querySelector<HTMLElement>('[data-lignes-titre]'), 'survol', 16);
    const on = () => {
      if (!f.ready) prepare(f);
      f.target = 1;
      animate(f);
    };
    const off = () => {
      f.target = 0;
      animate(f);
    };
    host.addEventListener('pointerenter', on);
    host.addEventListener('pointerleave', off);
    host.addEventListener('focus', on);
    host.addEventListener('blur', off);
    watchResize(f);
  });
}

/** Titres de page et cartes : les lignes arrivent quand le bloc est visible. */
function initPage() {
  const fine = window.matchMedia('(pointer: fine)').matches;
  document.querySelectorAll<HTMLElement>('[data-lignes="page"]').forEach((host) => {
    const lines = Number(host.dataset.lignesNombre ?? 18);
    const f = create(host, host.querySelector<HTMLElement>('[data-lignes-titre]'), 'page', lines);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      prepare(f);
      f.target = 1;
      animate(f);
    });
    io.observe(host);
    if (fine) {
      let lx = 0;
      let ly = 0;
      host.addEventListener('pointermove', (e) => {
        if (!f.ready || reduce) return;
        const r = host.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const v = Math.hypot(x - lx, y - ly);
        lx = x;
        ly = y;
        f.px = x;
        f.py = y;
        f.energy = Math.min(9, f.energy + v * 0.06);
        animate(f);
      });
    }
    watchResize(f);
  });
}

document.fonts.ready.then(() => {
  initSurvol();
  initPage();
});
