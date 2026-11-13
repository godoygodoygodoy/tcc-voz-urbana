import geographyRoutes from './routes/geography.js';
import trackingRoutes from './routes/tracking.js';
import profileFeatureRoutes from './routes/profileFeatures.js';
import sharingRoutes,{publicShareRouter} from './routes/sharing.js';
import { createProblemStatus, startStatusDelivery } from './services/problemStatus.js';
import { announceNotification } from './utils/notifications.js';
import participationRoutes from './routes/participation.js';
import { stopAchievementChecks } from './services/achievementQueue.js';
import pollRoutes from './routes/polls.js';
import storyRoutes from './routes/stories.js';
import { startStoryCleanup } from './services/stories.js';
import { removeStoredFiles } from './config/storage.js';
import collectionRoutes from './routes/collections.js';
import publicationMediaRoutes from './routes/media.js';
import { securePublicationStorage } from './config/storage.js';
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
import socialRoutes, { publicSocialRouter } from "./routes/social.js";
import savedRoutes from "./routes/saved.js";
import conversationRoutes from "./routes/conversations.js";
import visitRoutes from "./routes/visits.js";
import rateLimit from "express-rate-limit";
import { uploadedMedia } from "./config/media.js";
import { startAutomaticBackup } from './services/automaticBackup.js';
import { checkPersistenceIdentity } from './config/persistence.js';

// Importar middlewares
import { errorHandler } from "./middlewares/errorHandler.js";
import { authMiddleware } from "./middlewares/auth.js";
import { adminMiddleware } from "./middlewares/auth.js";

const app = express();
app.set("trust proxy", 1);

const corsOrigins = [process.env.CORS_ORIGIN, process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).origin : undefined]
  .filter(Boolean)
  .flatMap((origins) => origins.split(","))
  .map((origin) => origin.trim())
  .map((origin) => origin.replace(/\/+$/, ""))
  .filter(Boolean);

if (process.env.NODE_ENV !== "production") {
  corsOrigins.push("http://localhost:3000");
  corsOrigins.push("http://127.0.0.1:3000");
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
// Read polling and media ranges have a separate budget from state-changing requests.
app.use('/api/', rateLimit({ windowMs:15*60*1000,limit:900,skip:req=>!['GET','HEAD'].includes(req.method),standardHeaders:true,legacyHeaders:false,message:{error:'requestRateLimited'} }));
app.use('/api/', rateLimit({ windowMs:15*60*1000,limit:300,skip:req=>['GET','HEAD'].includes(req.method),standardHeaders:true,legacyHeaders:false,message:{error:'requestRateLimited'} }));
app.use('/api/auth/', rateLimit({ windowMs:15*60*1000,limit:20,skipSuccessfulRequests:true,standardHeaders:true,legacyHeaders:false,message:{error:'requestRateLimited'} }));

// Servir arquivos estáticos
app.use("/uploads", uploadedMedia);

// Health check independente do limite da API
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use('/api', (req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });

// Rotas públicas
app.use("/api/auth", authRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/media", publicationMediaRoutes);
app.use("/api/comments", commentRoutes);
app.use('/api/social', publicSocialRouter);

// Rotas protegidas
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/votes", authMiddleware, voteRoutes);
app.use("/api/admin", authMiddleware, adminMiddleware, adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/social", authMiddleware, socialRoutes);
app.use("/api/conversations", authMiddleware, conversationRoutes);
app.use("/api/saved", savedRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api/participation", participationRoutes);
app.use("/api/geography", geographyRoutes);
app.use('/api/tracking',trackingRoutes);
app.use('/api/profile-features',profileFeatureRoutes);
app.use('/api/shares',sharingRoutes);
app.use('/share',publicShareRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let server;
let stopBackups = () => {};
let stopStories = () => {};
let stopStatus = () => {};

// Conectar ao banco e iniciar servidor
(async () => {
  try {
    checkPersistenceIdentity();
    await prisma.$connect();
    await prisma.usuario.findFirst({ select: { perfilPrivado: true } });
    await securePublicationStorage();
    stopBackups = startAutomaticBackup();
    stopStories = startStoryCleanup(prisma, removeStoredFiles);
    stopStatus = startStatusDelivery(createProblemStatus(prisma), announceNotification);
    console.log("✅ Conectado ao banco de dados MySQL via Prisma");

    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(JSON.stringify({ event: "server_listening", host: "0.0.0.0", port: Number(PORT) }));
      console.log(`Ambiente: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error(JSON.stringify({event:'database_startup_failed', time:new Date().toISOString(), code:error.code || error.name}));
    await prisma.$disconnect();
    process.exit(1);
  }
})();

// Graceful shutdown
const shutdown = async () => {
  stopBackups();
  stopStories();
  stopStatus();
  stopAchievementChecks();
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
