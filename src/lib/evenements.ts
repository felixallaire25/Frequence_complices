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
  // « fin » ne compte que si elle est après la date (protège d'une erreur de saisie)
  const { date, fin } = e.data;
  return iso(fin && fin > date ? fin : date);
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...opts });

/** « 15.03 » ou « 15.03 – 17.03 » */
/** Date de fin seulement si elle est réellement après la date de début. */
function finValide(e: Evenement): Date | undefined {
  return e.data.fin && e.data.fin > e.data.date ? e.data.fin : undefined;
}

export function dateCourte(e: Evenement): string {
  const f = (d: Date) => fmt({ day: '2-digit', month: '2-digit' }).format(d).replace('/', '.');
  const fin = finValide(e);
  return fin ? `${f(e.data.date)} – ${f(fin)}` : f(e.data.date);
}

/** « samedi 15 mars 2026 » ou « du 15 au 17 mars 2026 » */
export function dateLongue(e: Evenement): string {
  const date = e.data.date;
  const fin = finValide(e);
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
