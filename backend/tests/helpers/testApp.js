import express from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";

// Importar rotas
import authRoutes from "../../src/routes/auth.js";
import problemRoutes from "../../src/routes/problems.js";
import userRoutes from "../../src/routes/users.js";
import categoryRoutes from "../../src/routes/categories.js";
import voteRoutes from "../../src/routes/votes.js";
import adminRoutes from "../../src/routes/admin.js";

// Importar middlewares
import { errorHandler } from "../../src/middlewares/errorHandler.js";
import { authMiddleware } from "../../src/middlewares/auth.js";

/**
 * Cria uma instância do app Express para testes
 * Não inicia o servidor, apenas configura as rotas e middlewares
 */
export const createTestApp = () => {
  const app = express();

  // Middleware de segurança e parsing
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

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

  return app;
};
