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
  data/site.ts           nom, e-mail, adresse, clé Web3Forms, navigation
  layouts/Base.astro     gabarit commun (head, bandeau noir, pied de page)
  components/            HeroShader, WaveBand, MediaEmbed, cartes…
  scripts/hero-shader.ts animation WebGL de l'accueil (OGL)
  styles/global.css      couleurs, typographie, styles partagés
  assets/hero/           images fixes de repli du hero
public/_headers          en-têtes HTTP Cloudflare (cache, sécurité)
```

Les fichiers commençant par `_` dans les dossiers de contenu sont des
modèles ignorés au build.

## Déploiement Cloudflare Pages

À faire depuis le compte Cloudflare **de l'association** :

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
2. La coller dans `src/data/site.ts` à la place de `[CLÉ WEB3FORMS]`.

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

## Phase 2 (prévue)

- Pages CMS branché sur le dépôt : formulaires pour événements,
  productions et pages libres. Les schémas de `content.config.ts` sont
  déjà prêts ; médias dans `src/content/images` (chemin de sortie
  `../images`).
- Page d'entrée interactive.
