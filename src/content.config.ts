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
    image().transform((img) => ({
      image: img,
      description: undefined as string | undefined,
      taille: 'normale' as 'normale' | 'large' | 'pleine',
    })),
    z.object({
      image: image(),
      /** Décrit la photo pour les personnes qui ne la voient pas. */
      description: texte(),
      /** normale, large (deux colonnes) ou pleine (toute la largeur) */
      taille: z.preprocess(vide, z.enum(['normale', 'large', 'pleine']).default('normale')),
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

/**
 * Sections : blocs empilés sous le texte principal (comme dans Notion).
 * Le champ « type » indique la sorte de bloc (enregistré ainsi par Pages CMS).
 */
const aImage = (b: unknown) => !!(b && typeof b === 'object' && (b as { image?: unknown }).image);
const sections = ({ image }: SchemaContext) =>
  z.preprocess(
    (v) =>
      (Array.isArray(v) ? v : []).filter((b) => {
        if (!b || typeof b !== 'object' || !('type' in b)) return false;
        if (b.type === 'image') return aImage(b);
        if (b.type === 'galerie') return Array.isArray((b as { images?: unknown }).images);
        return true;
      }),
    z.array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('texte'), texte: texte() }),
        z.object({
          type: z.literal('image'),
          image: image(),
          description: texte(),
          legende: texte(),
          taille: z.preprocess(vide, z.enum(['petite', 'moyenne', 'grande', 'pleine']).default('moyenne')),
          alignement: z.preprocess(vide, z.enum(['gauche', 'centre', 'droite']).default('gauche')),
        }),
        z.object({
          type: z.literal('galerie'),
          images: z.preprocess(
            (v) => (Array.isArray(v) ? v.filter(aImage) : []),
            z.array(z.object({ image: image(), description: texte() })),
          ),
          colonnes: z.preprocess(vide, z.coerce.number().int().min(2).max(4).default(3)),
        }),
        z.object({ type: z.literal('media'), lien: texte(), titre: texte() }),
        z.object({ type: z.literal('citation'), texte: texte(), auteur: texte() }),
      ]),
    ),
  );

/** Pages de texte (À propos, mentions légales…) : src/content/pages/*.md */
const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: (ctx) => z.object({
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
    sections: sections(ctx),
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
      sections: sections(ctx),
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
  schema: (ctx) =>
    z.object({
      titre: z.string(),
      /** podcast, documentaire ou evenements */
      categorie: z.enum(['podcast', 'documentaire', 'evenements']),
      /** Date de sortie (AAAA-MM-JJ), sert à trier. */
      date: dateFacultative(),
      /** Une phrase de présentation, affichée dans la liste. */
      resume: texte(),
      /** Image de présentation (facultative). */
      image: z.preprocess(vide, ctx.image().optional()),
      image_description: texte(),
      /** Lien Vimeo, YouTube, SoundCloud ou Spotify : le lecteur s'affiche sur la page. */
      media: texte(),
      brouillon: z.preprocess(vide, z.boolean().default(false)),
      sections: sections(ctx),
    }),
});

export const collections = { pages, evenements, productions };
