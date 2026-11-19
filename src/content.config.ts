import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Pages de texte (À propos, mentions légales…).
 * Un fichier Markdown par page dans src/content/pages/.
 */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    /** Phrase d'accroche affichée en gros au-dessus du texte (facultatif). */
    intro: z.string().optional(),
    /** Signature affichée en bas du texte (facultatif, retour à la ligne avec « / »). */
    signature: z.string().optional(),
  }),
});

export const collections = { pages };
