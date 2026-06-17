# 🚀 VOZ URBANA - Guia de Início Rápido


## ⚡ Início Rápido (5 minutos)

### 1️⃣ Inicie o Banco de Dados

```bash
# Abra um terminal na raiz do projeto e execute:
docker-compose up -d

# Verifique se está rodando:
docker-compose ps
```

### 2️⃣ Configure e Inicie o Backend

```bash
# Terminal 1
cd backend
npm install
npm run dev
```

✅ Backend rodando em `http://localhost:5000`

### 3️⃣ Configure e Inicie o Frontend

```bash
# Terminal 2
cd frontend
npm install
npm start
```

✅ Frontend rodando em `http://localhost:3000`

## 📦 O Que Está Incluído

### Backend (`/backend`)
- ✅ Servidor Express com todas as rotas
- ✅ Autenticação JWT
- ✅ Modelos Sequelize (User, Problem, Category, Vote, Image)
- ✅ Middlewares de erro e autenticação
- ✅ Rotas de:
  - Autenticação (registro, login)
  - Problemas (criar, listar, filtrar)
  - Categorias
  - Votos
  - Perfil de usuário
  - Painel administrativo

### Frontend (`/frontend`)
- ✅ React 18 com Hooks
- ✅ React Router para navegação
- ✅ Zustand para gerenciamento de estado
- ✅ Leaflet para mapa interativo
- ✅ Tailwind CSS para estilização
- ✅ Páginas:
  - Home (lista e mapa de problemas)
  - Login/Registro
  - Reportar Problema
  - Detalhe do Problema
  - Perfil do Usuário
  - Painel Administrativo

## 🎮 Como Usar

### Criar uma Conta
1. Acesse `http://localhost:3000`
2. Clique em "Cadastre-se"
3. Preencha os dados e confirme

### Reportar um Problema
1. Faça login
2. Clique em "Reportar"
3. Preencha:
   - Categoria
   - Título
   - Descrição
   - Localização (automática via GPS)
4. Envie!

### Apoiar um Problema
1. Navegue até um problema
2. Clique em "Apoiar" para aumentar a prioridade
3. A comunidade decide o que é mais importante!

### Painel Admin
1. Login com conta admin
2. Acesse `/admin`
3. Veja estatísticas e gerencie problemas

## 🔧 Configurações Importantes

### Variáveis de Ambiente

**Backend** (`backend/.env`):
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=voz_urbana
DB_USER=postgres
DB_PASSWORD=postgres
PORT=5000
JWT_SECRET=mudeme_em_producao
```

**Frontend** (`frontend/.env`):
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 🚀 Próximos Passos

### Funcionalidades Recomendadas para Implementar:

1. **Upload de Imagens** (backend)
   - Implementar multer para upload
   - Salvar em bucket (AWS S3, Firebase)

2. **Notificações em Tempo Real** (WebSocket)
   - Usar Socket.io
   - Alertar quando problema é resolvido

3. **Comentários** (banco + API)
   - Adicionar modelo Comment
   - Criar rotas de comentários

4. **Geolocalização Avançada**
   - Integrar com Google Maps
   - Endereço reverso (latitude/longitude → endereço)

5. **Autenticação Social**
   - Google OAuth
   - GitHub OAuth

## 🐛 Troubleshooting

### Porta 5432 já está em uso
```bash
# Verifique containers ativos
docker ps

# Remova containers antigos
docker-compose down
```

### CORS error
Certifique-se de que `CORS_ORIGIN` no backend aponta para seu frontend:
```
CORS_ORIGIN=http://localhost:3000
```

### Mapa não carrega
Verifique o console do navegador. Pode ser um erro de CDN. Atualize o Leaflet:
```bash
npm install leaflet@latest
```

## 📊 Estrutura do Banco

```
Users
├── id (UUID)
├── name
├── email (unique)
├── password (hash)
├── role (user/moderator/admin)
└── timestamps

Problems
├── id (UUID)
├── title
├── description
├── latitude/longitude
├── status (open/in_progress/resolved/closed)
├── priority (low/medium/high/critical)
├── votes (counter)
├── userId (FK)
├── categoryId (FK)
└── timestamps

Categories
├── id (UUID)
├── name
├── color
└── icon

Votes
├── id (UUID)
├── type (up/down)
├── userId (FK)
├── problemId (FK)

Images
├── id (UUID)
├── url
├── problemId (FK)
```

## 📚 Recursos Úteis

- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [Leaflet Docs](https://leafletjs.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Sequelize Docs](https://sequelize.org/)

## 🎯 Roadmap

- [ ] Testes automatizados (Jest, Supertest)
- [ ] Deploy (Heroku, Vercel, AWS)
- [ ] CI/CD (GitHub Actions)
- [ ] Rate limiting
- [ ] Caching (Redis)
- [ ] Busca avançada
- [ ] Export de relatórios
- [ ] Analytics

## 💡 Tips

1. **Desenvolvimento**: Use `npm run dev` para auto-reload
2. **Debug**: Use `console.log()` ou ferramentas de debug do VS Code
3. **API Testing**: Use Postman ou Insomnia para testar rotas
4. **Database**: Use pgAdmin para visualizar dados do PostgreSQL

## 🆘 Suporte

Se encontrar problemas:
1. Verifique se todas as portas estão livres (5000, 3000, 5432)
2. Limpe node_modules e reinstale: `rm -rf node_modules && npm install`
3. Verifique .env files
4. Veja os logs do backend e frontend

## 🎉 Parabéns!

Seu sistema **VOZ URBANA** está pronto para transformar a cidade! 

Continue desenvolvendo, adicione mais funcionalidades e deixe sua comunidade mais engajada! 🌍

---

**Dúvidas?** Volte ao README.md para mais detalhes!
