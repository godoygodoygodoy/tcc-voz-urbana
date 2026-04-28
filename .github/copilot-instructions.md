<!-- VOZ URBANA - Instrução para Copilot -->

# Projeto VOZ URBANA - Plataforma de Reportagem de Problemas Urbanos

## Visão Geral
Sistema completo full-stack para reportar, mapear e acompanhar soluções de problemas urbanos, com autenticação, votação comunitária e painel administrativo.

## Stack Tecnológico
- **Backend**: Node.js/Express + PostgreSQL + Sequelize
- **Frontend**: React 18 + Leaflet (mapas) + Tailwind CSS + Zustand
- **Database**: PostgreSQL 15
- **Autenticação**: JWT

## Como Executar

### 1. Banco de Dados
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

Veja [QUICKSTART.md](../QUICKSTART.md) para instruções detalhadas.

## Estrutura do Projeto

```
backend/
├── src/
│   ├── models/          # Sequelize models
│   ├── routes/          # API endpoints
│   ├── middlewares/     # Auth, errors
│   ├── config/          # Database config
│   └── server.js
├── package.json
└── .env.example

frontend/
├── src/
│   ├── components/      # React components
│   ├── pages/           # Route pages
│   ├── services/        # API client
│   ├── store/           # Zustand store
│   └── App.js
├── public/
├── tailwind.config.js
└── package.json
```

## Principais Funcionalidades

✅ Autenticação JWT com registro/login
✅ Reportar problemas com localização GPS
✅ Mapa interativo com Leaflet
✅ Sistema de votação comunitária
✅ Categorização de problemas
✅ Galeria de imagens
✅ Perfil de usuário
✅ Painel administrativo
✅ Filtros avançados

## Regras de Desenvolvimento

- Use o padrão de componentes React funcionais
- Implemente autenticação JWT em rotas protegidas
- Valide dados com Joi (backend) e formulários (frontend)
- Use Tailwind CSS para estilização
- Implemente tratamento de erros em todas as rotas
- Use async/await para operações assíncronas
- Adicione logs significativos para debugging

## Variáveis de Ambiente

**Backend (.env)**:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=voz_urbana
DB_USER=postgres
DB_PASSWORD=postgres
PORT=5000
NODE_ENV=development
JWT_SECRET=sua_chave_secreta
```

**Frontend (.env)**:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Próximos Passos Recomendados

1. Implementar upload de imagens real (S3/Firebase)
2. Adicionar WebSockets para notificações em tempo real
3. Criar sistema de comentários
4. Integrar OAuth (Google, GitHub)
5. Implementar testes automatizados
6. Deploy em produção
