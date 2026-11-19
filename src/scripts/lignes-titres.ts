/**
 * Accueil : au survol d'une grande ligne (À propos, Événements, Productions),
 * des lignes d'ondes colorées arrivent depuis la gauche et viennent épouser
 * la silhouette des lettres, comme un courant qui contourne un obstacle.
 *
 * Principe : on dessine le mot dans un canvas caché pour connaître, colonne
 * par colonne, le haut et le bas des lettres. Chaque ligne est ensuite
 * déformée pour passer juste au-dessus ou juste en dessous du mot.
 *
 * Ordinateurs uniquement (survol). Aucun effet sur écran tactile.
 */

const COLORS = ['#FF5C8A', '#FFB347', '#4FE3D2', '#8A94FF'];
const SX = 3; // pas horizontal (px)
const LINES = 16;

type Row = {
  el: HTMLElement;
  title: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  base: number[]; // hauteur de repos de chaque ligne
  hug: Float32Array[]; // tracé « collé aux lettres » de chaque ligne
  fadeFrom: number; // les lignes s'effacent après le mot
  fadeTo: number;
  pull: number; // 0 = droites, 1 = collées
  reveal: number; // 0 → 1 : progression de l'arrivée depuis la gauche
  alpha: number;
  target: number;
  raf: number;
  last: number;
  time: number;
};

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Haut/bas des lettres pour chaque colonne (null = pas de lettre). */
function silhouette(row: Row): { top: Float32Array; bot: Float32Array } {
  const { w, h, title, el } = row;
  const cols = Math.ceil(w / SX) + 1;
  const top = new Float32Array(cols).fill(NaN);
  const bot = new Float32Array(cols).fill(NaN);

  const cs = getComputedStyle(title);
  const box = title.getBoundingClientRect();
  const rbox = el.getBoundingClientRect();
  const off = document.createElement('canvas');
  off.width = Math.ceil(w);
  off.height = Math.ceil(h);
  const c = off.getContext('2d', { willReadFrequently: true })!;
  c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  if ('letterSpacing' in c) (c as unknown as { letterSpacing: string }).letterSpacing = cs.letterSpacing;
  c.textBaseline = 'alphabetic';
  const m = c.measureText(title.textContent ?? '');
  const ascent = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
  const descent = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
  const lineH = parseFloat(cs.lineHeight) || box.height;
  const baseline = box.top - rbox.top + (lineH - (ascent + descent)) / 2 + ascent;
  c.fillText(title.textContent ?? '', box.left - rbox.left, baseline);

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

/**
 * Lisse un contour en restant toujours à l'extérieur des lettres :
 * filtre min (ou max) puis moyenne sur le même rayon.
 */
function smoothOutside(v: Float32Array, r: number, upper: boolean): Float32Array {
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

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function prepare(row: Row) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = row.el.getBoundingClientRect();
  row.w = r.width;
  row.h = r.height;
  row.canvas.width = Math.round(r.width * dpr);
  row.canvas.height = Math.round(r.height * dpr);
  row.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const raw = silhouette(row);
  const cols = raw.top.length;
  const R = 8; // rayon de lissage, en colonnes (8 × 3 px)
  const top = smoothOutside(raw.top, R, true);
  const bot = smoothOutside(raw.bot, R, false);
  const PAD = 5; // distance minimale au contour
  const H = row.h;
  const tb = row.title.getBoundingClientRect();
  row.fadeFrom = Math.min(row.w, tb.right - r.left + 80);
  row.fadeTo = Math.min(row.w, tb.right - r.left + 520);

  // Hors du mot : on prolonge le contour le plus proche et on atténue
  // l'effet progressivement (rampe de RAMP px).
  const RAMP = 230;
  const near = new Int32Array(cols).fill(-1);
  let lastDef = -1;
  // (colonne de lettre réelle la plus proche : l'atténuation démarre au bord du mot)
  for (let i = 0; i < cols; i++) {
    if (!Number.isNaN(raw.top[i])) lastDef = i;
    near[i] = lastDef;
  }
  lastDef = -1;
  for (let i = cols - 1; i >= 0; i--) {
    if (!Number.isNaN(raw.top[i])) lastDef = i;
    if (lastDef >= 0 && (near[i] < 0 || lastDef - i < i - near[i])) near[i] = lastDef;
  }
  let first = -1;
  let last = -1;
  for (let i = 0; i < cols; i++) {
    if (Number.isNaN(raw.top[i])) continue;
    if (first < 0) first = i;
    last = i;
  }
  // milieu du mot (constant, pour qu'une ligne ne change jamais de côté)
  let mid = 0;
  let nm = 0;
  for (let i = 0; i < cols; i++) {
    if (!Number.isNaN(raw.top[i])) {
      mid += (raw.top[i] + raw.bot[i]) / 2;
      nm++;
    }
  }
  mid = nm ? mid / nm : H / 2;

  row.base = [];
  row.hug = [];
  for (let l = 0; l < LINES; l++) {
    const y0 = (H * (l + 0.5)) / LINES;
    const ys = new Float32Array(cols);
    for (let i = 0; i < cols; i++) {
      let a: number;
      let b: number;
      let wgt = 1;
      if (i >= first && i <= last && !Number.isNaN(top[i])) {
        // dans le mot : contour lissé (il comble aussi les espaces)
        a = top[i];
        b = bot[i];
      } else {
        const j = i < first ? first : i > last ? last : near[i];
        if (j < 0) {
          ys[i] = y0;
          continue;
        }
        const d = Math.abs(i - j) * SX;
        const t = Math.max(0, 1 - d / RAMP);
        wgt = t * t * (3 - 2 * t);
        a = top[j];
        b = bot[j];
      }
      // Au-dessus du milieu, les lignes se serrent entre le haut et le
      // contour ; en dessous, entre le contour et le bas.
      const ym =
        y0 < mid
          ? 1 + (y0 / mid) * Math.max(0, a - PAD - 1)
          : b + PAD + ((y0 - mid) / (H - mid)) * Math.max(0, H - 1 - b - PAD);
      ys[i] = y0 + (ym - y0) * wgt;
    }
    row.base.push(y0);
    row.hug.push(ys);
  }
}

function draw(row: Row) {
  const { ctx, w, h, base, hug, pull, reveal, alpha, time } = row;
  ctx.clearRect(0, 0, w, h);
  if (alpha <= 0.001) return;
  const ease = pull * pull * (3 - 2 * pull);
  const head = reveal * (row.fadeTo + 160); // les lignes arrivent depuis la gauche
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = alpha;
  for (let l = 0; l < base.length; l++) {
    // Couleurs le long de la ligne, puis effacement après le mot
    const g = ctx.createLinearGradient(0, 0, row.fadeTo, 0);
    const shift = (time * 0.05 + l * 0.11) % 1;
    const f = row.fadeFrom / row.fadeTo;
    for (let k = 0; k <= 3; k++) g.addColorStop((k / 3) * f, rgba(COLORS[(k + l) % 4], 1));
    g.addColorStop(1, rgba(COLORS[(3 + l) % 4], 0));
    ctx.strokeStyle = g;
    ctx.beginPath();
    const ys = hug[l];
    const y0 = base[l];
    let started = false;
    for (let i = 0; i < ys.length; i++) {
      const x = i * SX;
      if (x > head || x > row.fadeTo) break;
      const wave = Math.sin(x * 0.018 + time * 1.6 + l * 0.7 + shift) * 2.2 * (1 - ease * 0.6);
      const y = y0 + (ys[i] - y0) * ease + wave;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function animate(row: Row) {
  if (reduce) {
    // Mouvement réduit : les lignes apparaissent directement, immobiles
    row.pull = row.reveal = row.alpha = row.target;
    draw(row);
    return;
  }
  if (row.raf) return;
  const step = (t: number) => {
    const dt = row.last ? Math.min((t - row.last) / 1000, 0.05) : 0.016;
    row.last = t;
    row.time += dt;
    const k = row.target;
    if (k) row.reveal += (1 - row.reveal) * (1 - Math.exp(-dt * 3.2));
    row.pull += (k - row.pull) * (1 - Math.exp(-dt * (k ? 3.5 : 5)));
    row.alpha += (k - row.alpha) * (1 - Math.exp(-dt * (k ? 8 : 6)));
    draw(row);
    if (!k && row.alpha < 0.01) {
      // reparti : on remet à zéro pour la prochaine arrivée
      row.raf = row.last = 0;
      row.reveal = row.alpha = row.pull = 0;
      draw(row);
      return;
    }
    // reste animé tant que la souris est là (ondulation)
    row.raf = requestAnimationFrame(step);
  };
  row.raf = requestAnimationFrame(step);
}

if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.fonts.ready.then(() => {
    const rows: Row[] = [];
    document.querySelectorAll<HTMLElement>('.row').forEach((el) => {
      const title = el.querySelector<HTMLElement>('.rt');
      if (!title) return;
      const canvas = document.createElement('canvas');
      canvas.className = 'row-lines';
      canvas.setAttribute('aria-hidden', 'true');
      el.prepend(canvas);
      const row: Row = {
        el,
        title,
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
        raf: 0,
        last: 0,
        time: Math.random() * 10,
      };
      let ready = false;
      const on = () => {
        if (!ready) {
          prepare(row);
          ready = true;
        }
        row.target = 1;
        animate(row);
      };
      const off = () => {
        row.target = 0;
        animate(row);
      };
      el.addEventListener('pointerenter', on);
      el.addEventListener('pointerleave', off);
      el.addEventListener('focus', on);
      el.addEventListener('blur', off);
      rows.push(row);
      new ResizeObserver(() => {
        if (ready) {
          prepare(row);
          draw(row);
        }
      }).observe(el);
    });
  });
}
