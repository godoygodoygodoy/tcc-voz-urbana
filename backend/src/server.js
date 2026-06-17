import express from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import "dotenv/config";

// Importar banco de dados
import { prisma } from "./config/prisma.js";

// Importar rotas
import authRoutes from "./routes/auth.js";
import problemRoutes from "./routes/problems.js";
import userRoutes from "./routes/users.js";
import categoryRoutes from "./routes/categories.js";
import voteRoutes from "./routes/votes.js";
import adminRoutes from "./routes/admin.js";

// Importar middlewares
import { errorHandler } from "./middlewares/errorHandler.js";
import { authMiddleware } from "./middlewares/auth.js";

const app = express();

// Middleware de segurança e parsing
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Servir arquivos estáticos
app.use("/uploads", express.static("uploads"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Rotas públicas
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/problems", problemRoutes);

// Rotas protegidas
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/votes", authMiddleware, voteRoutes);
app.use("/api/admin", authMiddleware, adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Conectar ao banco e iniciar servidor
(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Conectado ao banco de dados MySQL via Prisma");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`Ambiente: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("❌ Erro ao conectar ao banco:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🔌 Desconectando do banco de dados...");
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
