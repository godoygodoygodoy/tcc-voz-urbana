import { prisma } from "../../src/config/prisma.js";
import jwt from "jsonwebtoken";

/**
 * Limpa todas as tabelas do banco de dados de teste
 * Usa deleteMany do Prisma ao invés de TRUNCATE para ser mais seguro
 */
export const cleanDatabase = async () => {
  // Ordem importa - deletar registros filhos antes dos pais
  const deletions = [
    prisma.voto.deleteMany(),
    prisma.imagem.deleteMany(),
    prisma.problema.deleteMany(),
    prisma.categoria.deleteMany(),
    prisma.log.deleteMany().catch(() => {}), // Ignorar se tabela não existe
    prisma.admin.deleteMany().catch(() => {}), // Ignorar se tabela não existe
    prisma.usuario.deleteMany()
  ];

  await Promise.all(deletions);
};

/**
 * Cria um usuário de teste
 */
export const createTestUser = async (data = {}) => {
  const { hashPassword } = await import("../../src/utils/password.js");

  const defaultData = {
    nome: "Test User",
    email: `test-${Date.now()}@example.com`,
    senhaHash: await hashPassword("password123")
  };

  return prisma.usuario.create({
    data: { ...defaultData, ...data }
  });
};

/**
 * Cria uma categoria de teste
 */
export const createTestCategory = async (data = {}) => {
  const defaultData = {
    nome: "Test Category",
    descricao: "Categoria de teste",
    icone: "🧪",
    cor: "#FF0000"
  };

  return prisma.categoria.create({
    data: { ...defaultData, ...data }
  });
};

/**
 * Cria um problema de teste
 */
export const createTestProblem = async (userId, categoryId, data = {}) => {
  const defaultData = {
    titulo: "Problema de Teste",
    descricao: "Descrição do problema de teste",
    latitude: -23.5505,
    longitude: -46.6333,
    status: "ABERTO"
  };

  return prisma.problema.create({
    data: {
      ...defaultData,
      ...data,
      usuarioId: userId,
      categoriaId: categoryId
    }
  });
};

/**
 * Gera um token JWT para testes
 */
export const generateTestToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    process.env.JWT_SECRET || "test-secret-key",
    { expiresIn: "1h" }
  );
};

/**
 * Cria um admin de teste
 */
export const createTestAdmin = async (user) => {
  return prisma.admin.create({
    data: {
      usuarioId: user.id,
      nivel: "ADMIN"
    }
  });
};
