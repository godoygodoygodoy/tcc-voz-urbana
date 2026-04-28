const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('express-async-errors');
require('dotenv').config();

// Importar rotas
const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const voteRoutes = require('./routes/votes');
const adminRoutes = require('./routes/admin');

// Importar middlewares
const { errorHandler } = require('./middlewares/errorHandler');
const { authMiddleware } = require('./middlewares/auth');

const app = express();

// Middleware de segurança e parsing
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Servir arquivos estáticos
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rotas públicas
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/problems', problemRoutes);

// Rotas protegidas
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/votes', authMiddleware, voteRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV}`);
});

module.exports = server;
