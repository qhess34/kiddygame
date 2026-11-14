// Les 7 niveaux (mondes) de l'application.
// script : écriture utilisée en mode "auto" (réglage parent "Écriture : automatique").
//   caps   = CAPITALES
//   bridge = minuscules script + rappel en capitales dessous (découverte)
//   lower  = minuscules script
//   mixed  = mélange capitales / minuscules
export const LEVELS = [
  {
    n: 1, world: 'La forêt des lettres', title: 'Je découvre les lettres et les sons',
    script: 'caps', emoji: '🌳', bg: ['#d8f3c4', '#a8e08a'], color: '#3f9b2f',
  },
  {
    n: 2, world: 'Le village des syllabes', title: 'Je lis mes premiers mots',
    script: 'caps', emoji: '🏡', bg: ['#ffe9c2', '#ffd08a'], color: '#d9822b',
  },
  {
    n: 3, world: 'La montagne des digrammes', title: 'Je découvre les digrammes',
    script: 'caps', emoji: '⛰️', bg: ['#d7ecff', '#a9d1ff'], color: '#2f7bd9',
  },
  {
    n: 4, world: 'Le château des mots', title: 'Je lis des mots plus complexes',
    script: 'caps', emoji: '🏰', bg: ['#eadcff', '#cdb2ff'], color: '#7a4fd1',
  },
  {
    n: 5, world: 'Le jardin des minuscules', title: 'Je découvre les minuscules',
    script: 'bridge', emoji: '🌷', bg: ['#ffe0ec', '#ffb8d2'], color: '#d94f86',
  },
  {
    n: 6, world: "L'île du script", title: 'Je lis en script',
    script: 'lower', emoji: '🏝️', bg: ['#d2f7f2', '#94e6dc'], color: '#1f9e8f',
  },
  {
    n: 7, world: 'Le royaume des petits lecteurs', title: 'Je deviens un champion de lecture',
    script: 'mixed', emoji: '👑', bg: ['#fff3b8', '#ffe066'], color: '#c99a00',
  },
];

// Nombre d'étoiles à gagner dans un niveau pour débloquer le suivant.
export const STARS_TO_UNLOCK = 10;

export function levelInfo(n) {
  return LEVELS[Math.max(1, Math.min(7, n)) - 1];
}
