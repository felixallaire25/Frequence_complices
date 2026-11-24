# Notes techniques

Site statique [Astro](https://astro.build) hébergé sur Cloudflare Pages.
Aucune base de données, aucun serveur à maintenir, aucun traceur.

## Travailler en local

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # génère dist/
npm run preview  # sert dist/
```

Node 22.23 ou plus récent (voir `.nvmrc`).

## Organisation

```
src/
  content.config.ts      schémas des contenus (champs, types)
  content/
    pages/*.md           pages de texte → /<nom-du-fichier>/
    evenements/*.md      événements → /evenements/<nom>/
    productions/*.md     productions → /productions/<nom>/
    images/              photos (optimisées au build par astro:assets)
  data/site.json         e-mail, adresse, clé Web3Forms (modifiables dans le CMS)
  data/site.ts           nom, description, navigation
  layouts/Base.astro     gabarit commun (head, bandeau noir, pied de page)
  components/            HeroShader, ScrollLine, MediaEmbed, cartes…
  scripts/hero-shader.ts animation WebGL de l'accueil (OGL)
  scripts/lignes.ts      lignes qui épousent les titres (accueil, pages, cartes)
  scripts/palette.ts     palette d'essai des couleurs (ajouter ?palette à l'adresse)
  styles/global.css      couleurs, typographie, styles partagés
  assets/hero/           images fixes de repli du hero
public/_headers          en-têtes HTTP Cloudflare (cache, sécurité)
```

Les fichiers commençant par `_` dans les dossiers de contenu sont des
modèles ignorés au build.

## Déploiement Cloudflare

Le site est 100 % statique : Cloudflare sert le dossier `dist/`.
`wrangler.jsonc` le déclare explicitement, ce qui empêche Cloudflare
d'ajouter automatiquement un adaptateur serveur (source d'erreurs).

**Projet Workers** (parcours par défaut de Cloudflare) : connecter le dépôt,
Build command `npm run build`, Deploy command `npx wrangler deploy`.

**Ou projet Pages**, depuis le compte Cloudflare **de l'association** :

1. *Workers & Pages* → *Create* → onglet *Pages* → *Connect to Git*.
2. Autoriser GitHub et choisir le dépôt.
3. Réglages de build :
   - Framework preset : **Astro**
   - Build command : `npm run build`
   - Build output directory : `dist`
   - Branche de production : `main`
4. *Save and Deploy*. Chaque commit sur `main` republie le site ;
   les autres branches obtiennent une URL de prévisualisation.

La version de Node est lue dans `.nvmrc`. Si le build échoue sur la version,
ajouter la variable d'environnement `NODE_VERSION` = `22` dans les réglages
du projet Pages.

## Formulaire de contact (Web3Forms)

1. Sur https://web3forms.com, créer une clé avec l'adresse
   `frequencescomplices@gmail.com` (la clé arrive par e-mail).
2. La coller dans Pages CMS → « Réglages du site » (ou dans `src/data/site.json`)
   à la place de `[CLÉ WEB3FORMS]`.

Cette clé n'est pas secrète : elle indique seulement à Web3Forms vers quelle
adresse transférer les messages. Offre gratuite : 250 envois par mois.
Anti-spam : champ piège `botcheck`.

## Nom de domaine

- Cloudflare Registrar vend les domaines au prix coûtant mais **ne gère pas
  le .fr** : pour un .fr, passer par un registrar français (OVHcloud,
  Gandi…) puis pointer le domaine vers Cloudflare.
- Une fois le domaine acheté : projet Pages → *Custom domains*, puis
  renseigner `site` dans `astro.config.mjs` (liens canoniques).

## Propriété

Le dépôt GitHub, le compte Cloudflare et le nom de domaine doivent être au
nom de l'association. Le dépôt peut être transféré à tout moment
(*Settings → Transfer ownership*) sans casser le déploiement : il suffit de
reconnecter le dépôt dans Cloudflare si besoin.

## Hero WebGL

`src/components/HeroShader.astro` affiche d'abord une image fixe
(`src/assets/hero/`), puis charge `src/scripts/hero-shader.ts` seulement
si l'animation est souhaitable (pas de `prefers-reduced-motion`, pas de
Save-Data, appareil suffisant, WebGL disponible). Si l'animation tourne
à moins de 20 images/s, elle s'arrête et l'image reste.

Les images de repli sont des captures du shader. Pour les régénérer après
une modification du shader : lancer `npm run preview`, puis capturer
l'élément `.hero-bg` (veil, titre et en-tête masqués) en 1600 px de large
et en 390 px × DPR 2, et remplacer `hero-desktop.jpg` / `hero-mobile.jpg`.

## Pages CMS (édition par l'association)

Formulaires d'édition sur https://app.pagescms.org, configurés dans
`.pages.yml` (à la racine). Pages CMS enregistre directement dans le dépôt,
sur la branche ouverte (doit être `main`, la branche publiée).

- Mise en route : se connecter avec GitHub, installer l'application GitHub
  Pages CMS sur le compte propriétaire du dépôt, ouvrir le dépôt.
- Éditeurs : à inviter par e-mail (rubrique *Collaborators*), sans compte
  GitHub. Ils modifient contenus et médias, pas la configuration.
- Médias : `src/content/images`, chemin écrit `../images/…`.
- Les schémas (`src/content.config.ts`) tolèrent les champs laissés vides
  (`''`, `null`) que le CMS peut enregistrer.
- Réglages (e-mail, adresse, clé Web3Forms) : `src/data/site.json`.
- Toute nouvelle page de la rubrique « Pages » devient `/<nom-du-fichier>/`.
- À la transition : réinstaller l'application sur le compte de l'association
  et réinviter les éditeurs.

## Suite prévue

- Page d'entrée interactive.
