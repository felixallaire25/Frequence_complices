import { getCollection } from 'astro:content';
import { nav } from '../data/site';

export type Lien = { href: string; label: string; key: string };
export type Entree = Lien & { enfants: Lien[] };

/**
 * Menu principal : les quatre rubriques fixes, plus les pages de
 * src/content/pages marquées « menu » dans le CMS :
 *  - menu: principal → ajoutée au menu principal (avant Contact)
 *  - menu: a-propos | evenements | productions | contact → sous-menu
 */
export async function menu(): Promise<Entree[]> {
  const pages = (await getCollection('pages', (p) => p.data.menu)).sort(
    (a, b) =>
      (a.data.ordre ?? 999) - (b.data.ordre ?? 999) || a.data.titre.localeCompare(b.data.titre, 'fr'),
  );
  const lien = (p: (typeof pages)[number]): Lien => ({ href: `/${p.id}/`, label: p.data.titre, key: p.id });
  const fixes = new Set<string>(nav.map((n) => n.key));

  const entree = (n: (typeof nav)[number]): Entree => ({
    href: n.href,
    label: n.label,
    key: n.key,
    enfants: pages.filter((p) => p.data.menu === n.key && !fixes.has(p.id)).map(lien),
  });
  const ajoutees: Entree[] = pages
    .filter((p) => p.data.menu === 'principal' && !fixes.has(p.id))
    .map((p) => ({ ...lien(p), enfants: [] }));

  const avant = nav.filter((n) => n.key !== 'contact').map(entree);
  const contact = nav.filter((n) => n.key === 'contact').map(entree);
  return [...avant, ...ajoutees, ...contact];
}
