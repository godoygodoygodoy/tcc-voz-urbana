# VOZ URBANA - Plataforma de Reportagem de Problemas Urbanos

Plataforma colaborativa para reportar, mapear e acompanhar soluções de problemas urbanos na cidade.

## 🚀 Características

- **Reportagem de Problemas**: Usuários podem reportar problemas urbanos com localização, fotos e detalhes
- **Mapa Interativo**: Visualização de todos os problemas em um mapa com geolocalização
- **Sistema de Votação**: Comunidade pode apoiar problemas para priorizar soluções
- **Categorização**: Problemas organizados por categorias (buracos, iluminação, limpeza, etc)
- **Autenticação**: Sistema seguro com JWT para registro e login
- **Painel Administrativo**: Ferramentas para gerenciar problemas e acompanhar estatísticas
- **Galeria de Imagens**: Usuários podem enviar múltiplas fotos dos problemas
- **Perfil de Usuário**: Usuários podem manter perfil e histórico de reportagens

## 🛠 Tech Stack

### Backend
- **Node.js + Express**: API REST
- **PostgreSQL**: Banco de dados relacional
- **Sequelize**: ORM para Node.js
- **JWT**: Autenticação
- **Bcryptjs**: Hash de senhas

### Frontend
- **React 18**: Interface de usuário
- **React Router**: Navegação
- **Leaflet + React-Leaflet**: Mapas interativos
- **Zustand**: Gerenciamento de estado
- **Tailwind CSS**: Estilização
- **Axios**: Requisições HTTP

## 📋 Pré-requisitos

- Node.js 16+
- PostgreSQL 12+
- Docker (opcional, para executar PostgreSQL)
- npm ou yarn

## 🚀 Como Executar

### 1. Configurar Banco de Dados

Com Docker:
```bash
docker-compose up -d
```

Ou configure PostgreSQL manualmente na porta 5432.

### 2. Backend

```bash
cd backend

# Instalar dependências
npm install

# Copiar e configurar variáveis de ambiente
cp .env.example .env

# Iniciar servidor (modo desenvolvimento)
npm run dev
```

O servidor estará disponível em `http://localhost:5000`

### 3. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Copiar e configurar variáveis de ambiente
cp .env.example .env

# Iniciar aplicação
npm start
```

A aplicação estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
tcc/
├── backend/
│   ├── src/
│   │   ├── models/          # Modelos do Sequelize
│   │   ├── routes/          # Rotas da API
│   │   ├── middlewares/     # Middlewares
│   │   ├── config/          # Configurações
│   │   └── server.js        # Entrada do servidor
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/           # Páginas
│   │   ├── services/        # Serviços API
│   │   ├── store/           # Zustand stores
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   └── .env.example
└── docker-compose.yml
```

## 🔑 Variáveis de Ambiente

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=voz_urbana
DB_USER=postgres
DB_PASSWORD=postgres
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 📚 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login

### Problemas
- `GET /api/problems` - Listar problemas
- `GET /api/problems/:id` - Obter detalhes
- `POST /api/problems` - Criar problema (autenticado)

### Categorias
- `GET /api/categories` - Listar categorias

### Votos
- `POST /api/votes/:problemId` - Votar em problema (autenticado)

### Usuário
- `GET /api/users/me` - Perfil (autenticado)
- `PUT /api/users/me` - Atualizar perfil (autenticado)

### Admin
- `GET /api/admin/stats` - Estatísticas (admin)
- `PUT /api/admin/problems/:id` - Atualizar status (admin)
- `POST /api/admin/categories` - Criar categoria (admin)

## 🎯 Funcionalidades Futuras

- [ ] Integração com redes sociais
- [ ] Notificações em tempo real
- [ ] Upload de vídeos
- [ ] Comentários e discussões
- [ ] Relatórios exportáveis
- [ ] Integração com APIs de serviços públicos
- [ ] Gamificação e badges
- [ ] App mobile

## 📝 Licença

MIT

## 👥 Contribuindo

Contribuições são bem-vindas! Sinta-se livre para abrir issues ou pull requests.

## 📧 Contato

Para dúvidas ou sugestões, entre em contato através do projeto.

---

**VOZ URBANA** - Sua voz melhora a cidade! 🌍
