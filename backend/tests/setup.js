import { prisma } from "../src/config/prisma.js";
import "dotenv/config";

// Garantir que JWT_SECRET está definido
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secret-key-for-jest";
}

// Conectar ao banco antes de todos os testes
beforeAll(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Conectado ao banco de dados para testes");
  } catch (error) {
    console.error("❌ Erro ao conectar ao banco de dados:", error);
    throw error;
  }
});

// Desconectar do banco após todos os testes
afterAll(async () => {
  try {
    await prisma.$disconnect();
    console.log("✅ Desconectado do banco de dados");
  } catch (error) {
    console.error("❌ Erro ao desconectar do banco:", error);
  }
});

// Mensagens de erro mais detalhadas
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
