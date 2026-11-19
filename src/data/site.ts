/**
 * Réglages généraux du site.
 * Les valeurs entre crochets sont à fournir par l'association.
 */
export const site = {
  nom: 'Fréquences Complices',
  description:
    'Fréquences Complices, association culturelle : arts, audiovisuel, médiation culturelle et événements.',
  email: 'frequencescomplices@gmail.com',
  adresse: '[ADRESSE DE L’ASSO]',
  realisation: 'Félix Allaire',
};

/** Navigation principale (ordre d'affichage). */
export const nav = [
  { href: '/a-propos/', label: 'À propos', key: 'a-propos' },
  { href: '/evenements/', label: 'Événements', key: 'evenements' },
  { href: '/productions/', label: 'Productions', key: 'productions' },
  { href: '/contact/', label: 'Contact', key: 'contact' },
] as const;

export type NavKey = (typeof nav)[number]['key'] | 'accueil' | 'autre';
