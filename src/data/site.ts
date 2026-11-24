/**
 * Réglages généraux du site.
 * L'e-mail, l'adresse et la clé du formulaire sont dans site.json
 * (modifiables depuis Pages CMS, rubrique « Réglages du site »).
 */
import reglages from './site.json';

export const site = {
  nom: 'Fréquences Complices',
  description:
    'Fréquences Complices, association culturelle : arts, audiovisuel, médiation culturelle et événements.',
  email: reglages.email,
  adresse: reglages.adresse,
  /**
   * Clé du service d'envoi du formulaire de contact (https://web3forms.com).
   * La clé n'est pas secrète : elle indique seulement à Web3Forms où
   * transférer les messages.
   */
  web3formsKey: reglages.web3formsKey,
};

/** Navigation principale (ordre d'affichage). */
export const nav = [
  { href: '/a-propos/', label: 'À propos', key: 'a-propos' },
  { href: '/evenements/', label: 'Événements', key: 'evenements' },
  { href: '/productions/', label: 'Productions', key: 'productions' },
  { href: '/contact/', label: 'Contact', key: 'contact' },
] as const;

/** Page en cours : clé d'une rubrique, identifiant d'une page, 'accueil'… */
export type NavKey = string;
