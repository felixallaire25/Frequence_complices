import { defineCollection, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Les noms de champs sont en français pour faciliter l'édition.
 * Les photos se rangent dans src/content/images/ et s'indiquent
 * avec un chemin du type : ../images/ma-photo.jpg
 */

/**
 * Champs laissés vides dans le CMS : Pages CMS peut enregistrer '' ou null.
 * On les traite comme « non renseignés » pour ne pas bloquer la publication.
 */
const vide = (v: unknown) => (v === '' || v === null ? undefined : v);
const texte = () => z.preprocess(vide, z.string().optional());
const dateFacultative = () => z.preprocess(vide, z.coerce.date().optional());

/** Une photo : soit un simple chemin, soit { image, description }. */
const photo = ({ image }: SchemaContext) =>
  z.union([
    image().transform((img) => ({ image: img, description: undefined as string | undefined })),
    z.object({
      image: image(),
      /** Décrit la photo pour les personnes qui ne la voient pas. */
      description: texte(),
    }),
  ]);

/** Liste de photos ; les lignes sans image (ajoutées puis laissées vides) sont ignorées. */
const photos = (ctx: SchemaContext) =>
  z.preprocess(
    (v) =>
      (Array.isArray(v) ? v : []).filter((p) =>
        typeof p === 'string' ? p.trim() !== '' : p && typeof p === 'object' && (p as { image?: unknown }).image,
      ),
    z.array(photo(ctx)),
  );

/** Pages de texte (À propos, mentions légales…) : src/content/pages/*.md */
const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    titre: z.string(),
    description: texte(),
    /** Phrase d'accroche affichée en gros au-dessus du texte. */
    intro: texte(),
    /** Signature en bas du texte ; « / » pour aller à la ligne. */
    signature: texte(),
    /**
     * Place dans le menu : vide = absente ; « principal » = menu principal ;
     * a-propos, evenements, productions ou contact = sous-menu de cet élément.
     */
    menu: z.preprocess(
      (v) => (v === '' || v === null || v === 'non' ? undefined : v),
      z.enum(['principal', 'a-propos', 'evenements', 'productions', 'contact']).optional(),
    ),
    /** Ordre d'affichage dans le menu (petit nombre = en premier). */
    ordre: z.preprocess(vide, z.coerce.number().optional()),
  }),
});

/** Les fichiers dont le nom commence par « _ » sont des modèles, ignorés. */
const MD = '[!_]*.md';

/** Événements : src/content/evenements/*.md */
const evenements = defineCollection({
  loader: glob({ pattern: MD, base: './src/content/evenements' }),
  schema: (ctx) =>
    z.object({
      titre: z.string(),
      /** Jour de l'événement, au format AAAA-MM-JJ. */
      date: z.coerce.date(),
      /** Dernier jour, si l'événement dure plusieurs jours (AAAA-MM-JJ). */
      fin: dateFacultative(),
      heure: texte(),
      lieu: texte(),
      /** Lien vers la billetterie ou le formulaire d'inscription. */
      inscription: texte(),
      /** Photos de l'édition (la première sert de vignette). */
      photos: photos(ctx),
      /** true = caché sur le site (pour préparer un événement à l'avance). */
      brouillon: z.preprocess(vide, z.boolean().default(false)),
    }),
});

/** Catégories de productions, dans l'ordre d'affichage. */
export const CATEGORIES = {
  podcast: 'Podcast',
  documentaire: 'Documentaire',
  evenements: 'Événements',
} as const;

/** Productions : src/content/productions/*.md */
const productions = defineCollection({
  loader: glob({ pattern: MD, base: './src/content/productions' }),
  schema: ({ image }) =>
    z.object({
      titre: z.string(),
      /** podcast, documentaire ou evenements */
      categorie: z.enum(['podcast', 'documentaire', 'evenements']),
      /** Date de sortie (AAAA-MM-JJ), sert à trier. */
      date: dateFacultative(),
      /** Une phrase de présentation, affichée dans la liste. */
      resume: texte(),
      /** Image de présentation (facultative). */
      image: z.preprocess(vide, image().optional()),
      image_description: texte(),
      /** Lien Vimeo, YouTube, SoundCloud ou Spotify : le lecteur s'affiche sur la page. */
      media: texte(),
      brouillon: z.preprocess(vide, z.boolean().default(false)),
    }),
});

export const collections = { pages, evenements, productions };
