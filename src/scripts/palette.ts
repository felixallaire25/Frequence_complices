/**
 * Palette d'essai : permet de tester d'autres couleurs directement sur le
 * site en ligne, sans toucher au code.
 *
 * - Ouvrir : ajouter ?palette à l'adresse d'une page.
 * - Les réglages sont gardés dans ce navigateur (localStorage) et suivent
 *   la navigation de page en page. Les visiteurs ne voient rien.
 * - Fermer le panneau remet les couleurs d'origine.
 */

export const CLE = 'fc-palette';

type Couleurs = Record<string, string>;

const ROLES: { v: string; label: string }[] = [
  { v: '--fond', label: 'Fond du corps' },
  { v: '--texte', label: 'Texte du corps' },
  { v: '--texte-2', label: 'Texte secondaire' },
  { v: '--sombre', label: 'Fond sombre (bandeau, pied)' },
  { v: '--sur-sombre', label: 'Texte sur fond sombre' },
  { v: '--sur-sombre-2', label: 'Texte secondaire sur sombre' },
];

const PRESETS: { nom: string; c: Couleurs }[] = [
  {
    nom: 'Beige (maquette)',
    c: { '--fond': '#ebe6d8', '--texte': '#060606', '--texte-2': '#575246', '--sombre': '#060606', '--sur-sombre': '#ebe6d8', '--sur-sombre-2': '#b8b3a5' },
  },
  {
    nom: 'Corps noir',
    c: { '--fond': '#060606', '--texte': '#ebe6d8', '--texte-2': '#b8b3a5', '--sombre': '#060606', '--sur-sombre': '#ebe6d8', '--sur-sombre-2': '#b8b3a5' },
  },
  {
    nom: 'Blanc cassé',
    c: { '--fond': '#f5f3ee', '--texte': '#060606', '--texte-2': '#5a574f', '--sombre': '#060606', '--sur-sombre': '#f5f3ee', '--sur-sombre-2': '#b8b3a5' },
  },
  {
    nom: 'Noir et blanc purs',
    c: { '--fond': '#ffffff', '--texte': '#000000', '--texte-2': '#555555', '--sombre': '#000000', '--sur-sombre': '#ffffff', '--sur-sombre-2': '#bbbbbb' },
  },
];

const DEFAUT = PRESETS[0].c;

function appliquer(c: Couleurs | null) {
  const s = document.documentElement.style;
  for (const { v } of ROLES) {
    if (c?.[v]) s.setProperty(v, c[v]);
    else s.removeProperty(v);
  }
}

// --- Contraste (WCAG) ---
function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((x) => {
    const c = x / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contraste(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function ouvrirPalette() {
  let c: Couleurs = { ...DEFAUT, ...JSON.parse(localStorage.getItem(CLE) || '{}') };

  const host = document.createElement('div');
  host.setAttribute('data-palette', '');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .p { position: fixed; left: 16px; bottom: 16px; z-index: 1000; width: 290px; max-height: calc(100vh - 32px); overflow: auto;
           background: #fff; color: #111; font: 14px/1.4 system-ui, sans-serif; border-radius: 10px;
           box-shadow: 0 8px 30px rgba(0,0,0,.35); padding: 14px 16px; }
      .p.min .corps { display: none; }
      h2 { font-size: 15px; margin: 0; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .presets { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
      button { font: inherit; padding: 6px 10px; border: 1px solid #bbb; background: #f4f4f4; border-radius: 6px; cursor: pointer; color: #111; }
      button:hover { background: #e8e8e8; }
      button:focus-visible, input:focus-visible { outline: 2px solid #3b5bdb; outline-offset: 2px; }
      label { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 6px 0; }
      input[type=color] { width: 44px; height: 28px; border: 1px solid #bbb; border-radius: 4px; padding: 0; background: none; }
      .ctr { margin: 10px 0; padding: 8px; background: #f6f6f6; border-radius: 6px; font-size: 13px; }
      .ok { color: #1b7f3b; font-weight: 600; } .ko { color: #b3261e; font-weight: 600; }
      .actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .note { font-size: 12px; color: #555; margin: 10px 0 0; }
    </style>
    <div class="p" role="dialog" aria-label="Palette d'essai">
      <h2>Palette d’essai <span><button class="min-btn" type="button" aria-label="Réduire">–</button> <button class="fermer" type="button">Fermer</button></span></h2>
      <div class="corps">
        <div class="presets"></div>
        <div class="roles"></div>
        <div class="ctr"></div>
        <div class="actions">
          <button class="copier" type="button">Copier les valeurs</button>
          <button class="reset" type="button">Réinitialiser</button>
        </div>
        <p class="note">Réglages gardés dans ce navigateur uniquement. « Fermer » remet les couleurs d’origine.</p>
      </div>
    </div>`;

  const presets = root.querySelector('.presets')!;
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.nom;
    b.addEventListener('click', () => {
      c = { ...p.c };
      maj();
    });
    presets.append(b);
  }

  const roles = root.querySelector('.roles')!;
  const inputs: Record<string, HTMLInputElement> = {};
  for (const r of ROLES) {
    const l = document.createElement('label');
    l.textContent = r.label;
    const i = document.createElement('input');
    i.type = 'color';
    i.addEventListener('input', () => {
      c[r.v] = i.value;
      maj();
    });
    l.append(i);
    roles.append(l);
    inputs[r.v] = i;
  }

  const ctr = root.querySelector<HTMLElement>('.ctr')!;
  function maj() {
    for (const r of ROLES) inputs[r.v].value = c[r.v];
    appliquer(c);
    localStorage.setItem(CLE, JSON.stringify(c));
    const ligne = (nom: string, a: string, b: string, min: number) => {
      const v = contraste(a, b);
      return `${nom} : <span class="${v >= min ? 'ok' : 'ko'}">${v.toFixed(1)}:1 ${v >= min ? '✓' : '✗'}</span>`;
    };
    ctr.innerHTML = [
      'Contraste (AA ≥ 4,5:1)',
      ligne('Texte / fond', c['--texte'], c['--fond'], 4.5),
      ligne('Secondaire / fond', c['--texte-2'], c['--fond'], 4.5),
      ligne('Texte / sombre', c['--sur-sombre'], c['--sombre'], 4.5),
      ligne('Secondaire / sombre', c['--sur-sombre-2'], c['--sombre'], 4.5),
    ].join('<br>');
  }

  root.querySelector('.reset')!.addEventListener('click', () => {
    c = { ...DEFAUT };
    maj();
  });
  root.querySelector('.copier')!.addEventListener('click', async (e) => {
    const texte = ROLES.map((r) => `${r.v}: ${c[r.v]};`).join('\n');
    try {
      await navigator.clipboard.writeText(texte);
      (e.target as HTMLButtonElement).textContent = 'Copié ✓';
    } catch {
      window.prompt('Valeurs à copier :', texte.replace(/\n/g, ' '));
    }
  });
  root.querySelector('.min-btn')!.addEventListener('click', () => root.querySelector('.p')!.classList.toggle('min'));
  root.querySelector('.fermer')!.addEventListener('click', () => {
    localStorage.removeItem(CLE);
    appliquer(null);
    host.remove();
    const url = new URL(location.href);
    url.searchParams.delete('palette');
    history.replaceState(null, '', url);
  });

  document.body.append(host);
  maj();
}
