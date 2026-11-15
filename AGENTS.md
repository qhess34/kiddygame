# AGENTS.md — « Lire en jouant »

Guide pour les agents (et les humains) qui travaillent sur ce dépôt.

## Le projet
Application web ludique d'apprentissage de la lecture en français pour un enfant de grande section / début CP (5-7 ans), inspirée de Montessori et de Céline Alvarez.
- Cible principale : **tablette tactile en paysage** (≈1180×820, 1024×768). Doit aussi marcher sur téléphone en paysage (≈844×390) et sur ordinateur.
- Site statique : HTML/CSS/JavaScript en modules ES, **aucune dépendance, aucune étape de build**.
- Sans compte ni publicité, aucun lien externe accessible à l'enfant. Progression sauvegardée dans `localStorage` (clé `lirejoue.v1`).
- Installable sur l'écran d'accueil (manifest + service worker `sw.js`, mode hors connexion).
- Toute l'interface et les textes sont en français.

## Principes pédagogiques (non négociables)
- **Code couleur** : voyelle 🔴 rouge (`v`), consonne 🔵 bleu (`c`), digramme/trigramme 🟢 vert (`d`, unité indivisible, ex. CH, OU, EAU), lettre muette ⚫ noir (`m`). Ne jamais colorier arbitrairement ; ne pas confondre lettres et sons.
- Règles détaillées des cas ambigus (consonnes doublées, er/ez/et, e muet, y…) : commentaire en tête de `js/data/words.js`. Les respecter pour tout nouveau mot.
- Syllabes **écrites** (to-ma-te, cho-co-lat, pois-son) ≠ segmentation en graphèmes : deux apprentissages distincts.
- **Progression de l'écriture** : capitales (niveaux 1-4) → découverte des minuscules (5, mode `bridge`) → script (6) → mélange + phrases (7). Réglable par le parent (`settings.script`).
- Un mot n'apparaît jamais avant que ses graphèmes aient été introduits (`GRAPHEMES[].level`).
- Jamais de sanction, de croix rouge, de chronomètre ni de comparaison. Encouragements uniquement.
- La synthèse vocale ne prononce jamais une consonne isolée (elle dirait le nom de la lettre) : seulement des mots, des syllabes (`ssay` pour les e muets : « neu », « teu ») et des phrases.

## Arborescence
| Chemin | Rôle |
|---|---|
| `index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg`, `icons/`, `fonts/` (Andika) | Page, PWA, police lisible pour enfants |
| `css/style.css` | Styles communs, variables du code couleur (`--vowel`, `--consonant`, `--digraph`, `--mute`) |
| `css/game-<id>.css`, `css/parent.css` | Un fichier de styles par jeu / pour l'espace parent (classes préfixées `.game-<id>`) |
| `js/main.js` | Accueil (prénom, avatar, installation), carte des mondes, menu des jeux, album. `window.__app` expose `showMenu`, `play(gameId, level)`, `getState` pour les tests |
| `js/core/render.js` | `el()` (helper DOM), `renderWord`, `renderGrapheme`, `renderSentence` |
| `js/core/words.js` | Format d'auteur des mots, `parseGraphemes`, `buildWord`, `letterKinds`, `pickDistractors`… |
| `js/core/library.js` | Bibliothèque active (mots intégrés + mots du parent, filtrés), `poolForLevel`, `weightedPick` |
| `js/core/state.js` | État et sauvegarde, réglages, étoiles, surprises (`STICKERS`), médailles (`MEDALS`), statistiques |
| `js/core/audio.js` | Voix française du navigateur (Web Speech API), effets sonores générés (Web Audio) |
| `js/core/fx.js` | Mascotte Lulu la chouette (SVG), confettis, étincelles, animations |
| `js/core/gamehost.js` | Hôte des jeux : en-tête, consigne orale, manches, victoire. **Contrat des jeux décrit en tête** |
| `js/core/breaks.js` | Pauses actives : après `settings.breakMinutes` (15 par défaut) de jeu visible, exercice physique guidé, affiché seulement entre deux manches (`breakThen`). Désactivable : `settings.breakEnabled` |
| `js/core/install.js` | Proposition d'installation (Android : `beforeinstallprompt` ; iPad : guide Safari) |
| `js/games/*.js` + `js/games/index.js` | Un module par jeu + registre |
| `js/screens/parent.js` | Espace parent protégé par code |
| `js/data/levels.js` | 7 mondes, `STARS_TO_UNLOCK` |
| `js/data/graphemes.js` | Progression des graphèmes (`key`, `kind`, `level`, `example`, `sound`) |
| `js/data/words.js` | `WORDS` (≈450 mots vérifiés) |
| `js/data/sentences.js` | `SMALL_WORDS` (mots-outils) et `SENTENCES` (phrases du niveau 7, regroupées par `group`) |
| `tests/validate-words.mjs` | Validation de la bibliothèque (doit passer : `node tests/validate-words.mjs`) |

## Jeux
`match` Je relie (jeu central, tracé au doigt ou touchers successifs) · `build` Je construis le mot · `syllables` Je découpe les syllabes · `mystery` Le mot mystère (avec / sans couleurs) · `listen` J'écoute et je lis · `cases` Capitales et minuscules (niveau ≥ 5) · `sentences` Je lis des phrases (niveau 7).

### Contrat d'un jeu
```js
export default {
  id: 'monjeu', title: 'Mon jeu', icon: '🧩', color: '#ff8fab', minLevel: 1,
  instruction: (ctx) => 'Consigne lue à voix haute.',
  start(root, ctx) { /* construit UNE manche dans root */ return { destroy() {} }; },
};
```
`ctx` fournit : `level`, `script`, `colors`, `settings`, `el`, `renderWord`, `renderGrapheme`, `renderSentence`, `pool()`, `pick(n)`, `distractors(target, n, hard)`, `shuffle`, `speak`, `instruct`, `sfx`, `fx`, `record`, `good(word, node)`, `bad(word, node)`, `win()`, `round`.
Appeler `ctx.good` / `ctx.bad` à chaque réponse, puis `ctx.win()` **une seule fois** en fin de manche. `destroy()` doit retirer écouteurs globaux et minuteries. Ajouter le jeu dans `js/games/index.js` et son CSS dans `index.html`.

### Règles d'UX
- Consignes orales, très peu de texte, gros éléments tactiles (≥ 64-72 px), aucun défilement dans les trois tailles d'écran cibles.
- Pointer Events (`setPointerCapture`, `touch-action: none` sur les zones de glisser) + **toujours une alternative par touchers successifs**.
- Tout mot affiché à l'enfant passe par `renderWord` (couleurs, écriture).
- Images = emoji uniques et non ambigus (un emoji n'illustre qu'un seul mot).

## Ajouter des mots
Format d'auteur (dans `js/data/words.js`, ou depuis l'espace parent → `state.customWords`) :
```js
{ w: 'chocolat', g: 'ch o c o l a t_', s: 'cho-co-lat', img: '🍫', lvl: 4 }
// g : graphèmes séparés par des espaces ; groupe de lettres = vert ; suffixe _ = muette ;
//     :v / :c / :d pour forcer le type (ex. 'y:c' dans yoyo)
// s : syllabes écrites séparées par '-' ; option say (prononciation), ssay (prononciation des syllabes)
```
Si le mot utilise un nouveau graphème, l'ajouter dans `js/data/graphemes.js`. Puis lancer `node tests/validate-words.mjs`.

## Tester
- Serveur local : `python3 -m http.server 8080` à la racine, puis http://localhost:8080 (les modules ES ne marchent pas en `file://`).
- Playwright est disponible (`require('playwright')`, ne pas lancer `playwright install`). Tester en tactile (`hasTouch: true`, ou `devices['iPad (gen 7) landscape']`) aux tailles 1180×820, 1024×768 et 844×390.
- Raccourci : `localStorage.setItem('lirejoue.v1', JSON.stringify({child:{name:'Test'},settings:{unlockAll:true}}))`, recharger, puis `window.__app.play('<id>', <niveau>)`.
- Les éléments animés (bouton ▶ pulsant, cibles) demandent `{ force: true }` pour les clics Playwright.
- La synthèse vocale n'est pas audible en headless : espionner `speechSynthesis.speak` pour vérifier ce qui est prononcé.
- Scripts de test et captures : dans le dossier temporaire de la session, pas dans le dépôt.

## Publication
- GitHub Pages via `.github/workflows/pages.yml`, déclenché **uniquement par un push sur `main`** (l'environnement `github-pages` n'autorise que `main`). Le workflow valide la bibliothèque de mots avant de publier.
- Branche de travail : `claude/reading-learning-game-app-e9ecc3`. Le propriétaire a autorisé à pousser aussi sur `main` pour mettre le site à jour : `git push origin claude/reading-learning-game-app-e9ecc3:main`.
- Site : https://qhess34.github.io/kiddygame/
- Le service worker est en « réseau d'abord » : pas besoin de changer de version de cache à chaque publication.
- Toute nouvelle ressource à publier (dossier ou fichier à la racine) doit être ajoutée à la commande `cp` du workflow.
