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
- **4 parcours, 30 mondes** (carte à onglets) :
  - **CAPITALES** (14 mondes + révision) : voyelles et consonnes simples, puis au plus deux nouveaux digrammes par monde — ON AN → lettres muettes, È Ê → OU CH → G X Y et consonnes amies (TR, BL…) → IN AI → EU AU → OI EN → EAU GN → PH QU → ER/EZ, ET, EI, GU, ILL → sons complexes → sons rares → révision des capitales ;
  - **script** : une lettre à la fois (capitale ↔ script), plus de lettres, mots courts, mots longs, lecture autonome (sans couleurs), consolidation ;
  - **cursive** (vraie cursive scolaire française, police Playwrite France Moderne) : même progression, puis consolidation ;
  - **les trois écritures** mélangées : mots et petites phrases.
- **Mini-leçons obligatoires** : chaque nouveau graphème (et chaque lettre en script / cursive) a sa leçon en 5 étapes : je découvre en grand → j'écoute / réécoute le vrai son (jamais le nom de la lettre) → je le reconnais parmi d'autres → je le retrouve dans des mots illustrés → bravo, et « Je m'entraîne » dans un jeu. Les jeux n'utilisent que les graphèmes déjà appris. Un monde s'ouvre quand ses leçons sont faites et quelques manches gagnées.
- **Jeux** : La chasse aux sons, Les lettres jumelles (script / cursive), Je relie (mot ↔ image, au doigt ou par touchers), Je construis le mot (digrammes = une tuile), Je découpe les syllabes, Le mot mystère (avec / sans couleurs), J'écoute et je lis, Capitales et minuscules / Le même mot, Je lis des phrases.
- **Récompenses** : étoiles, surprises à collectionner, médailles, carte de progression, mascotte Lulu la chouette. Jamais de sanction, pas de chronomètre.
- **Temps d'écran** : après 1 h de jeu (réglable), l'application se met en pause avec Lulu endormie. Le code parent permet d'ajouter du temps (15 min par défaut, réglable) ; sinon le blocage se lève tout seul au bout d'1 h (réglable). Fermer ou relancer l'application ne lève pas le blocage.
- **Espace parent** (🔒 en haut à droite de l'accueil, code à 4 chiffres) : onglet **Acquis** (suivi séparé capitales / script / cursive, statuts « À découvrir », « En cours », « À consolider », « Acquis », relancer une mini-leçon, s'entraîner sur une notion, proposer une révision des notions difficiles, choisir un apprentissage, enregistrer sa propre voix pour un son), progression, mots travaillés, graphèmes, choix de l'écriture, activation des graphèmes, ajout de mots, réinitialisation, sauvegarde/restauration.

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
`js/core` (rendu coloré, sauvegarde, acquis, sons, audio, animations, hôte des jeux), `js/data` (parcours et leçons `curriculum.js`, graphèmes, mots, phrases), `js/games` (un fichier par jeu), `js/screens` (mini-leçons, espace parent).

## Publication (GitHub Pages)
Le workflow `.github/workflows/pages.yml` publie le site à chaque push.
Une seule fois : dans le dépôt GitHub → **Settings → Pages → Build and deployment → Source : GitHub Actions**.
