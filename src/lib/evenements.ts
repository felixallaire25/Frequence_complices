import { getCollection, type CollectionEntry } from 'astro:content';

export type Evenement = CollectionEntry<'evenements'>;

const TZ = 'Europe/Paris';

/** Date du jour à Paris au format AAAA-MM-JJ. */
export function aujourdhui(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date());
}

/** AAAA-MM-JJ (les dates du Markdown sont lues à minuit UTC). */
export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Dernier jour de l'événement, au format AAAA-MM-JJ. */
export function dernierJour(e: Evenement): string {
  return iso(e.data.fin ?? e.data.date);
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...opts });

/** « 15.03 » ou « 15.03 – 17.03 » */
export function dateCourte(e: Evenement): string {
  const f = (d: Date) => fmt({ day: '2-digit', month: '2-digit' }).format(d).replace('/', '.');
  return e.data.fin ? `${f(e.data.date)} – ${f(e.data.fin)}` : f(e.data.date);
}

/** « samedi 15 mars 2026 » ou « du 15 au 17 mars 2026 » */
export function dateLongue(e: Evenement): string {
  const { date, fin } = e.data;
  if (!fin) return fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  const memeMois =
    date.getUTCMonth() === fin.getUTCMonth() && date.getUTCFullYear() === fin.getUTCFullYear();
  const debut = memeMois ? fmt({ day: 'numeric' }) : fmt({ day: 'numeric', month: 'long' });
  return `du ${debut.format(date)} au ${fmt({
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fin)}`;
}

/** Tous les événements publiés, du plus proche au plus lointain. */
export async function evenementsPublies(): Promise<Evenement[]> {
  const all = await getCollection('evenements', (e) => !e.data.brouillon);
  return all.sort((a, b) => a.data.date.valueOf() - b.data.date.valueOf());
}
