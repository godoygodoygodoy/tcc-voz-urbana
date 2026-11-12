import { publicationImages } from './publicationMedia.js';
export const includeProblem = {
  problema: {
    include: {
      categoria: true,
      usuario: { select: { id: true, nome: true, username: true, fotoPerfil: true } },
      imagens: true,
      atualizacoes: { orderBy: { dataCriacao: "desc" } },
      _count: { select: { votos: true } }
    }
  }
};

export const serializeSaved = (saved, req) => {
  const problem = saved.problema;
  return {
    ...problem,
    title: problem.titulo,
    description: problem.descricao,
    address: problem.endereco,
    cep: problem.cep,
    state: problem.estado,
    city: problem.cidade,
    createdAt: problem.dataCriacao,
    category: problem.categoria ? {
      id: problem.categoria.id,
      name: problem.categoria.nome,
      icon: problem.categoria.icone,
      color: problem.categoria.cor
    } : null,
    author: problem.usuario ? {
      id: problem.usuario.id,
      name: problem.usuario.nome,
      username: problem.usuario.username,
      avatar: problem.usuario.fotoPerfil
    } : null,
    images: publicationImages(problem.imagens, req),
    imagens: publicationImages(problem.imagens, req),
    updates: problem.atualizacoes || [],
    votes: problem._count?.votos || 0,
    savedAt: saved.criadaEm,
    savedByMe: true
  };
};

