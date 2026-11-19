import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORIES } from '../content.config';

export type Production = CollectionEntry<'productions'>;
export type Categorie = keyof typeof CATEGORIES;
export { CATEGORIES };

/** Productions publiées, de la plus récente à la plus ancienne. */
export async function productionsPubliees(): Promise<Production[]> {
  const all = await getCollection('productions', (p) => !p.data.brouillon);
  return all.sort((a, b) => (b.data.date?.valueOf() ?? 0) - (a.data.date?.valueOf() ?? 0));
}

export function dateProduction(p: Production): string | undefined {
  return p.data.date
    ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(p.data.date)
    : undefined;
}
