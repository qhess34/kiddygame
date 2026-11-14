// STUB — en cours d'écriture
export default {
  id: 'listen', title: 'listen', icon: '🧩', color: '#999', minLevel: 1,
  instruction: () => 'Jeu en préparation.',
  start(root, ctx) { root.append(ctx.el('p', {}, 'Bientôt !')); return { destroy() {} }; },
};
