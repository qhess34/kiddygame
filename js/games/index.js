// Registre des jeux. Pour ajouter un jeu : créer js/games/monjeu.js
// (voir le contrat dans js/core/gamehost.js) et l'ajouter à cette liste.
import match from './match.js';
import build from './build.js';
import syllables from './syllables.js';
import mystery from './mystery.js';
import listen from './listen.js';
import cases from './cases.js';
import sentences from './sentences.js';

// Les 5 modes principaux, puis les jeux bonus qui apparaissent selon le niveau.
export const GAMES = [match, build, syllables, mystery, listen, cases, sentences];

export function gamesForLevel(level) {
  return GAMES.filter((g) => level >= (g.minLevel || 1) && (!g.maxLevel || level <= g.maxLevel));
}

export function gameById(id) { return GAMES.find((g) => g.id === id); }
