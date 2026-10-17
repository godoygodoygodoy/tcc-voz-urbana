import "./config/environment.js";
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
import commentRoutes from "./routes/comments.js";
import notificationRoutes from "./routes/notifications.js";
import socialRoutes from "./routes/social.js";
import rateLimit from "express-rate-limit";
import { uploadedMedia } from "./config/media.js";

// Importar middlewares
import { errorHandler } from "./middlewares/errorHandler.js";
import { authMiddleware } from "./middlewares/auth.js";
import { adminMiddleware } from "./middlewares/auth.js";

const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

const corsOrigins = [process.env.CORS_ORIGIN, process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).origin : undefined]
  .filter(Boolean)
  .flatMap((origins) => origins.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV !== "production") {
  corsOrigins.push("http://localhost:3000");
}

// Middleware de segurança e parsing
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false, message: { error: "Muitas requisições. Tente novamente em alguns minutos." } }));

// Servir arquivos estáticos
app.use("/uploads", uploadedMedia);

// Health check independente do limite da API
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Rotas públicas
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/comments", commentRoutes);

// Rotas protegidas
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/votes", authMiddleware, voteRoutes);
app.use("/api/admin", authMiddleware, adminMiddleware, adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/social", authMiddleware, socialRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let server;

// Conectar ao banco e iniciar servidor
(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Conectado ao banco de dados MySQL via Prisma");

    server = app.listen(PORT, "0.0.0.0", () => {
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
const shutdown = async () => {
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  if (server) await new Promise((resolve) => server.close(resolve));
  console.log("\n🔌 Desconectando do banco de dados...");
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
