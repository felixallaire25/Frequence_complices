/**
 * Titres « fréquence » :
 *  - data-onde="titre"  (grands titres) : les lettres montent à l'apparition,
 *    puis une onde lente les traverse ; elle s'amplifie près du curseur.
 *  - data-onde="survol" (lignes de l'accueil) : apparition, puis une onde
 *    parcourt les lettres au survol ou au focus clavier.
 *  - .h2 (intertitres) : apparition au défilement + petite onde dessinée
 *    sous le titre (en CSS).
 *
 * Les lecteurs d'écran lisent le titre d'origine (aria-label), les lettres
 * découpées leur sont masquées. Rien ne bouge si l'utilisateur a demandé
 * à réduire les animations.
 */

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const STAGGER = 26; // ms entre deux lettres
const RISE = 950; // ms

function span(className: string) {
  const s = document.createElement('span');
  s.className = className;
  return s;
}

/** Découpe le texte d'un élément en mots puis en lettres (garde les <br>). */
function split(el: HTMLElement) {
  const label = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  let i = 0;
  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of (child.textContent ?? '').split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.append(' ');
            continue;
          }
          const mot = span('mot');
          mot.setAttribute('aria-hidden', 'true');
          for (const c of part) {
            const ch = span('ch');
            ch.style.setProperty('--i', String(i++));
            const inner = span('ch-in');
            inner.textContent = c;
            ch.append(inner);
            mot.append(ch);
          }
          frag.append(mot);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName !== 'BR') {
        walk(child);
      }
    }
  };
  walk(el);
  el.setAttribute('aria-label', label);
  el.classList.add('is-split');
  return i;
}

const cibles = [...document.querySelectorAll<HTMLElement>('[data-onde], .h2')];

if (reduce) {
  cibles.forEach((el) => el.classList.add('is-split', 'is-in', 'is-done'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        io.unobserve(el);
        el.classList.add('is-in');
        const n = Number(el.dataset.lettres ?? 0);
        window.setTimeout(() => el.classList.add('is-done'), n * STAGGER + RISE + 50);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  for (const el of cibles) {
    el.dataset.lettres = String(split(el));
    io.observe(el);
  }

  // L'onde s'amplifie autour du curseur (grands titres uniquement)
  if (finePointer) {
    const titres = cibles.filter((el) => el.dataset.onde === 'titre');
    let px = -1e4;
    let py = -1e4;
    let pending = false;
    const update = () => {
      pending = false;
      for (const t of titres) {
        const box = t.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) continue;
        const near = py > box.top - 200 && py < box.bottom + 200;
        t.querySelectorAll<HTMLElement>('.ch-in').forEach((c) => {
          if (!near) {
            c.style.removeProperty('--amp');
            return;
          }
          const r = c.getBoundingClientRect();
          const dx = (r.left + r.width / 2 - px) / 160;
          const dy = (r.top + r.height / 2 - py) / 220;
          const a = Math.exp(-(dx * dx + dy * dy));
          c.style.setProperty('--amp', (a * 0.22).toFixed(3));
        });
      }
    };
    window.addEventListener(
      'pointermove',
      (e) => {
        px = e.clientX;
        py = e.clientY;
        if (!pending) {
          pending = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    document.documentElement.addEventListener('pointerleave', () => {
      px = py = -1e4;
      update();
    });
  }
}
