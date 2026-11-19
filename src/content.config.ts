import { defineCollection, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Les noms de champs sont en français pour faciliter l'édition.
 * Les photos se rangent dans src/content/images/ et s'indiquent
 * avec un chemin du type : ../images/ma-photo.jpg
 */

/** Une photo : soit un simple chemin, soit { image, description }. */
const photo = ({ image }: SchemaContext) =>
  z.union([
    image().transform((img) => ({ image: img, description: undefined as string | undefined })),
    z.object({
      image: image(),
      /** Décrit la photo pour les personnes qui ne la voient pas. */
      description: z.string().optional(),
    }),
  ]);

/** Pages de texte (À propos, mentions légales…) : src/content/pages/*.md */
const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    titre: z.string(),
    description: z.string().optional(),
    /** Phrase d'accroche affichée en gros au-dessus du texte. */
    intro: z.string().optional(),
    /** Signature en bas du texte ; « / » pour aller à la ligne. */
    signature: z.string().optional(),
  }),
});

/** Événements : src/content/evenements/*.md */
const evenements = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/evenements' }),
  schema: (ctx) =>
    z.object({
      titre: z.string(),
      /** Jour de l'événement, au format AAAA-MM-JJ. */
      date: z.coerce.date(),
      /** Dernier jour, si l'événement dure plusieurs jours (AAAA-MM-JJ). */
      fin: z.coerce.date().optional(),
      heure: z.string().optional(),
      lieu: z.string().optional(),
      /** Lien vers la billetterie ou le formulaire d'inscription. */
      inscription: z.string().optional(),
      /** Photos de l'édition (la première sert de vignette). */
      photos: z.array(photo(ctx)).default([]),
      /** true = caché sur le site (pour préparer un événement à l'avance). */
      brouillon: z.boolean().default(false),
    }),
});

export const collections = { pages, evenements };
