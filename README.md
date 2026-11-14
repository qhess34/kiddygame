# 🦉 Lire en jouant

Application web ludique d'apprentissage de la lecture pour la grande section / début de CP.
Elle fonctionne directement dans le navigateur (tablette, téléphone, ordinateur), sans compte, sans publicité, et la progression est enregistrée automatiquement sur l'appareil.

## Jouer
- En ligne : via GitHub Pages (voir « Publication » ci-dessous).
- En local : `python3 -m http.server 8080` dans ce dossier puis ouvrir http://localhost:8080
  (un serveur est nécessaire : les modules JavaScript ne se chargent pas en `file://`).
- Sur tablette : ouvrir la page puis « Ajouter à l'écran d'accueil » pour l'utiliser en plein écran, en paysage. Après une première visite le jeu marche hors connexion.

## Ce qu'il contient
- **Code couleur** (approche Céline Alvarez) : voyelles 🔴 rouges, consonnes 🔵 bleues, digrammes/trigrammes 🟢 verts (une seule unité), lettres muettes ⚫ noires.
- **7 mondes / niveaux** : forêt des lettres → village des syllabes → montagne des digrammes → château des mots → jardin des minuscules → île du script → royaume des petits lecteurs. Un monde s'ouvre après 10 étoiles gagnées dans le précédent.
- **Capitales puis script** : niveaux 1-4 en CAPITALES, niveau 5 découverte des minuscules (mot en script + rappel en capitales), niveau 6 en script, niveau 7 mélange + phrases. Réglable dans l'espace parent.
- **Jeux** : Je relie (mot ↔ image, au doigt ou par touchers), Je construis le mot (digrammes = une tuile), Je découpe les syllabes, Le mot mystère (avec / sans couleurs), J'écoute et je lis, + Capitales et minuscules (niveau 5+) et Je lis des phrases (niveau 7).
- **Récompenses** : étoiles, surprises à collectionner, médailles, carte de progression, mascotte Lulu la chouette. Jamais de sanction, pas de chronomètre.
- **Espace parent** (🔒 en haut à droite de l'accueil, code à 4 chiffres) : progression, mots travaillés, graphèmes, choix du niveau et de l'écriture, activation des graphèmes, ajout de mots, réinitialisation, sauvegarde/restauration.

## Ajouter des mots
Dans l'espace parent (onglet Mots) ou dans `js/data/words.js` :
```js
{ w: 'chocolat', g: 'ch o c o l a t_', s: 'cho-co-lat', img: '🍫', lvl: 4 }
```
`g` = graphèmes séparés par des espaces (groupe de lettres = digramme vert, `_` = lettre muette, `:v`/`:c` pour forcer voyelle/consonne), `s` = syllabes écrites séparées par `-`. Vérification : `node tests/validate-words.mjs`.

## Ajouter un jeu
Créer `js/games/monjeu.js` en suivant le contrat décrit en tête de `js/core/gamehost.js`, puis l'ajouter dans `js/games/index.js`.

## Architecture
HTML/CSS/JavaScript (modules ES) sans dépendance ni étape de compilation.
`js/core` (rendu coloré, sauvegarde, audio, animations, hôte des jeux), `js/data` (niveaux, graphèmes, mots, phrases), `js/games` (un fichier par jeu), `js/screens` (espace parent).

## Publication (GitHub Pages)
Le workflow `.github/workflows/pages.yml` publie le site à chaque push.
Une seule fois : dans le dépôt GitHub → **Settings → Pages → Build and deployment → Source : GitHub Actions**.
