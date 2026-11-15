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
- **Progression** (`js/data/curriculum.js`, 30 niveaux en 4 parcours) : CAPITALES (lettres simples, puis ≤ 2 nouveaux digrammes par niveau : ON AN, OU CH, IN AI, EU AU, OI EN, EAU GN, PH QU…, puis révision) → SCRIPT (une lettre ↔ ses formes, plus de lettres, mots courts `bridge`, mots longs, lecture autonome sans couleurs, consolidation) → CURSIVE (même progression, `cbridge` = cursive + rappel en script, consolidation) → FINAL (trois écritures mélangées, mots et phrases). Réglable par le parent (`settings.script` : auto | caps | lower | cursive | mixed).
- **Une nouveauté à la fois** : chaque graphème (et chaque lettre en script / cursive) a une **mini-leçon obligatoire** (`js/screens/lesson.js`). Les jeux d'un niveau de capitales n'utilisent que les graphèmes des niveaux précédents + ceux dont la leçon est faite (`allowedKeys`). Le niveau d'un mot est **calculé** (`wordCapsLevel` : max des niveaux de ses graphèmes, consonnes amies comprises), jamais écrit à la main.
- La cursive utilise une vraie police scolaire (Playwrite France Moderne, `fonts/`, classe `.script-cursive`), lettres attachées : ne jamais ajouter d'espacement entre les lettres.
- Jamais de sanction, de croix rouge, de chronomètre ni de comparaison. Encouragements uniquement.
- La synthèse vocale ne prononce jamais une consonne isolée (elle dirait le nom de la lettre) : seulement des mots, des syllabes (`ssay` pour les e muets : « neu », « teu ») et des phrases. Le son d'un graphème (`js/core/sounds.js`) = mot homophone pour les voyelles (« on », « où », « eux »), syllabes pour les consonnes (« cha, cho, chi »), ou la voix du parent si elle a été enregistrée (IndexedDB `lirejoue-voix`).

## Arborescence
| Chemin | Rôle |
|---|---|
| `index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg`, `icons/`, `fonts/` (Andika) | Page, PWA, police lisible pour enfants |
| `css/style.css` | Styles communs, variables du code couleur (`--vowel`, `--consonant`, `--digraph`, `--mute`) |
| `css/game-<id>.css`, `css/parent.css` | Un fichier de styles par jeu / pour l'espace parent (classes préfixées `.game-<id>`) |
| `js/main.js` | Accueil (prénom, avatar, installation), carte des mondes (onglets par parcours), menu d'un monde (bande des leçons + jeux), album. `window.__app` expose `showMenu`, `play(gameId, level, { focus })`, `lesson(lessonId, level)`, `getState` pour les tests |
| `js/core/render.js` | `el()` (helper DOM), `renderWord`, `renderGrapheme`, `renderSentence` |
| `js/core/words.js` | Format d'auteur des mots, `parseGraphemes`, `buildWord`, `letterKinds`, `pickDistractors`… |
| `js/core/library.js` | Bibliothèque active (mots intégrés + mots du parent, filtrés), `poolForLevel`, `weightedPick` |
| `js/core/state.js` | État et sauvegarde (v2, migration de l'ancienne v1), réglages, leçons faites, ouverture des niveaux (`levelComplete`), étoiles, surprises, médailles, statistiques par écriture (`stats.byScript`) |
| `js/core/audio.js` | Voix française du navigateur (Web Speech API), effets sonores générés (Web Audio) |
| `js/core/fx.js` | Mascotte Lulu la chouette (SVG), confettis, étincelles, animations |
| `js/core/gamehost.js` | Hôte des jeux : en-tête, consigne orale, manches, victoire. **Contrat des jeux décrit en tête** |
| `js/core/progress.js` | Graphèmes connus par niveau (`allowedKeys`), lettres apprises (`learnedLetters`), statuts « À découvrir / En cours / À consolider / Acquis » (`lessonStatus`), notions difficiles |
| `js/core/sounds.js` | Faire entendre le vrai son d'un graphème (`playSound`) ; enregistrements de la voix du parent |
| `js/screens/lesson.js` | Mini-leçon en 5 étapes (découvrir, écouter, reconnaître, retrouver dans des mots, bravo + entraînement) |
| `js/data/curriculum.js` | **Parcours, niveaux et mini-leçons** (`LEVELS`, `LESSONS`, `wordCapsLevel`, `stageFor`) ; `js/data/levels.js` le ré-exporte |
| `js/core/breaks.js` | Pauses actives : après `settings.breakMinutes` (15 par défaut) de jeu visible, exercice physique guidé, affiché seulement entre deux manches (`breakThen`). Désactivable : `settings.breakEnabled` |
| `js/core/install.js` | Proposition d'installation (Android : `beforeinstallprompt` ; iPad : guide Safari) |
| `js/games/*.js` + `js/games/index.js` | Un module par jeu + registre |
| `js/screens/parent.js` | Espace parent protégé par code |
| `js/data/graphemes.js` | Graphèmes (`key`, `kind`, `level` = niveau de sa leçon, `example`, `sound`) |
| `js/data/words.js` | `WORDS` (≈450 mots vérifiés) |
| `js/data/sentences.js` | `SMALL_WORDS` (mots-outils) et `SENTENCES` (phrases de lecture autonome et du niveau final, regroupées par `group`) |
| `tests/validate-words.mjs` | Validation de la bibliothèque (doit passer : `node tests/validate-words.mjs`) |

## Jeux
`sounds` La chasse aux sons (reconnaître les graphèmes appris) · `letters` Les lettres jumelles (une lettre ↔ ses autres formes) · `match` Je relie (jeu central, tracé au doigt ou touchers successifs) · `build` Je construis le mot · `syllables` Je découpe les syllabes · `mystery` Le mot mystère (avec / sans couleurs) · `listen` J'écoute et je lis · `cases` deux écritures du même mot (`ctx.pair`) · `sentences` Je lis des phrases. Les jeux de chaque niveau sont listés dans `LEVELS[].games`.

### Contrat d'un jeu
```js
export default {
  id: 'monjeu', title: 'Mon jeu', icon: '🧩', color: '#ff8fab', minLevel: 1,
  instruction: (ctx) => 'Consigne lue à voix haute.',
  start(root, ctx) { /* construit UNE manche dans root */ return { destroy() {} }; },
};
```
`ctx` fournit : `level` (n° du niveau), `stage` (difficulté 1..7 pour doser le jeu), `track`, `script`, `pair` (deux écritures à associer), `focus` (notions à travailler), `colors`, `settings`, `el`, `renderWord`, `renderGrapheme`, `renderSentence`, `pool()`, `widePool()` (tous les mots lisibles), `pick(n)`, `distractors(target, n, hard)`, `knownKeys()`, `freshKeys()`, `learnedLetters()`, `recordGrapheme(key, ok)`, `recordLetter(l, ok)`, `shuffle`, `speak`, `instruct`, `sfx`, `fx`, `record`, `good(word, node)`, `bad(word, node)`, `win()`, `round`. Utiliser `ctx.stage` (et non `ctx.level`) pour la difficulté.
Appeler `ctx.good` / `ctx.bad` à chaque réponse, puis `ctx.win()` **une seule fois** en fin de manche. `destroy()` doit retirer écouteurs globaux et minuteries. Ajouter le jeu dans `js/games/index.js` et son CSS dans `index.html`.

### Règles d'UX
- Consignes orales, très peu de texte, gros éléments tactiles (≥ 64-72 px), aucun défilement dans les trois tailles d'écran cibles.
- Pointer Events (`setPointerCapture`, `touch-action: none` sur les zones de glisser) + **toujours une alternative par touchers successifs**.
- Tout mot affiché à l'enfant passe par `renderWord` (couleurs, écriture).
- Images = emoji uniques et non ambigus (un emoji n'illustre qu'un seul mot).

## Ajouter des mots
Format d'auteur (dans `js/data/words.js`, ou depuis l'espace parent → `state.customWords`) :
```js
{ w: 'chocolat', g: 'ch o c o l a t_', s: 'cho-co-lat', img: '🍫' }   // pas de niveau : il est calculé
// g : graphèmes séparés par des espaces ; groupe de lettres = vert ; suffixe _ = muette ;
//     :v / :c / :d pour forcer le type (ex. 'y:c' dans yoyo)
// s : syllabes écrites séparées par '-' ; option say (prononciation), ssay (prononciation des syllabes)
```
Si le mot utilise un nouveau graphème, l'ajouter dans `js/data/graphemes.js` **et** lui créer une mini-leçon dans `js/data/curriculum.js` (`GRAPHEME_LESSONS` + liste `lessons` d'un niveau ; `say` = homophone, `syl` = syllabes, `words` = mots). Puis lancer `node tests/validate-words.mjs` (il vérifie aussi leçons, niveaux et `GRAPHEMES[].level`).

## Tester
- Serveur local : `python3 -m http.server 8080` à la racine, puis http://localhost:8080 (les modules ES ne marchent pas en `file://`).
- Playwright est disponible (`require('playwright')`, ne pas lancer `playwright install`). Tester en tactile (`hasTouch: true`, ou `devices['iPad (gen 7) landscape']`) aux tailles 1180×820, 1024×768 et 844×390.
- Raccourci : `localStorage.setItem('lirejoue.v1', JSON.stringify({version:2,child:{name:'Test'},settings:{unlockAll:true}}))`, recharger, puis `window.__app.play('<id>', <niveau>)` ou `window.__app.lesson('g:on', 3)`. Les bonnes réponses portent `data-ok="1"` (leçons, chasse aux sons) pour les tests automatiques.
- Les éléments animés (bouton ▶ pulsant, cibles) demandent `{ force: true }` pour les clics Playwright.
- La synthèse vocale n'est pas audible en headless : espionner `speechSynthesis.speak` pour vérifier ce qui est prononcé.
- Scripts de test et captures : dans le dossier temporaire de la session, pas dans le dépôt.

## Publication
- GitHub Pages via `.github/workflows/pages.yml`, déclenché **uniquement par un push sur `main`** (l'environnement `github-pages` n'autorise que `main`). Le workflow valide la bibliothèque de mots avant de publier.
- Branche de travail : `claude/reading-learning-game-app-e9ecc3`. Le propriétaire a autorisé à pousser aussi sur `main` pour mettre le site à jour : `git push origin claude/reading-learning-game-app-e9ecc3:main`.
- Site : https://qhess34.github.io/kiddygame/
- Le service worker est en « réseau d'abord » : pas besoin de changer de version de cache à chaque publication.
- Toute nouvelle ressource à publier (dossier ou fichier à la racine) doit être ajoutée à la commande `cp` du workflow.
