# Brief commun — « Lire en jouant »

Application web statique (HTML/CSS/JS modules ES, **aucune étape de build**, aucune dépendance) publiée sur GitHub Pages.
Public : un enfant de 5-6 ans (grande section) qui apprend à lire, sur **tablette tactile en paysage** (≈1180×820 et 1024×768), aussi téléphone paysage (≈844×390) et ordinateur. Toute l'interface est en français.

## Arborescence
- `index.html` — charge `css/style.css`, `css/game-<id>.css` (un fichier par jeu), `css/parent.css`, puis `js/main.js`.
- `js/core/render.js` — `el(tag, attrs, ...children)` (helper DOM ; `style` accepte un objet, les clés `--var` sont supportées ; `onclick` etc.), `renderWord(word, {script, colors, size, syllables, bridge})`, `renderGrapheme(g, script, colors)`, `renderSentence(words, {script, colors, punct})`.
- `js/core/words.js` — format des mots, `parseGraphemes`, `buildWord`, `letterKinds`, `displayText(text, script)`, `shuffle`, `pickRandom`, `pickDistractors`, `similarity`.
- `js/core/library.js` — `allWords()`, `poolForLevel(level)`, `weightedPick(pool, n)`, `isWordActive(word)`, `invalidate()`.
- `js/core/state.js` — sauvegarde localStorage : `getState()`, `update(fn)`, `save()`, `resetProgress()`, `levelData(n)`, `isUnlocked(n)`, `scriptFor(level)`, `recordAnswer(word, ok)`, `awardRound(...)`, `STICKERS`, `MEDALS`, `exportJSON()`, `importJSON()`.
- `js/core/audio.js` — `speak(text, {slow})` (Promise, voix fr-FR du navigateur), `instruct(text)`, `stopSpeaking()`, `sfx(name)` (`tap|good|soft|win|star|pop|cut`), `frenchVoices()`, `randomPraise()`, `randomRetry()`.
- `js/core/fx.js` — `sparkle(node)`, `wiggle(node)`, `bounce(node)`, `confetti()`, `mascotSay(text, {say})`, `mascotSVG(mood)`.
- `js/core/gamehost.js` — hôte des jeux (en-tête 🏠 / 👂 consigne / ⭐, victoire, enchaînement des manches). **Lire ce fichier**.
- `js/games/index.js` — registre des jeux. `js/games/<id>.js` — un jeu = un module.
- `js/data/levels.js` — 7 niveaux / mondes. `js/data/words.js` — `WORDS`. `js/data/graphemes.js` — `GRAPHEMES`. `js/data/sentences.js` — `SMALL_WORDS`, `SENTENCES`.
- `js/screens/parent.js` — espace parent (`openParentGate({onExit})`).
- `js/main.js` — accueil, carte, menu, album. `window.__app` expose `showMenu(level)`, `play(gameId, level)`, `getState()` pour les tests.

## Objet « mot » à l'exécution (voir `buildWord`)
```js
{ id, text: 'chat', level: 3, img: '🐱',
  graphemes: [{t:'ch',k:'d',key:'ch'}, {t:'a',k:'v',key:'a'}, {t:'t',k:'m',key:'t_'}],
  syllables: ['chat'],            // syllabes ÉCRITES (to-ma-te), concaténées = text
  say: 'chat',                    // texte à prononcer
  sylSay: null | ['to','ma','teu'], // prononciation de chaque syllabe si fournie
  skills: ['ch','a','t_'] }
```
Types de graphème `k` : `v` voyelle (ROUGE), `c` consonne (BLEU), `d` digramme/trigramme (VERT, unité indivisible), `m` lettre muette (NOIR).

## Contrat d'un jeu
```js
export default {
  id: 'match', title: 'Je relie', icon: '🔗', color: '#ff8fab', minLevel: 1,
  instruction: (ctx) => 'Relie chaque mot à son image.',   // lue à voix haute
  start(root, ctx) { /* construit UNE manche dans root */ return { destroy() { /* retirer listeners globaux, timers */ } }; }
};
```
`ctx` : `level`, `script` (`'caps'|'bridge'|'lower'|'mixed'`), `colors` (bool), `settings`, `options`, `el`, `renderWord(w, opts)` (applique déjà script + couleurs), `renderGrapheme(g, opts)`, `renderSentence`, `pool()`, `pick(n, pool?)` (choisit n mots aux images distinctes, priorise les mots à travailler), `distractors(target, n, hard, pool?)`, `shuffle`, `pickRandom`, `speak`, `instruct`, `sfx`, `fx` {sparkle, wiggle, bounce, confetti, mascotSay}, `record(word, ok)`, `good(word, node, {say})`, `bad(word, node, {say})`, `win()`, `round` (n° de manche, 0 au départ).
- Appeler `ctx.good(word, node)` sur chaque bonne réponse, `ctx.bad(word, node)` sur chaque erreur (pas de croix rouge, pas de sanction : l'hôte fait un petit son doux + la mascotte encourage), puis `ctx.win()` une fois la manche finie (l'hôte affiche la victoire avec confettis et propose « encore »).
- Les images sont des **emoji** affichés dans `.emoji-img` (classe CSS déjà définie) ; `.img-card` = carte blanche arrondie.
- Pour l'écriture `'mixed'`, `renderWord` choisit au hasard capitales ou script pour chaque mot. Pour `'bridge'` il affiche les minuscules avec le mot en capitales en petit dessous.

## Règles d'UX (enfant de 5 ans qui ne lit pas encore les consignes)
- Très peu de texte ; consignes orales ; gros éléments tactiles (≥ 64 px) ; aucun lien externe ; pas de chronomètre ; pas de score comparatif ; jamais de croix rouge.
- Tactile d'abord : utiliser les **Pointer Events** (`pointerdown/move/up/cancel`, `setPointerCapture`), `touch-action: none` sur les zones de glisser. Toujours une **alternative par touchers successifs** au glisser-déposer.
- Doit tenir sans défilement dans 1180×820, 1024×768 et 844×390 (utiliser `clamp()`, `vh`, flex/grid).
- Le texte affiché aux enfants passe par `renderWord` (jamais de mot non colorié sauf si `ctx.colors === false`).
- Ne PAS confondre lettres et sons : ne jamais faire « prononcer » une consonne isolée par la synthèse vocale (elle dirait le nom de la lettre). Prononcer des mots ou des syllabes.

## Règles de travail
- Ne modifier QUE les fichiers de votre périmètre. Si un fichier du socle (`js/core/*`, `js/main.js`, `css/style.css`, `index.html`) a un bug ou s'il vous manque quelque chose, ne le modifiez pas : décrivez le besoin précis dans votre rapport final.
- Ne pas faire de `git commit` / `git push`.
- Tester réellement dans Chromium avec Playwright (`require('playwright')` fonctionne directement ; ne pas lancer `playwright install`). Servir le dossier avec `python3 -m http.server <port>` depuis `/home/user/kiddygame` (choisir un port libre propre à vous). Simuler le toucher avec `hasTouch: true` + `page.touchscreen.tap` et/ou des événements pointer souris (`page.mouse.down/move/up`). Pour sauter l'accueil : `localStorage.setItem('lirejoue.v1', JSON.stringify({child:{name:'Test'}}))` puis recharger, puis `window.__app.play('<id>', <niveau>)`.
- Scripts de test et captures : dans `/tmp/claude-0/-home-user-kiddygame/5c361172-5958-53e4-9f5c-73be2f6e8888/scratchpad/<votre-nom>/`. Regardez vos captures d'écran pour vérifier le rendu.
- Rapport final court : fichiers écrits, ce qui a été testé et comment, problèmes restants, besoins éventuels sur le socle.
