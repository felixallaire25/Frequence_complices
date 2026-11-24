# Site de Fréquences Complices

Ce guide s’adresse aux personnes de l’association qui mettent le site à jour.
Tout se fait dans le navigateur, avec des formulaires : **https://app.pagescms.org**

**Le principe :** chaque enregistrement met le site à jour automatiquement en
**2 à 3 minutes**. Si une erreur empêche la publication, le site en ligne ne
change pas : rien ne casse, il suffit de corriger.

---

## Se connecter

1. Vous recevez une invitation par e-mail de Pages CMS : cliquez sur le lien.
   (Pas besoin de compte GitHub.)
2. Ensuite, allez sur **https://app.pagescms.org** et ouvrez le projet
   **Frequence_complices**.

Dans le menu de gauche :

| Rubrique              | Pour…                                                    |
| --------------------- | -------------------------------------------------------- |
| **Événements**        | ajouter un événement, ses photos, son lien d’inscription |
| **Productions**       | ajouter un podcast, un documentaire…                     |
| **Pages**             | modifier À propos, les mentions légales, etc.            |
| **Réglages du site**  | e-mail et adresse de l’association                       |
| **Media**             | voir toutes les photos envoyées                          |

## Ajouter un événement

1. **Événements** → **Add an entry** (ajouter).
2. Remplissez : titre, date, heure, lieu, **lien d’inscription** (adresse
   complète commençant par `https://`).
3. Écrivez la description dans le grand champ en bas.
4. **Save** (enregistrer).

L’événement apparaît dans « À venir » avec le bouton **S’inscrire**.
Le lendemain de sa date, il passe **tout seul** dans « Passés ».

- Plusieurs jours ? Remplissez aussi « Dernier jour ».
- Pas encore prêt ? Cochez **Brouillon** : il reste caché du site.

## Ajouter des photos

Dans un événement, rubrique **Photos** → **Add** (ajouter une ligne) :

1. Cliquez sur la case photo, puis **Upload** pour envoyer une photo depuis
   votre ordinateur (JPG ou PNG, idéalement moins de 5 Mo : le site les
   redimensionne tout seul).
2. Décrivez en quelques mots ce que montre la photo : c’est lu aux personnes
   aveugles.
3. Ajoutez autant de lignes que de photos, puis **Save**.

La **première photo** sert de vignette dans la liste des événements passés.

## Ajouter un lien

- **Inscription** à un événement : champ « Lien d’inscription ».
- **Dans un texte** : sélectionnez les mots, puis le bouton lien de la barre d’outils.
- **Podcast, vidéo** : dans une production, champ « Lien Vimeo, YouTube,
  SoundCloud ou Spotify ». Le lecteur s’affiche sur la page et ne se charge
  qu’au clic du visiteur (pas de cookies avant).

## Ajouter une production

**Productions** → **Add an entry**, choisissez la catégorie (Podcast,
Documentaire, Événements). Tant qu’une catégorie est vide, sa carte affiche
« Bientôt ».

## Créer une page et l’ajouter au menu

1. **Pages** → **Add an entry** : titre, texte (comme dans Notion : titres,
   listes, tableaux, images…), **Save**.
   La page est en ligne à l’adresse `/titre-de-la-page/`.
2. Pour la faire apparaître dans le menu, choisissez dans
   **Afficher dans le menu** :
   - **Menu principal** : elle s’ajoute avant « Contact » ;
   - **Sous-menu de « À propos »** (ou Événements, Productions, Contact) :
     une petite flèche apparaît à côté de cet élément du menu.
3. Plusieurs pages au même endroit ? Le champ **Ordre** (1, 2, 3…) les classe.

## Supprimer les exemples

Les événements entre crochets (« [Titre de l’événement] ») sont des exemples :
supprimez-les dès que vous avez vos vrais événements (menu `…` de la ligne →
**Delete**).

## Si quelque chose ne marche pas

Si le site ne change pas après 5 minutes, une information est sans doute mal
remplie (par exemple un lien qui ne commence pas par `https://`). Le site en
ligne reste alors sur la version précédente. Au besoin, contactez Félix.

---

Partie technique (installation locale, déploiement, CMS, nom de domaine) :
[docs/technique.md](docs/technique.md).
