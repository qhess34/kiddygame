// Mots-outils et petites phrases (niveau 7).
//
// SMALL_WORDS : mots sans image (déterminants, pronoms, verbes, adjectifs, mots de l'énoncé
// sans emoji non ambigu comme « petit », « radis », « jardin »). Même format que WORDS
// (w / g / s, option say / ssay), mêmes règles de segmentation (voir js/data/words.js).
// `say` est fourni quand la synthèse vocale lirait mal le mot isolé (ex. « est », « et »).
export const SMALL_WORDS = [
  // déterminants, pronoms
  { w: 'le', g: 'l e', s: 'le', say: 'leu' },
  { w: 'la', g: 'l a', s: 'la' },
  { w: 'un', g: 'un', s: 'un' },
  { w: 'une', g: 'u n e_', s: 'u-ne', ssay: ['u', 'neu'] },
  { w: 'il', g: 'i l', s: 'il' },
  { w: 'elle', g: 'e ll e_', s: 'el-le', ssay: ['è', 'leu'] },
  // petits mots
  { w: 'est', g: 'e s_ t_', s: 'est', say: 'è' },
  { w: 'a', g: 'a', s: 'a' },
  { w: 'et', g: 'et', s: 'et', say: 'é' },
  { w: 'du', g: 'd u', s: 'du' },
  { w: 'de', g: 'd e', s: 'de', say: 'deu' },
  { w: 'sur', g: 's u r', s: 'sur' },
  { w: 'sous', g: 's ou s_', s: 'sous' },
  { w: 'dans', g: 'd an s_', s: 'dans' },
  { w: 'avec', g: 'a v e c', s: 'a-vec', ssay: ['a', 'vèk'] },
  // verbes
  { w: 'mange', g: 'm an g e_', s: 'man-ge', ssay: ['man', 'jeu'] },
  { w: 'boit', g: 'b oi t_', s: 'boit' },
  { w: 'dort', g: 'd o r t_', s: 'dort' },
  { w: 'joue', g: 'j ou e_', s: 'joue' },
  { w: 'court', g: 'c ou r t_', s: 'court' },
  { w: 'saute', g: 's au t e_', s: 'sau-te', ssay: ['so', 'teu'] },
  { w: 'nage', g: 'n a g e_', s: 'na-ge', ssay: ['na', 'jeu'] },
  { w: 'vole', g: 'v o l e_', s: 'vo-le', ssay: ['vo', 'leu'] },
  // adjectifs
  { w: 'petit', g: 'p e t i t_', s: 'pe-tit', ssay: ['peu', 'ti'] },
  { w: 'gros', g: 'g r o s_', s: 'gros' },
  { w: 'grand', g: 'g r an d_', s: 'grand' },
  { w: 'rouge', g: 'r ou g e_', s: 'rou-ge', ssay: ['rou', 'jeu'] },
  { w: 'bleu', g: 'b l eu', s: 'bleu' },
  { w: 'vert', g: 'v e r t_', s: 'vert' },
  { w: 'jaune', g: 'j au n e_', s: 'jau-ne', ssay: ['jo', 'neu'] },
  // mots de l'énoncé sans emoji non ambigu
  { w: 'radis', g: 'r a d i s_', s: 'ra-dis', ssay: ['ra', 'di'] },
  { w: 'jardin', g: 'j a r d in', s: 'jar-din' },
];

// SENTENCES : mots séparés par une espace (chacun présent dans WORDS ou SMALL_WORDS),
// img = illustration (1 à 3 emoji), lvl = niveau, group = famille de phrases qui ne
// diffèrent que d'un élément (sujet, objet, lieu, couleur). Les images d'un même groupe
// sont toutes différentes (et, ici, toutes les images sont différentes entre elles).
export const SENTENCES = [
  // Qui boit du lait ? (le sujet change)
  { text: 'le chat boit du lait', img: '🐱🥛', lvl: 7, group: 'boit-lait' },
  { text: 'le chien boit du lait', img: '🐶🥛', lvl: 7, group: 'boit-lait' },
  { text: 'le cochon boit du lait', img: '🐷🥛', lvl: 7, group: 'boit-lait' },
  { text: 'le bébé boit du lait', img: '👶🥛', lvl: 7, group: 'boit-lait' },

  // Qui mange quoi ? (sujet ou objet change)
  { text: 'le lapin mange une carotte', img: '🐰🥕', lvl: 7, group: 'mange' },
  { text: 'le lapin mange une pomme', img: '🐰🍎', lvl: 7, group: 'mange' },
  { text: 'le singe mange une banane', img: '🐒🍌', lvl: 7, group: 'mange' },
  { text: 'le chat mange un poisson', img: '🐱🐟', lvl: 7, group: 'mange' },

  // Le bébé mange / boit... (l'objet change)
  { text: 'le bébé mange une banane', img: '👶🍌', lvl: 7, group: 'bebe' },
  { text: 'le bébé mange une pomme', img: '👶🍎', lvl: 7, group: 'bebe' },
  { text: 'le bébé mange du chocolat', img: '👶🍫', lvl: 7, group: 'bebe' },
  { text: 'le bébé boit du jus', img: '👶🧃', lvl: 7, group: 'bebe' },

  // Qui dort ? (le sujet change)
  { text: 'le chat dort', img: '🐱💤', lvl: 7, group: 'dort' },
  { text: 'le chien dort', img: '🐶💤', lvl: 7, group: 'dort' },
  { text: 'le bébé dort', img: '👶💤', lvl: 7, group: 'dort' },
  { text: 'le lapin dort', img: '🐰💤', lvl: 7, group: 'dort' },

  // Qui lit un livre ? (le sujet change)
  { text: 'papa lit un livre', img: '👨📖', lvl: 7, group: 'lit' },
  { text: 'maman lit un livre', img: '👩📖', lvl: 7, group: 'lit' },
  { text: 'mami lit un livre', img: '👵📖', lvl: 7, group: 'lit' },
  { text: 'papi lit un livre', img: '👴📖', lvl: 7, group: 'lit' },

  // De quelle couleur est le cœur ? (la couleur change)
  { text: 'le cœur est rouge', img: '❤️', lvl: 7, group: 'coeur' },
  { text: 'le cœur est bleu', img: '💙', lvl: 7, group: 'coeur' },
  { text: 'le cœur est vert', img: '💚', lvl: 7, group: 'coeur' },
  { text: 'le cœur est jaune', img: '💛', lvl: 7, group: 'coeur' },

  // De quelle couleur est le livre ? (la couleur change)
  { text: 'le livre est rouge', img: '📕', lvl: 7, group: 'livre' },
  { text: 'le livre est bleu', img: '📘', lvl: 7, group: 'livre' },
  { text: 'le livre est vert', img: '📗', lvl: 7, group: 'livre' },
  { text: 'le livre est orange', img: '📙', lvl: 7, group: 'livre' },

  // Où est le chat ? (le lieu ou le sujet change)
  { text: 'le chat est dans la maison', img: '🐱🏠', lvl: 7, group: 'dans' },
  { text: 'le chat est dans la voiture', img: '🐱🚗', lvl: 7, group: 'dans' },
  { text: 'le chien est dans la voiture', img: '🐶🚗', lvl: 7, group: 'dans' },
  { text: 'le chat est dans le bateau', img: '🐱⛵', lvl: 7, group: 'dans' },

  // Avec quoi joue-t-il ? (sujet ou objet change)
  { text: 'le chat joue avec le ballon', img: '🐱⚽', lvl: 7, group: 'joue' },
  { text: 'le chien joue avec le ballon', img: '🐶⚽', lvl: 7, group: 'joue' },
  { text: 'le chien joue avec un os', img: '🐶🦴', lvl: 7, group: 'joue' },
];
