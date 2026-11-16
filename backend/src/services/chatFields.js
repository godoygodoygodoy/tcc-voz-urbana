import { publicUser } from './socialGraph.js';
export const chatMessageInclude = {
  remetente: {
    select: publicUser
  },
  resposta: {
    select: {
      id: true,
      texto: true,
      remetenteId: true
    }
  },
  reacoes: {
    select: {
      usuarioId: true,
      emoji: true
    }
  }
};
