// Progression des graphèmes (ordre d'introduction).
//   key     : clé utilisée dans word.skills (lettre muette = lettre + "_")
//   label   : affichage pour le parent
//   kind    : v voyelle (rouge) · c consonne (bleu) · d digramme/trigramme (vert) · m muette (noir)
//   level   : niveau où le graphème apparaît pour la première fois dans la bibliothèque
//   example : un mot de la bibliothèque (WORDS, ou SMALL_WORDS pour « un ») qui l'utilise
//   sound   : son codé, pour le parent
// tests/validate-words.mjs vérifie qu'aucun mot n'emploie un graphème d'un niveau supérieur au sien.
export const GRAPHEMES = [
  // ── Niveau 1 : voyelles simples et consonnes « régulières »
  { key: 'a', label: 'a', kind: 'v', level: 1, example: 'lama', sound: '[a] comme papa' },
  { key: 'i', label: 'i', kind: 'v', level: 1, example: 'mami', sound: '[i] comme kiwi' },
  { key: 'o', label: 'o', kind: 'v', level: 1, example: 'moto', sound: '[o] comme moto' },
  { key: 'u', label: 'u', kind: 'v', level: 1, example: 'judo', sound: '[y] comme judo' },
  { key: 'é', label: 'é', kind: 'v', level: 1, example: 'vélo', sound: '[e] comme bébé' },
  { key: 'm', label: 'm', kind: 'c', level: 1, example: 'moto', sound: '[m] comme moto' },
  { key: 'l', label: 'l', kind: 'c', level: 1, example: 'lama', sound: '[l] comme lama' },
  { key: 'p', label: 'p', kind: 'c', level: 1, example: 'papa', sound: '[p] comme papa' },
  { key: 't', label: 't', kind: 'c', level: 1, example: 'moto', sound: '[t] comme moto' },
  { key: 'r', label: 'r', kind: 'c', level: 1, example: 'radio', sound: '[ʁ] comme radio' },
  { key: 'v', label: 'v', kind: 'c', level: 1, example: 'vélo', sound: '[v] comme vélo' },
  { key: 's', label: 's', kind: 'c', level: 1, example: 'sofa', sound: '[s] comme sofa ([z] entre deux voyelles : rose)' },
  { key: 'f', label: 'f', kind: 'c', level: 1, example: 'sofa', sound: '[f] comme fil' },
  { key: 'n', label: 'n', kind: 'c', level: 1, example: 'kimono', sound: '[n] comme piano' },
  { key: 'd', label: 'd', kind: 'c', level: 1, example: 'radio', sound: '[d] comme dé' },
  { key: 'b', label: 'b', kind: 'c', level: 1, example: 'bébé', sound: '[b] comme bébé' },
  { key: 'k', label: 'k', kind: 'c', level: 1, example: 'kiwi', sound: '[k] comme koala' },
  { key: 'c', label: 'c', kind: 'c', level: 1, example: 'café', sound: '[k] comme café ([s] devant e, i : cerise)' },
  { key: 'j', label: 'j', kind: 'c', level: 1, example: 'judo', sound: '[ʒ] comme judo' },
  { key: 'z', label: 'z', kind: 'c', level: 1, example: 'zéro', sound: '[z] comme zéro' },
  { key: 'w', label: 'w', kind: 'c', level: 1, example: 'kiwi', sound: '[w] comme kiwi' },

  // ── Niveau 2 : e muet, è / ê, t muet, g, x, y
  { key: 'e_', label: 'e muet', kind: 'm', level: 2, example: 'lune', sound: 'ne se prononce pas (lune)' },
  { key: 'è', label: 'è', kind: 'v', level: 2, example: 'zèbre', sound: '[ɛ] comme zèbre' },
  { key: 'ê', label: 'ê', kind: 'v', level: 2, example: 'fête', sound: '[ɛ] comme fête' },
  { key: 't_', label: 't muet', kind: 'm', level: 2, example: 'lit', sound: 'ne se prononce pas (lit, robot)' },
  { key: 'g', label: 'g', kind: 'c', level: 2, example: 'tigre', sound: '[g] comme tigre ([ʒ] devant e, i : girafe)' },
  { key: 'x', label: 'x', kind: 'c', level: 2, example: 'taxi', sound: '[ks] comme taxi ([s] dans six, dix)' },
  { key: 'y', label: 'y', kind: 'c', level: 2, example: 'yoyo', sound: '[j] comme yoyo (voyelle [i] dans stylo, cygne)' },

  // ── Niveau 3 : premiers digrammes, e [ə], muettes s, p, h
  { key: 'ch', label: 'ch', kind: 'd', level: 3, example: 'chat', sound: '[ʃ] comme chat' },
  { key: 'ou', label: 'ou', kind: 'd', level: 3, example: 'chou', sound: '[u] comme chou' },
  { key: 'on', label: 'on', kind: 'd', level: 3, example: 'mouton', sound: '[ɔ̃] comme mouton' },
  { key: 'an', label: 'an', kind: 'd', level: 3, example: 'maman', sound: '[ɑ̃] comme maman' },
  { key: 'en', label: 'en', kind: 'd', level: 3, example: 'dent', sound: '[ɑ̃] comme dent' },
  { key: 'in', label: 'in', kind: 'd', level: 3, example: 'sapin', sound: '[ɛ̃] comme sapin' },
  { key: 'ain', label: 'ain', kind: 'd', level: 3, example: 'pain', sound: '[ɛ̃] comme pain' },
  { key: 'ai', label: 'ai', kind: 'd', level: 3, example: 'lait', sound: '[ɛ] comme lait' },
  { key: 'eu', label: 'eu', kind: 'd', level: 3, example: 'feu', sound: '[ø] comme feu ([œ] dans fleur)' },
  { key: 'oi', label: 'oi', kind: 'd', level: 3, example: 'poire', sound: '[wa] comme poire' },
  { key: 'e', label: 'e', kind: 'v', level: 3, example: 'cheval', sound: '[ə] comme cheval ([ɛ] devant deux consonnes : serpent)' },
  { key: 's_', label: 's muet', kind: 'm', level: 3, example: 'souris', sound: 'ne se prononce pas (souris)' },
  { key: 'p_', label: 'p muet', kind: 'm', level: 3, example: 'loup', sound: 'ne se prononce pas (loup)' },
  { key: 'h_', label: 'h muet', kind: 'm', level: 3, example: 'hibou', sound: 'ne se prononce pas (hibou)' },

  // ── Niveau 4 : graphèmes complexes, lettres doublées, finales er / ez / et
  { key: 'eau', label: 'eau', kind: 'd', level: 4, example: 'bateau', sound: '[o] comme bateau' },
  { key: 'au', label: 'au', kind: 'd', level: 4, example: 'dauphin', sound: '[o] comme dauphin' },
  { key: 'â', label: 'â', kind: 'v', level: 4, example: 'gâteau', sound: '[a] comme gâteau' },
  { key: 'ien', label: 'ien', kind: 'd', level: 4, example: 'chien', sound: '[jɛ̃] comme chien' },
  { key: 'am', label: 'am', kind: 'd', level: 4, example: 'champignon', sound: '[ɑ̃] comme champignon (devant m, b, p)' },
  { key: 'om', label: 'om', kind: 'd', level: 4, example: 'pompier', sound: '[ɔ̃] comme pompier (devant m, b, p)' },
  { key: 'gn', label: 'gn', kind: 'd', level: 4, example: 'champignon', sound: '[ɲ] comme champignon' },
  { key: 'ph', label: 'ph', kind: 'd', level: 4, example: 'dauphin', sound: '[f] comme dauphin' },
  { key: 'qu', label: 'qu', kind: 'd', level: 4, example: 'requin', sound: '[k] comme requin' },
  { key: 'gu', label: 'gu', kind: 'd', level: 4, example: 'guitare', sound: '[g] comme guitare' },
  { key: 'ill', label: 'ill', kind: 'd', level: 4, example: 'papillon', sound: '[ij] / [j] comme fille, papillon' },
  { key: 'er', label: 'er', kind: 'd', level: 4, example: 'panier', sound: '[e] comme panier (er final)' },
  { key: 'ez', label: 'ez', kind: 'd', level: 4, example: 'nez', sound: '[e] comme nez' },
  { key: 'et', label: 'et', kind: 'd', level: 4, example: 'poulet', sound: '[ɛ] comme poulet (et final)' },
  { key: 'œu', label: 'œu', kind: 'd', level: 4, example: 'cœur', sound: '[œ] comme cœur' },
  { key: 'ss', label: 'ss', kind: 'd', level: 4, example: 'poisson', sound: '[s] comme poisson' },
  { key: 'll', label: 'll', kind: 'd', level: 4, example: 'ballon', sound: '[l] comme ballon' },
  { key: 'tt', label: 'tt', kind: 'd', level: 4, example: 'carotte', sound: '[t] comme carotte' },
  { key: 'mm', label: 'mm', kind: 'd', level: 4, example: 'pomme', sound: '[m] comme pomme' },
  { key: 'nn', label: 'nn', kind: 'd', level: 4, example: 'couronne', sound: '[n] comme couronne' },

  // ── Niveau 5 : d muet, z muet
  { key: 'd_', label: 'd muet', kind: 'm', level: 5, example: 'renard', sound: 'ne se prononce pas (renard)' },
  { key: 'z_', label: 'z muet', kind: 'm', level: 5, example: 'riz', sound: 'ne se prononce pas (riz)' },

  // ── Niveau 6
  { key: 'ei', label: 'ei', kind: 'd', level: 6, example: 'baleine', sound: '[ɛ] comme baleine' },
  { key: 'ô', label: 'ô', kind: 'v', level: 6, example: 'fantôme', sound: '[o] comme fantôme' },
  { key: 'ç', label: 'ç', kind: 'c', level: 6, example: 'garçon', sound: '[s] comme garçon' },
  { key: 'rr', label: 'rr', kind: 'd', level: 6, example: 'beurre', sound: '[ʁ] comme beurre' },
  { key: 'zz', label: 'zz', kind: 'd', level: 6, example: 'pizza', sound: '[dz] comme pizza' },

  // ── Niveau 7 : graphèmes rares
  { key: 'eil', label: 'eil', kind: 'd', level: 7, example: 'soleil', sound: '[ɛj] comme soleil' },
  { key: 'eill', label: 'eill', kind: 'd', level: 7, example: 'abeille', sound: '[ɛj] comme abeille' },
  { key: 'euil', label: 'euil', kind: 'd', level: 7, example: 'écureuil', sound: '[œj] comme écureuil' },
  { key: 'euill', label: 'euill', kind: 'd', level: 7, example: 'feuille', sound: '[œj] comme feuille' },
  { key: 'ouill', label: 'ouill', kind: 'd', level: 7, example: 'grenouille', sound: '[uj] comme grenouille' },
  { key: 'aon', label: 'aon', kind: 'd', level: 7, example: 'paon', sound: '[ɑ̃] comme paon' },
  { key: 'un', label: 'un', kind: 'd', level: 7, example: 'un', sound: '[œ̃] comme un' },
  { key: 'gh', label: 'gh', kind: 'd', level: 7, example: 'spaghetti', sound: '[g] comme spaghetti' },
  { key: 'pp', label: 'pp', kind: 'd', level: 7, example: 'hippopotame', sound: '[p] comme hippopotame' },
  { key: 'gg', label: 'gg', kind: 'd', level: 7, example: 'toboggan', sound: '[g] comme toboggan' },
  { key: 'cc', label: 'cc', kind: 'd', level: 7, example: 'accordéon', sound: '[k] comme accordéon' },
  { key: 'î', label: 'î', kind: 'v', level: 7, example: 'île', sound: '[i] comme île' },
  { key: 'ï', label: 'ï', kind: 'v', level: 7, example: 'maïs', sound: '[i] comme maïs (se lit séparément du a)' },
  { key: 'f_', label: 'f muet', kind: 'm', level: 7, example: 'cerf', sound: 'ne se prononce pas (cerf)' },
  { key: 'x_', label: 'x muet', kind: 'm', level: 7, example: 'ciseaux', sound: 'ne se prononce pas (ciseaux, yeux)' },
  { key: 'i_', label: 'i muet', kind: 'm', level: 7, example: 'oignon', sound: 'ne se prononce pas (oignon)' },
  { key: 'sh', label: 'sh', kind: 'd', level: 7, example: 'sushi', sound: '[ʃ] comme sushi' },
  { key: 'q', label: 'q', kind: 'c', level: 7, example: 'coq', sound: '[k] comme coq (q final)' },
  { key: 'ail', label: 'ail', kind: 'd', level: 7, example: 'corail', sound: '[aj] comme corail' },
  { key: 'aî', label: 'aî', kind: 'd', level: 7, example: 'chaîne', sound: '[ɛ] comme chaîne' },
  { key: 'ay', label: 'ay', kind: 'd', level: 7, example: 'crayon', sound: '[ɛj] comme crayon' },
  { key: 'im', label: 'im', kind: 'd', level: 7, example: 'imprimante', sound: '[ɛ̃] comme imprimante (devant m, b, p)' },
  { key: 'û', label: 'û', kind: 'v', level: 7, example: 'flûte', sound: '[y] comme flûte' },
];
