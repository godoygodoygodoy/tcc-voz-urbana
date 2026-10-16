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
- **MySQL 8**: Banco de dados relacional
- **Prisma 7**: ORM e migrations
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

- Node.js 24.11.1
- MySQL 8+
- Docker opcional
- npm ou yarn

## 🚀 Como Executar

## Deploy

Monorepositório: `frontend/` contém React 18 + Vite e `backend/` contém Express + Prisma 7 com adaptador MariaDB para MySQL. Instale dependências em cada diretório; a raiz não é um workspace npm. Use Node **24.11.1**, fixado nos arquivos `.node-version`. Não é necessário trocar o framework React.

### Frontend / Hostinger

1. Em `frontend/`, execute `npm install` (ou `npm ci` para reproduzir o lockfile).
2. Copie `.env.example` para `.env`. Para desenvolvimento: `VITE_API_URL=http://localhost:5000`, depois `npm run dev` (porta 3000).
3. Antes do build de produção, defina `VITE_API_URL=https://SEU-BACKEND.onrender.com` em `.env.production.local` ou no ambiente do processo. O frontend acrescenta `/api` nas requisições automaticamente; valores antigos com `/api` também continuam funcionando. Uploads usam a URL base, sem `/api`.
4. Execute `npm run build`. Envie **o conteúdo de `frontend/dist/`** para `public_html/tecti/2026/gpec03/`, incluindo o arquivo oculto `.htaccess`. A URL pública será `https://SEU-DOMINIO/tecti/2026/gpec03/`. Não envie a pasta dist como uma subpasta adicional.
5. Use `npm run preview` para conferir o resultado localmente.

Variáveis Vite são incorporadas ao JavaScript durante o build. Alterar uma variável na Hostinger depois não altera o bundle: gere e envie novo build. Não publique arquivos `.env`.

O projeto usa **React Router com BrowserRouter** em `frontend/src/App.js`, com `basename={import.meta.env.BASE_URL}`. O `base` em `frontend/vite.config.mjs` e o `RewriteBase` em `frontend/public/.htaccess` são `/tecti/2026/gpec03/`. Em desenvolvimento, acesse `http://localhost:3000/tecti/2026/gpec03/`. A hospedagem precisa de fallback para `index.html` em rotas SPA. O `.htaccess` incluído faz isso em Apache/LiteSpeed com mod_rewrite; em outro servidor configure o equivalente. Teste acesso direto e atualização em `/tecti/2026/gpec03/login` e outras rotas internas.

| Variável | Configuração |
| --- | --- |
| VITE_API_URL | Obrigatória no build; URL HTTPS pública do backend, sem necessidade de `/api` |
| VITE_GOOGLE_MAPS_KEY | Opcional, somente para o componente Google Maps; chave pública restrita por domínio e API no Google Cloud |

Nunca coloque senhas, JWT_SECRET ou tokens privados em VITE_*. Geolocalização exige HTTPS em produção. Mapas, fontes e algumas imagens dependem de serviços externos já utilizados pelo projeto.

### Backend / Render

Instalação local: em `backend/`, execute `npm install`, copie `.env.example` para `.env`, preencha os valores e execute `npm run prisma:generate`. Desenvolvimento: `npm run dev`. Produção: `npm start`, que executa `node src/server.js` sem nodemon.

Crie um Web Service Node vinculado ao repositório GitHub:

| Campo | Valor exato |
| --- | --- |
| Root Directory | `backend` |
| Build Command | `npm ci --include=dev && npm run prisma:generate` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Node | `24.11.1` |

Selecione a branch e habilite auto-deploy se desejar publicar novos commits automaticamente. `render.yaml` contém a configuração base. A aplicação escuta em `0.0.0.0` usando `PORT` fornecida pelo Render (fallback local 5000). A inicialização exige conexão com o banco. `/api/health` permanece disponível por compatibilidade.

| Variável | Uso |
| --- | --- |
| NODE_ENV | `production` |
| NODE_VERSION | `24.11.1` |
| PORT | Fornecida pelo Render |
| DATABASE_URL | `mysql://usuario:senha@host:3306/banco`; codifique caracteres especiais das credenciais |
| JWT_SECRET | Segredo aleatório forte com pelo menos 32 caracteres; o Blueprint pode gerar |
| JWT_EXPIRE | Opcional; padrão `7d` |
| FRONTEND_URL | URL HTTPS completa do site: `https://SEU-DOMINIO/tecti/2026/gpec03` |
| CORS_ORIGIN | Opcional; origens adicionais exatas, separadas por vírgula, como domínio com www |
| UPLOAD_DIR | `/var/data/uploads`; exige disco persistente montado nesse caminho |
| MAX_FILE_SIZE | Opcional; limite por foto de problema, padrão 5242880 bytes |
| DATABASE_SSL | `true` se o banco exigir TLS |
| DATABASE_SSL_CA | Caminho para certificado CA PEM, se necessário |
| SMTP_HOST / SMTP_PORT | Servidor SMTP; padrões `smtp.gmail.com` / `587` |
| SMTP_USER / SMTP_PASS / SMTP_FROM | Configurar para recuperação de senha por email |
| SEND_NOTIFICATION_EMAIL | Opcional; `true` para emails de notificações |
| ADMIN_EMAIL / ADMIN_PASSWORD | Apenas para seed administrativo manual |

FRONTEND_URL inclui a subpasta para os links de email; o CORS extrai somente sua origem (protocolo e domínio). CORS_ORIGIN, se configurado, deve conter apenas origens, sem subpastas. CORS permite localhost:3000 em desenvolvimento e as origens explicitamente configuradas. Produção não libera localhost automaticamente. Não use `*` com credenciais. `trust proxy` considera um salto para o proxy do Render; reavalie se adicionar outros proxies.

**Uploads:** fotos e avatares são gravados em disco. Configure um disco persistente no Render (plano compatível, pago). O Blueprint declara 1 GB em `/var/data/uploads`. Sem persistência, arquivos somem em reinicializações/deploys. Faça backup e monitore espaço. Transfira separadamente os uploads locais que quiser preservar. URLs `/uploads` continuam iguais.

Configure SMTP com um provedor e porta permitidos pelo plano do Render e teste recuperação de senha. Variáveis SMTP vazias não habilitam envio.

### Banco

O banco é **MySQL externo**, acessado por Prisma 7 e `@prisma/adapter-mariadb`. `DATABASE_URL` é a fonte principal para runtime e CLI. As variáveis antigas `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` continuam como alternativa local somente quando DATABASE_URL estiver ausente.

Para o Docker local opcional, copie `.env.example` da raiz para `.env` e defina `MYSQL_ROOT_PASSWORD` antes de iniciar o Compose. A porta fica acessível apenas em 127.0.0.1. Essa variável inicializa volumes novos; mudar seu valor não troca a senha de um banco existente. Não remova volumes para trocar credenciais.

Libere acesso de rede do Render no provedor MySQL. Para TLS, configure `DATABASE_SSL=true` no runtime e `?sslaccept=strict` na DATABASE_URL para a CLI. Se o provedor exigir CA privada, configure DATABASE_SSL_CA e `&sslcert=/caminho/ca.pem` na URL. Não desabilite validação de certificado. Outros parâmetros específicos da CLI na URL não são automaticamente opções do driver MariaDB.

Antes da primeira inicialização, faça backup e execute em ambiente confiável com acesso ao banco de produção:

```bash
cd backend
npm ci --include=dev
npm run prisma:generate
npm run prisma:deploy
```

O último comando executa `prisma migrate deploy`. **Não foi executado nesta auditoria.** Para banco existente criado fora das migrations, revise e faça baseline antes; não use reset nem db push para contornar erros. Em planos compatíveis, configure migrations como Pre-Deploy Command depois dessa revisão. O build apenas gera o cliente Prisma.

Seed opcional: `npm run prisma:seed`. Ele atualiza categorias e promove ADMIN_EMAIL a SUPER_ADMIN. Execute somente intencionalmente, com ADMIN_EMAIL explícito e ADMIN_PASSWORD se for criar a conta; remova essas variáveis depois. Não há mais seed automático no build.

Para criar a conta com acesso administrativo completo, configure `ADMIN_EMAIL` com um email válido e `ADMIN_PASSWORD` com uma senha exclusiva de pelo menos 12 caracteres (máximo 72 bytes) no ambiente do backend. Após aplicar as migrations, execute `npm run prisma:seed` em `backend/` e faça login com essas credenciais. A conta recebe `Usuario.nivel=ADMIN`, email verificado e vínculo `Admin.nivel=SUPER_ADMIN`, permitindo acesso ao painel e a todas as funcionalidades administrativas existentes. Conta e permissões são gravadas atomicamente. Se o email já existir, o seed promove essa conta e preserva sua senha e perfil; não redefine a senha ao ser reexecutado.

**Testes existentes:** a suíte Jest limpa tabelas do banco configurado. Não execute `npm test` contra produção ou dados locais importantes. Prepare um banco de testes isolado; algumas fixtures ainda contêm campos legados.

Referências: [Vite](https://vite.dev/guide/), [deploys Render](https://render.com/docs/deploys), [discos persistentes Render](https://render.com/docs/disks).

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
