# Site de Fréquences Complices

Ce guide s’adresse aux personnes de l’association qui mettent le site à jour.
Pas besoin d’installer quoi que ce soit : tout se fait sur **github.com**, dans le navigateur.

**Le principe :** chaque modification enregistrée sur GitHub (un « commit ») met le site
à jour automatiquement en **2 à 3 minutes**. Si une erreur empêche la publication,
le site en ligne ne change pas : rien ne casse, il suffit de corriger.

---

## Où se trouve quoi

| Je veux modifier…                     | Dossier                               |
| ------------------------------------- | ------------------------------------- |
| un événement                          | `src/content/evenements/`             |
| une production (podcast, docu…)       | `src/content/productions/`            |
| À propos, mentions légales, cookies…  | `src/content/pages/`                  |
| les photos                            | `src/content/images/`                 |
| l’adresse, l’e-mail                   | `src/data/site.ts`                    |

Chaque événement, production ou page est **un fichier texte** (extension `.md`).
Le haut du fichier, entre les deux lignes `---`, contient les informations
(titre, date…). En dessous, le texte libre.

## Modifier un texte existant

1. Ouvrez le fichier sur GitHub, cliquez sur le **crayon** (« Edit this file »).
2. Modifiez le texte.
3. Cliquez sur **Commit changes…** puis à nouveau sur **Commit changes**.

Mise en forme du texte libre :

```
*italique*        **gras**        [texte du lien](https://adresse.fr)

## Un intertitre

- une liste
- à puces
```

## Ajouter un événement

1. Dans `src/content/evenements/`, ouvrez `_modele.md` et copiez tout son contenu.
2. Revenez au dossier, cliquez sur **Add file → Create new file**.
3. Nommez le fichier, par exemple `2026-03-concert-de-printemps.md`
   (minuscules, sans espaces ni accents ; ce nom devient l’adresse de la page).
4. Collez le modèle et remplissez-le :

```yaml
---
titre: "Concert de printemps"
date: 2026-03-21          # année-mois-jour
heure: "19h30"
lieu: "Nom du lieu, ville"
inscription: "https://lien-vers-la-billetterie"
brouillon: false          # true = caché du site
---

Programme, artistes, tarifs…
```

5. **Commit changes**.

L’événement apparaît dans « À venir » avec le bouton **S’inscrire**.
Le lendemain de sa date, il passe **tout seul** dans « Passés ».
Pour un événement sur plusieurs jours, ajoutez `fin: 2026-03-23`.

> Mettez les textes entre guillemets droits `"…"` s’ils contiennent deux-points (`:`).
> Supprimez les deux exemples (`exemple-a-venir.md`, `exemple-passe.md`)
> dès que vous avez vos vrais événements : ouvrez-les, menu `…` → **Delete file**.

## Ajouter des photos

1. Dans `src/content/images/`, cliquez sur **Add file → Upload files** et déposez vos photos.
   - Noms de fichiers en minuscules, sans espaces ni accents : `concert-2026-01.jpg`
   - JPG ou PNG, idéalement moins de 5 Mo (le site les redimensionne tout seul).
2. **Commit changes**.
3. Dans le fichier de l’événement, ajoutez :

```yaml
photos:
  - image: ../images/concert-2026-01.jpg
    description: "Le public devant la scène"
  - image: ../images/concert-2026-02.jpg
    description: "Les musiciennes en répétition"
```

La **première photo** sert de vignette dans la liste des événements passés.
La `description` est lue aux personnes aveugles : décrivez simplement ce qu’on voit.

## Ajouter un lien

- **Inscription** à un événement : champ `inscription:` (adresse complète, commençant par `https://`).
- **Dans un texte** : `[texte cliquable](https://adresse.fr)`.
- **Podcast, vidéo** : dans une production, champ `media:` avec le lien
  Vimeo, YouTube, SoundCloud ou Spotify. Le lecteur s’affiche sur la page
  et ne se charge qu’au clic du visiteur (pas de cookies avant).

## Ajouter une production

Même méthode que pour un événement, avec `src/content/productions/_modele.md`.
Le champ `categorie:` vaut `podcast`, `documentaire` ou `evenements`.
Tant qu’une catégorie est vide, sa carte affiche « Bientôt ».
Pensez à mettre `brouillon: false` pour la publier.

## Si quelque chose ne marche pas

Après un commit, une pastille apparaît à côté du message sur la page du dépôt :
🟡 en cours, ✅ publié, ❌ erreur. En cas d’erreur, le site en ligne reste
sur la version précédente. Causes fréquentes :

- une date mal écrite (il faut `2026-03-21`) ;
- un `:` dans un texte sans guillemets ;
- un nom de photo mal recopié (majuscules, extension `.jpg` / `.jpeg`).

Au besoin, contactez Félix (collaborateur du dépôt).

---

Partie technique (installation locale, déploiement, nom de domaine) : [docs/technique.md](docs/technique.md).
