# 📊 Relatório de Análise do Projeto

## 1. 🏗️ Identificação e visão geral

- **Nome do projeto:** VOZ URBANA
- **Objetivo identificado:** plataforma colaborativa para reportar, mapear e acompanhar problemas urbanos.
- **Problema que o sistema pretende resolver:** facilitar o registro e acompanhamento de problemas urbanos pela população, com mapa, categorias e votação comunitária.
- **Funcionalidades do MVP descritas:**
  - cadastro e login de usuários;
  - reporte de problemas urbanos com localização;
  - listagem e detalhamento de problemas;
  - mapa interativo;
  - categorias;
  - votação/apoio em problemas;
  - perfil de usuário;
  - painel administrativo básico.
- **Tecnologias principais:**
  - Node.js;
  - Express;
  - Prisma ORM;
  - SQLite;
  - React;
  - Tailwind CSS;
  - Axios;
  - Zustand;
  - React Router;
  - Leaflet/React Leaflet.
- **Linguagens utilizadas:**
  - JavaScript;
  - JSX;
  - CSS;
  - Prisma Schema;
  - YAML.

### Evidências consultadas

- `README.md` — nome, objetivo, funcionalidades, stack e endpoints planejados.
- `backend/package.json` — dependências reais do backend, incluindo Express, Prisma, JWT, Joi e bcryptjs.
- `backend/prisma/schema.prisma` — schema Prisma com banco SQLite e models do domínio.
- `backend/src/server.js` — configuração do servidor Express, CORS, rotas e conexão Prisma.
- `frontend/package.json` — dependências reais do frontend, incluindo React, React Router, Tailwind, Axios e Zustand.
- `frontend/src/services/api.js` — cliente Axios e endpoints consumidos pelo frontend.
- `frontend/src/pages/*.js` — telas e fluxos implementados.

## 2. 📂 Organização do repositório

```text
tcc-voz-urbana/
├── .github/
│   └── copilot-instructions.md
├── backend/
│   ├── prisma/
│   │   ├── dev.db
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.js
│   ├── .env.example
│   ├── database.sqlite
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   ├── utils/
│   │   ├── App.js
│   │   ├── index.css
│   │   └── index.js
│   ├── .env.example
│   ├── package.json
│   ├── postcss.config.js
│   └── tailwind.config.js
├── docker-compose.yml
├── QUICKSTART.md
├── README.md
└── SETUP_GUIDE.md
```

### Responsabilidade das pastas

- `backend` — API Node.js/Express, schema Prisma, banco local SQLite e configuração de ambiente.
- `backend/src/routes` — definição das rotas HTTP e lógica de acesso ao Prisma.
- `backend/src/middlewares` — autenticação/autorização JWT e tratamento de erros.
- `backend/src/config` — criação do Prisma Client.
- `backend/src/services` — serviço de envio de e-mail de verificação.
- `frontend` — aplicação React.
- `frontend/src/pages` — telas principais da aplicação.
- `frontend/src/components` — componentes reutilizáveis de interface, mapa, header e proteção de rotas.
- `frontend/src/services` — cliente Axios para comunicação com a API.
- `frontend/src/store` — estado global com Zustand.
- `.github` — instruções para Copilot, sem evidência de workflow de CI.

### Análise da organização

- Separação entre frontend e backend: adequada.
- Nomes de pastas e arquivos: claros e coerentes com uma aplicação web dividida em API e cliente React.
- Arquivos de configuração: existem `package.json` separados, `docker-compose.yml`, `tailwind.config.js`, `postcss.config.js`, `.env.example` no frontend e backend.
- Organização mínima do projeto: atende em boa parte. Há, porém, inconsistência documental: o README descreve Sequelize/PostgreSQL e pasta `models`, enquanto o código real usa Prisma/SQLite e não possui `backend/src/models`.

## 3. 📘 README e documentação inicial

**Localização:** `README.md`

| Item esperado | Situação | Evidência |
|---|---|---|
| Nome do projeto | Atende | `README.md` identifica “VOZ URBANA”. |
| Problema que o sistema resolve | Atende | `README.md` descreve reportagem, mapeamento e acompanhamento de problemas urbanos. |
| Objetivo do projeto | Atende | `README.md` apresenta plataforma colaborativa para cidade. |
| Funcionalidades do MVP | Atende | `README.md` lista reportagem, mapa, votação, categorias, autenticação, admin e perfil. |
| Tecnologias utilizadas | Parcial | `README.md` lista tecnologias, mas informa Sequelize/PostgreSQL; o código usa Prisma/SQLite. |
| Instruções para execução local | Parcial | `README.md`, `QUICKSTART.md` e `SETUP_GUIDE.md` trazem comandos, mas mencionam PostgreSQL como banco principal enquanto o Prisma está configurado para SQLite. |
| Divisão entre frontend, backend e banco | Parcial | `README.md` mostra estrutura frontend/backend/banco, mas contém pastas e ORM divergentes do código real. |

### Histórico de commits e participação

- Histórico disponível para análise: Sim.
- Participação dos integrantes identificável: Parcial.
- Evidências: `git log` mostra três commits locais, com autores “Daniel Godoy”, “EA - Daniel Godoy De Oliveira Silva” e “Marina Seixas Mazon”. O histórico não detalha claramente a divisão de tarefas por integrante.

> Não foi atribuída autoria individual de funcionalidades, pois o histórico disponível não comprova essa divisão.

### Professor como colaborador

**Situação:** NÃO VERIFICÁVEL PELO REPOSITÓRIO

## 4. ⚙️ Backend

- **Localização:** `backend`
- **Linguagem:** JavaScript
- **Framework principal:** Express
- **Arquivo de inicialização:** `backend/src/server.js`
- **Servidor configurado:** Sim

### Estrutura identificada

- `backend/src/server.js` — inicializa Express, middlewares, CORS, rotas, conexão Prisma e tratamento 404.
- `backend/src/config/database.js` — instancia e exporta Prisma Client.
- `backend/src/routes/auth.js` — cadastro, login, verificação de e-mail e perfil pendente.
- `backend/src/routes/problems.js` — listagem, criação e detalhe de problemas.
- `backend/src/routes/categories.js` — listagem e detalhe de categorias.
- `backend/src/routes/votes.js` — votação em problemas com transação Prisma.
- `backend/src/routes/users.js` — consulta e atualização do perfil autenticado.
- `backend/src/routes/admin.js` — categorias, usuários, status/prioridade de problemas e estatísticas.
- `backend/src/middlewares/auth.js` — autenticação JWT e autorização admin.
- `backend/src/middlewares/errorHandler.js` — tratamento centralizado de erros.
- `backend/src/services/mailer.js` — envio opcional de e-mail por SMTP.

### Organização interna

- Rotas: existem e estão organizadas por funcionalidade.
- Controllers: não há camada separada de controllers; a lógica está diretamente nos arquivos de rota.
- Services: existe serviço de e-mail, mas as regras principais de negócio ficam nas rotas.
- Middlewares: existem para autenticação, autorização admin e tratamento de erros.
- Configuração do banco: existe via Prisma Client.
- Validações: presentes principalmente em `auth.js` com Joi. Outras rotas têm validação mais limitada.
- Tratamento de erros: existe middleware global com tratamento para Joi e erros Prisma.

### Funcionalidades implementadas

- Cadastro de usuário com hash de senha e token de verificação — Evidência: `backend/src/routes/auth.js`.
- Login com JWT e validação de e-mail verificado — Evidência: `backend/src/routes/auth.js`.
- Verificação de e-mail — Evidência: `backend/src/routes/auth.js`.
- Listagem e detalhe de problemas — Evidência: `backend/src/routes/problems.js`.
- Criação de problema — Evidência: `backend/src/routes/problems.js`.
- Listagem e detalhe de categorias — Evidência: `backend/src/routes/categories.js`.
- Votação em problema com transação — Evidência: `backend/src/routes/votes.js`.
- Consulta e atualização de perfil — Evidência: `backend/src/routes/users.js`.
- Estatísticas administrativas — Evidência: `backend/src/routes/admin.js`.

### Fluxo das requisições

```text
requisição → rota Express → função no arquivo de rota → Prisma Client → banco SQLite → resposta JSON
```

O fluxo está completo em rotas como `GET /api/problems`, `GET /api/categories`, `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/users/me`, `POST /api/votes/:problemId` e `GET /api/admin/stats`.

Ponto de interrupção observado: `POST /api/problems` espera `req.userId`, mas em `backend/src/server.js` a rota `/api/problems` é registrada como pública, sem `authMiddleware`. Assim, a criação tende a ser bloqueada pela própria checagem interna de autenticação, pois `req.userId` não é preenchido nessa rota.

## 5. 🗄️ Banco de dados e Prisma ORM

- **Tipo de banco:** SQLite
- **ORM:** Prisma
- **Configuração principal:** `backend/src/config/database.js`
- **Schema Prisma:** `backend/prisma/schema.prisma`
- **Migrations:** Não
- **Localização das migrations:** NÃO IDENTIFICADO

### Models ou entidades identificadas

- `User` — usuário com nome, e-mail único, senha, telefone, papel, avatar, bio, verificação de e-mail, login e relações com problemas/votos.
- `Category` — categoria de problema com nome único, descrição, cor, ícone e status ativo.
- `Problem` — relato urbano com título, descrição, latitude, longitude, endereço, status, prioridade, votos, visualizações, autor e categoria.
- `Image` — imagem associada a problema, com URL, nome de arquivo, mimetype e tamanho.
- `Vote` — voto de usuário em problema, com tipo e restrição única por usuário/problema.

### Modelagem

| Elemento | Situação | Evidência |
|---|---|---|
| Models principais definidos | Atende | `backend/prisma/schema.prisma` define `User`, `Category`, `Problem`, `Image`, `Vote`. |
| Chaves primárias | Atende | Todos os models têm `id String @id @default(uuid())`. |
| Chaves estrangeiras e relações | Atende | `Problem` relaciona `User` e `Category`; `Image` relaciona `Problem`; `Vote` relaciona `User` e `Problem`. |
| Campos coerentes com o domínio | Atende | Problemas possuem localização, status, prioridade, votos e categoria. |
| Prisma Client utilizado no backend | Atende | `backend/src/config/database.js` e arquivos em `backend/src/routes`. |
| Operação real de banco em rota/controller | Atende | Rotas usam `findMany`, `findUnique`, `create`, `update`, `delete`, `count` e transação. |

### Operações Prisma encontradas

- `findMany`, `findUnique` ou equivalente: `backend/src/routes/auth.js`, `backend/src/routes/problems.js`, `backend/src/routes/categories.js`, `backend/src/routes/users.js`, `backend/src/routes/admin.js`, `backend/src/routes/votes.js`.
- `create`: `backend/src/routes/auth.js`, `backend/src/routes/problems.js`, `backend/src/routes/admin.js`, `backend/src/routes/votes.js`.
- `update`: `backend/src/routes/auth.js`, `backend/src/routes/problems.js`, `backend/src/routes/users.js`, `backend/src/routes/admin.js`, `backend/src/routes/votes.js`.
- `delete`: `backend/src/routes/votes.js`.
- Outras operações: `count` em `backend/src/routes/problems.js` e `backend/src/routes/admin.js`; `$transaction` em `backend/src/routes/votes.js`; `$connect` em `backend/src/server.js`.

### Banco no servidor de produção

A existência de `docker-compose.yml` indica preparação para PostgreSQL, mas o schema Prisma usa SQLite e não há evidência de criação de banco em servidor de produção. Há arquivo local `backend/prisma/dev.db`.

**Situação:** NÃO VERIFICÁVEL PELO REPOSITÓRIO

## 6. 🌐 Rotas da API e arquivo do Insomnia

### Rotas encontradas no backend

| Método | Endpoint | Arquivo | Operação realizada | Usa Prisma |
|---|---|---|---|---|
| GET | `/api/health` | `backend/src/server.js` | health check | Não |
| POST | `/api/auth/register` | `backend/src/routes/auth.js` | cria usuário e token de verificação | Sim |
| POST | `/api/auth/login` | `backend/src/routes/auth.js` | autentica usuário e retorna JWT | Sim |
| POST | `/api/auth/verify-email` | `backend/src/routes/auth.js` | confirma e-mail por token | Sim |
| POST | `/api/auth/pending-profile` | `backend/src/routes/auth.js` | salva avatar antes da confirmação | Sim |
| GET | `/api/categories` | `backend/src/routes/categories.js` | lista categorias ativas | Sim |
| GET | `/api/categories/:id` | `backend/src/routes/categories.js` | busca categoria por id | Sim |
| GET | `/api/problems` | `backend/src/routes/problems.js` | lista problemas com filtros | Sim |
| POST | `/api/problems` | `backend/src/routes/problems.js` | cria problema, mas depende de `req.userId` sem middleware aplicado | Sim |
| GET | `/api/problems/:id` | `backend/src/routes/problems.js` | busca problema e incrementa visualizações | Sim |
| GET | `/api/users/me` | `backend/src/routes/users.js` | busca perfil autenticado | Sim |
| PUT | `/api/users/me` | `backend/src/routes/users.js` | atualiza perfil autenticado | Sim |
| POST | `/api/votes/:problemId` | `backend/src/routes/votes.js` | cria, alterna ou remove voto | Sim |
| POST | `/api/admin/categories` | `backend/src/routes/admin.js` | cria categoria | Sim |
| PUT | `/api/admin/problems/:id` | `backend/src/routes/admin.js` | atualiza status/prioridade/verificação | Sim |
| GET | `/api/admin/users` | `backend/src/routes/admin.js` | lista usuários | Sim |
| PUT | `/api/admin/users/:id/role` | `backend/src/routes/admin.js` | atualiza papel de usuário | Sim |
| GET | `/api/admin/stats` | `backend/src/routes/admin.js` | retorna estatísticas | Sim |

### Adequação das rotas

- Métodos HTTP: em geral adequados para listagem, criação e atualização.
- Organização por funcionalidade: adequada, com arquivos separados por domínio.
- Clareza dos nomes: adequada.
- Existência de parâmetros: presente em rotas de problema, categoria, voto e admin.
- Recebimento de JSON: configurado em `backend/src/server.js`.
- Respostas em JSON: presentes nas rotas.
- Relação com o MVP: cobre autenticação, problemas, categorias, votos, perfil e admin.
- Observação: criação de problema tem inconsistência de proteção, pois a rota está pública no servidor, mas o handler exige autenticação via `req.userId`.

### Arquivo exportado do Insomnia

- **Arquivo encontrado:** NÃO IDENTIFICADO
- **Formato:** NÃO IDENTIFICADO
- **Rotas organizadas por funcionalidade:** Não
- **Nomes claros nas requisições:** Não
- **Exemplos de corpo JSON:** Não
- **Parâmetros e variáveis configurados:** Não
- **Compatibilidade com as rotas do backend:** Não

Não foi encontrado arquivo exportado do Insomnia em JSON, YAML ou com nome relacionado a Insomnia.

## 7. 🎨 Frontend

- **Localização:** `frontend`
- **Framework:** React
- **Linguagem:** JavaScript/JSX
- **Ferramenta de criação/build:** Create React App (`react-scripts`)
- **Tailwind CSS:** Configurado e utilizado
- **Roteamento:** React Router DOM

### Arquivos principais

- `frontend/src/index.js` — renderiza a aplicação React e inicializa Lenis.
- `frontend/src/App.js` — define rotas da aplicação.
- `frontend/src/services/api.js` — configura Axios e endpoints.
- `frontend/src/store/index.js` — gerencia autenticação e estados com Zustand.
- `frontend/src/index.css` — importa Tailwind e estilos globais.
- `frontend/tailwind.config.js` — configura conteúdo e tema do Tailwind.

### Páginas e componentes

- `frontend/src/pages/LandingPage.js` — página inicial com hero, mapa, feed e chamadas para problemas/categorias.
- `frontend/src/pages/HomePage.js` — mapa e listagem filtrada de problemas.
- `frontend/src/pages/LoginPage.js` — formulário de login.
- `frontend/src/pages/RegisterPage.js` — cadastro com avatar e fluxo de verificação.
- `frontend/src/pages/VerifyEmailPage.js` — confirmação de e-mail por token.
- `frontend/src/pages/ReportProblemPage.js` — formulário de criação de problema.
- `frontend/src/pages/ProblemDetailPage.js` — detalhe de problema e votação.
- `frontend/src/pages/ProfilePage.js` — visualização e edição de perfil.
- `frontend/src/pages/AdminDashboard.js` — painel de estatísticas administrativas.
- `frontend/src/components/Map.js` — mapa Leaflet com marcadores e seleção de área.
- `frontend/src/components/ProblemCard.js` — card de problema.
- `frontend/src/components/Header.js` — navegação principal.
- `frontend/src/components/ProtectedRoute.js` — proteção de rotas por autenticação e papel.

### Análise do desenvolvimento inicial

| Elemento | Situação | Evidência |
|---|---|---|
| Projeto React iniciado | Atende | `frontend/package.json`, `frontend/src/index.js`, `frontend/src/App.js`. |
| Uso de JavaScript | Atende | Arquivos `.js` e `.jsx` em `frontend/src`. |
| Tailwind configurado ou utilizado | Atende | `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/src/index.css` e classes Tailwind nas telas. |
| Telas principais iniciadas | Atende | Páginas de landing, mapa, login, cadastro, relato, detalhe, perfil e admin. |
| Componentes organizados | Atende | `frontend/src/components` e `frontend/src/components/ui`. |
| Navegação entre páginas | Atende | `frontend/src/App.js` usa `BrowserRouter`, `Routes` e `Route`. |
| Tela conectada ou preparada para API | Atende | `frontend/src/services/api.js` e uso nas páginas `LandingPage`, `HomePage`, `ReportProblemPage`, `ProblemDetailPage`, `ProfilePage`, `AdminDashboard`, `VerifyEmailPage`. |

## 8. 🔗 Conexão entre frontend e backend

- **Tipo de comunicação:** REST
- **Cliente HTTP:** Axios
- **Arquivo de configuração da API:** `frontend/src/services/api.js`
- **URL base:** `http://localhost:5000/api`, definida como fallback em `frontend/src/services/api.js` e indicada em `frontend/.env.example`.
- **Variáveis de ambiente:** `frontend/.env.example`, `backend/.env.example`; existe também `backend/.env`, cujo conteúdo não foi exposto.
- **CORS no backend:** Configurado em `backend/src/server.js` com origem por `CORS_ORIGIN` ou `http://localhost:3000`.
- **Proxy no frontend:** Ausente.

### Endpoints consumidos pelo frontend

| Endpoint | Método | Componente ou página | Finalidade | Compatível com o backend |
|---|---|---|---|---|
| `/auth/register` | POST | `frontend/src/store/index.js`, `RegisterPage.js` | cadastro de usuário | Sim |
| `/auth/login` | POST | `frontend/src/store/index.js`, `LoginPage.js` | login | Sim |
| `/auth/verify-email` | POST | `VerifyEmailPage.js` | verificação de e-mail | Sim |
| `/auth/pending-profile` | POST | `RegisterPage.js` | salvar avatar antes da ativação | Sim |
| `/problems` | GET | `LandingPage.js`, `HomePage.js` | listar problemas | Sim |
| `/problems` | POST | `ReportProblemPage.js` | criar problema | Parcial |
| `/problems/:id` | GET | `ProblemDetailPage.js` | detalhe de problema | Sim |
| `/categories` | GET | `LandingPage.js`, `HomePage.js`, `ReportProblemPage.js` | listar categorias | Sim |
| `/votes/:problemId` | POST | `ProblemDetailPage.js` | votar em problema | Sim |
| `/users/me` | GET | `ProfilePage.js` | carregar perfil | Sim |
| `/users/me` | PUT | `ProfilePage.js` | atualizar perfil | Sim |
| `/admin/stats` | GET | `AdminDashboard.js` | estatísticas admin | Sim |
| `/admin/problems/:id` | PUT | `frontend/src/services/api.js` | atualizar problema | Sim no serviço, não evidenciado em tela |
| `/admin/categories` | POST | `frontend/src/services/api.js` | criar categoria | Sim no serviço, não evidenciado em tela |

### Fluxos comprovados

- Landing page e Home fazem `GET /problems` e `GET /categories`; quando a API falha ou retorna vazio, exibem dados de demonstração.
- Login envia dados para `POST /auth/login` por meio do store Zustand.
- Cadastro envia dados para `POST /auth/register` e depois pode enviar avatar para `POST /auth/pending-profile`.
- Verificação de e-mail envia token para `POST /auth/verify-email`.
- Perfil autenticado consome `GET /users/me` e `PUT /users/me`.
- Detalhe de problema consome `GET /problems/:id` e `POST /votes/:problemId`.
- Formulário de reporte chama `POST /problems`, mas a rota no backend não recebe `authMiddleware` apesar de depender de `req.userId`.

### Estado da integração

**Classificação:** Parcial

Há comunicação identificável e coerente entre frontend e backend em vários fluxos. A integração não é classificada como plena porque há fallback de demonstração em telas centrais e a criação de problema apresenta incompatibilidade entre o frontend autenticado e a configuração da rota no backend.

## 9. ✅ O que já está implementado

### Backend

- Servidor Express com CORS, Helmet, JSON parser, rotas e handler de erro.
- Autenticação com cadastro, login, JWT, hash de senha e verificação de e-mail.
- Rotas para problemas, categorias, votos, usuários e administração.
- Uso real do Prisma Client nas rotas.

### Banco de dados

- Schema Prisma com models principais do domínio.
- Banco local SQLite (`backend/prisma/dev.db`) presente.
- Relações entre usuários, problemas, categorias, imagens e votos.

### Frontend

- Aplicação React com roteamento.
- Tailwind configurado e utilizado.
- Telas de landing, mapa, login, cadastro, verificação, reporte, detalhe, perfil e admin.
- Componentes de mapa, cards, header e rota protegida.

### Integração

- Cliente Axios centralizado.
- Token JWT inserido automaticamente no cabeçalho Authorization.
- Consumo de endpoints de autenticação, problemas, categorias, votos, perfil e admin.

## 10. 🚧 O que está incompleto ou em desenvolvimento

- Arquivo exportado do Insomnia não encontrado.
  - **Evidência:** busca por arquivos JSON/YAML e nomes relacionados a Insomnia não encontrou exportação.
  - **Estado observado:** entrega não identificada no repositório.

- Migrations do Prisma não encontradas.
  - **Evidência:** `backend/prisma` contém `schema.prisma` e `dev.db`, mas não contém pasta `migrations`.
  - **Estado observado:** projeto usa `prisma db push` nos scripts, sem histórico de migrations.

- Documentação de banco/ORM divergente do código.
  - **Evidência:** `README.md` e `QUICKSTART.md` mencionam PostgreSQL/Sequelize; `backend/prisma/schema.prisma` usa SQLite/Prisma.
  - **Estado observado:** documentação parcialmente desatualizada.

- Criação de problema com autenticação inconsistente.
  - **Evidência:** `backend/src/server.js` registra `/api/problems` como rota pública; `backend/src/routes/problems.js` exige `req.userId`.
  - **Estado observado:** fluxo de criação pode não completar porque o middleware que define `req.userId` não é aplicado nessa rota.

- Upload de imagens não comprovado.
  - **Evidência:** `Image` existe no schema e `multer` está em `backend/package.json`, mas não foi identificada rota de upload.
  - **Estado observado:** estrutura/modelo existe, implementação do fluxo não foi comprovada.

- Seeds/categorias iniciais não identificados.
  - **Evidência:** não há arquivo de seed identificado; frontend depende de categorias vindas da API para o formulário.
  - **Estado observado:** categorias podem depender de cadastro manual via rota admin.

- Divisão de tarefas do grupo não documentada.
  - **Evidência:** commits mostram autores, mas não há seção de responsabilidades por integrante.
  - **Estado observado:** participação individual é apenas parcialmente inferível pelo histórico.

## 11. 📦 Dependências principais

### Backend

| Dependência | Versão | Finalidade identificada |
|---|---:|---|
| `express` | `^4.18.2` | API HTTP REST |
| `@prisma/client` | `^6.9.0` | cliente ORM |
| `prisma` | `^6.9.0` | CLI e geração Prisma |
| `cors` | `^2.8.5` | CORS |
| `helmet` | `^7.0.0` | headers de segurança |
| `dotenv` | `^16.0.3` | variáveis de ambiente |
| `jsonwebtoken` | `^9.0.0` | JWT |
| `bcryptjs` | `^2.4.3` | hash e comparação de senhas |
| `joi` | `^17.9.1` | validação de dados |
| `nodemailer` | `^6.9.15` | envio de e-mail |
| `multer` | `^1.4.5-lts.1` | upload, embora rota de upload não tenha sido identificada |
| `nodemon` | `^2.0.20` | desenvolvimento |
| `jest` | `^29.5.0` | testes |
| `supertest` | `^6.3.3` | testes de API |

### Frontend

| Dependência | Versão | Finalidade identificada |
|---|---:|---|
| `react` | `^18.2.0` | interface |
| `react-dom` | `^18.2.0` | renderização |
| `react-scripts` | `5.0.1` | build/dev server CRA |
| `react-router-dom` | `^6.11.0` | roteamento |
| `axios` | `^1.3.4` | requisições HTTP |
| `zustand` | `^4.3.7` | estado global |
| `tailwindcss` | `^3.3.0` | estilização |
| `leaflet` | `^1.9.3` | mapas |
| `react-leaflet` | `^4.2.1` | integração Leaflet/React |
| `react-toastify` | `^9.1.2` | notificações |
| `date-fns` | `^2.29.3` | formatação de datas |
| `framer-motion` | `^12.38.0` | animações |
| `gsap` | `^3.15.0` | animações |
| `lucide-react` | `^1.11.0` | ícones |
| `react-icons` | `^4.8.0` | ícones |
| `three`, `@react-three/fiber`, `@react-three/drei` | `^0.184.0`, `^8.18.0`, `^9.122.0` | cena visual 3D |

## 12. 🧭 Arquitetura e padrões identificados

- **Arquitetura predominante:** estrutura simples em camadas parciais.
- **Separação de responsabilidades:** há separação entre frontend e backend, e no backend há separação por rotas, middlewares, config e services. Não há separação formal de controllers e services para as regras principais.
- **Padrões identificados:** API REST com Express; Prisma Client centralizado; rotas por domínio; middleware JWT; frontend React com pages/components/services/store.
- **Consistência entre os módulos:** boa consistência geral na divisão frontend/backend e no consumo via Axios. Há inconsistências entre documentação e código quanto a ORM/banco, e entre proteção esperada e proteção real da rota de criação de problemas.

# 13. 📝 Avaliação conforme os critérios da AV2

## Quadro avaliativo

| Critério | Valor máximo | Nota atribuída | Evidências e justificativa |
|---|---:|---:|---|
| Organização do repositório, README e professor como colaborador | 1,5 | 1,0 | Estrutura frontend/backend está adequada e há README, mas a documentação diverge do código ao citar Sequelize/PostgreSQL. Professor como colaborador é NÃO VERIFICÁVEL PELO REPOSITÓRIO. |
| Banco de dados criado e coerente com o MVP | 2,0 | 1,5 | Schema Prisma possui models coerentes e banco SQLite local existe. Não há migrations e banco de produção não é verificável. |
| Arquivo exportado do Insomnia com as rotas organizadas | 1,5 | 0,0 | Arquivo exportado do Insomnia não foi identificado. |
| Backend iniciado com integração ao banco usando Prisma ORM | 2,0 | 1,7 | Backend Express usa Prisma em rotas reais e retorna JSON. Há autenticação, CRUD parcial e estatísticas. Perde consistência pela rota de criação de problema depender de `req.userId` sem middleware aplicado. |
| Frontend iniciado em React, JavaScript e Tailwind | 1,5 | 1,4 | React/JS/Tailwind estão configurados e há várias telas. Integração visual e componentes estão iniciados. |
| Conexão inicial entre frontend e backend | 1,0 | 0,8 | Axios centralizado e várias telas consomem API. Há fallback de demonstração e incompatibilidade parcial no fluxo de criação de problema. |
| Clareza na apresentação e divisão de tarefas do grupo | 0,5 | A DEFINIR | Histórico de commits mostra autores, mas divisão de tarefas e apresentação são NÃO VERIFICÁVEIS PELO REPOSITÓRIO. |
| **Total verificável no repositório** | **10,0** | **6,4 + A DEFINIR** | Total dos itens verificáveis atribuídos: 6,4. O critério de apresentação/divisão depende de verificação externa. |

### Observação sobre o total

- **Pontuação obtida nos itens verificáveis:** 6,4
- **Pontos dependentes de apresentação ou verificação externa:** 0,5
- **Nota máxima que pode ser confirmada apenas pelo repositório:** 9,5

Não foi transformado automaticamente o item de apresentação/divisão em nota zero. A decisão final depende da apresentação ou de verificação externa pelo professor.

## 14. 📌 Síntese por critério

### 14.1 Organização do repositório e README — máximo 1,5

- **Situação:** Parcial
- **Evidências:** `README.md`, `backend/package.json`, `frontend/package.json`, `backend/prisma/schema.prisma`.
- **Aspectos comprovados:** separação frontend/backend, documentação inicial, instruções de execução, endpoints listados.
- **Aspectos ausentes:** README não está alinhado ao ORM e banco reais; menciona Sequelize/PostgreSQL enquanto o código usa Prisma/SQLite.
- **Aspectos não verificáveis:** professor como colaborador.
- **Nota sugerida:** 1,0/1,5

### 14.2 Banco de dados e coerência com o MVP — máximo 2,0

- **Situação:** Parcial
- **Evidências:** `backend/prisma/schema.prisma`, `backend/prisma/dev.db`, `backend/package.json`.
- **Models/tabelas principais:** `User`, `Category`, `Problem`, `Image`, `Vote`.
- **Coerência com o MVP:** boa aderência aos fluxos de usuário, problemas, categorias, imagens e votos.
- **Criação no servidor de produção:** Não verificável.
- **Nota sugerida:** 1,5/2,0

### 14.3 Insomnia e organização das rotas — máximo 1,5

- **Situação:** Não atende
- **Evidências:** busca de arquivos não encontrou exportação do Insomnia.
- **Organização das requisições:** NÃO IDENTIFICADO
- **Compatibilidade com o backend:** NÃO IDENTIFICADO
- **Nota sugerida:** 0,0/1,5

### 14.4 Backend com Prisma ORM — máximo 2,0

- **Situação:** Atende parcialmente
- **Evidências:** `backend/src/server.js`, `backend/src/config/database.js`, `backend/src/routes/*.js`.
- **Servidor Node.js/Express:** configurado com rotas e middlewares.
- **Prisma configurado:** sim, via `backend/src/config/database.js` e `backend/prisma/schema.prisma`.
- **Operação no banco:** sim, em rotas de autenticação, problemas, categorias, votos, usuários e admin.
- **Resposta em JSON:** sim.
- **Nota sugerida:** 1,7/2,0

### 14.5 Frontend com React, JavaScript e Tailwind — máximo 1,5

- **Situação:** Atende
- **Evidências:** `frontend/package.json`, `frontend/src/App.js`, `frontend/src/index.js`, `frontend/src/index.css`, `frontend/tailwind.config.js`.
- **React iniciado:** sim.
- **JavaScript:** sim.
- **Tailwind:** configurado e utilizado.
- **Telas e componentes:** várias telas principais e componentes reutilizáveis.
- **Nota sugerida:** 1,4/1,5

### 14.6 Conexão frontend-backend — máximo 1,0

- **Situação:** Parcial
- **Evidências:** `frontend/src/services/api.js`, `frontend/src/pages/*.js`, `backend/src/routes/*.js`.
- **Fluxo identificado:** autenticação, listagem, detalhe, perfil, votos e admin possuem chamadas frontend e rotas backend correspondentes.
- **Compatibilidade das rotas e dados:** majoritariamente compatível, com ressalva no `POST /api/problems`.
- **Nota sugerida:** 0,8/1,0

### 14.7 Apresentação e divisão de tarefas — máximo 0,5

- **Situação:** Parcialmente comprovável
- **Evidências no repositório:** `git log` mostra três commits com autores diferentes.
- **O que precisa ser verificado na apresentação:** divisão de tarefas real, participação individual e domínio técnico dos integrantes.
- **Nota sugerida:** A DEFINIR/0,5

## 15. 🔍 Pontos para verificação durante a apresentação

- Demonstrar o cadastro de usuário e explicar o fluxo de verificação de e-mail.
- Demonstrar login com usuário verificado e uso do token JWT nas requisições autenticadas.
- Demonstrar a listagem de categorias e confirmar como as categorias iniciais são cadastradas.
- Demonstrar a criação de um problema a partir do frontend e confirmar se a rota recebe autenticação corretamente.
- Demonstrar a listagem de problemas reais vindos do banco, diferenciando dados reais dos dados de demonstração.
- Demonstrar o detalhe de um problema e o incremento de visualizações.
- Demonstrar o voto em um problema e explicar a restrição de um voto por usuário/problema.
- Demonstrar o painel administrativo com um usuário admin.
- Explicar por que a documentação menciona PostgreSQL/Sequelize enquanto o código usa SQLite/Prisma.
- Apresentar o arquivo exportado do Insomnia, caso exista fora do repositório analisado.
- Confirmar se há banco em servidor de produção ou apenas banco local.
- Explicar a divisão de tarefas entre integrantes.

## 16. 📋 Conclusão

O projeto apresenta uma estrutura inicial consistente para uma aplicação web dividida entre frontend React e backend Express. Há implementação real de API REST com Prisma, modelagem coerente para usuários, problemas, categorias, imagens e votos, além de telas principais iniciadas no frontend com Tailwind e integração via Axios.

As partes comprovadamente funcionais pelo código incluem servidor Express, Prisma Client, autenticação, rotas de domínio, frontend com roteamento, mapa, páginas de login/cadastro/perfil/detalhe/admin e chamadas HTTP centralizadas.

As partes iniciadas, mas incompletas ou inconsistentes, incluem a documentação de banco/ORM, ausência de migrations, ausência de arquivo exportado do Insomnia, ausência de seed identificado para categorias, ausência de rota comprovada para upload de imagens e inconsistência na autenticação da criação de problemas.

Itens que dependem de demonstração externa incluem professor como colaborador, banco de produção, funcionamento em ambiente real, apresentação oral e divisão de tarefas do grupo.

**Nota sugerida com base apenas nas evidências disponíveis:** 6,4 pontos verificáveis, com 0,5 ponto de apresentação/divisão de tarefas a definir externamente.
