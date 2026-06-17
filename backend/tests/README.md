# 🧪 Testes Automatizados - VOZ URBANA Backend

Este diretório contém todos os testes automatizados para as rotas da API do backend.

## 📋 Estrutura

```
tests/
├── setup.js                    # Configuração global dos testes
├── helpers/
│   ├── testApp.js             # App Express para testes
│   └── testDb.js              # Helpers para manipular banco de dados
└── routes/
    ├── auth.test.js           # Testes de autenticação
    ├── problems.test.js       # Testes de problemas
    ├── categories.test.js     # Testes de categorias
    └── votes.test.js          # Testes de votos
```

## 🎯 Primeiros Passos

1. **Certifique-se de ter o arquivo .env configurado:**

   ```bash
   # O arquivo .env já deve existir no backend/
   # Verifique se DATABASE_URL e JWT_SECRET estão definidos
   ```

2. **Execute os testes:**

   ```bash
   cd backend
   npm test
   ```

3. **Visualize a cobertura de código:**
   ```bash
   npm run test:coverage
   # Abra: backend/coverage/index.html
   ```

## 🚀 Como Executar

### Executar todos os testes

```bash
npm test
```

### Executar testes em modo watch

```bash
npm run test:watch
```

### Executar com cobertura de código

```bash
npm run test:coverage
```

### Executar apenas um arquivo de teste

```bash
npm test -- auth.test.js
```

### Executar testes que correspondem a um padrão

```bash
npm test -- --testNamePattern="login"
```

## 🔧 Configuração

Os testes estão configurados para trabalhar com:

- **Jest** como framework de testes
- **Supertest** para testar rotas HTTP
- **ESModules** (import/export)
- **PostgreSQL/MySQL** como banco de dados

### Variáveis de Ambiente

Os testes usam o mesmo arquivo `.env` do desenvolvimento local. Certifique-se de ter o arquivo `.env` configurado na raiz do backend:

```env
DATABASE_URL=mysql://usuario:senha@localhost:3306/voz_urbana
JWT_SECRET=sua-chave-secreta
NODE_ENV=development
PORT=5000
```

⚠️ **IMPORTANTE**:

- Os testes limpam o banco de dados antes de cada execução
- Recomenda-se rodar os testes em ambiente de desenvolvimento local
- Evite rodar testes em banco de produção

## 📝 Escrevendo Novos Testes

### Estrutura Básica

```javascript
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import { cleanDatabase, createTestUser } from "../helpers/testDb.js";

const app = createTestApp();

describe("Nome da Rota", () => {
  beforeEach(async () => {
    await cleanDatabase(); // Limpa o banco antes de cada teste
  });

  it("deve fazer algo específico", async () => {
    const response = await request(app).get("/api/endpoint").expect(200);

    expect(response.body).toHaveProperty("propriedade");
  });
});
```

### Helpers Disponíveis

#### `cleanDatabase()`

Limpa todas as tabelas do banco de dados.

```javascript
await cleanDatabase();
```

#### `createTestUser(data)`

Cria um usuário de teste.

```javascript
const user = await createTestUser({
  nome: "Test User",
  email: "test@example.com",
  role: "USER"
});
```

#### `createTestCategory(data)`

Cria uma categoria de teste.

```javascript
const category = await createTestCategory({
  nome: "Infraestrutura",
  descricao: "Problemas de infraestrutura"
});
```

#### `createTestProblem(userId, categoryId, data)`

Cria um problema de teste.

```javascript
const problem = await createTestProblem(user.id, category.id, {
  titulo: "Buraco na rua",
  status: "ABERTO"
});
```

#### `generateTestToken(user)`

Gera um token JWT para autenticação em testes.

```javascript
const token = generateTestToken(user);

await request(app)
  .get("/api/protected-route")
  .set("Authorization", `Bearer ${token}`)
  .expect(200);
```

## 📊 Cobertura de Código

A cobertura de código é gerada automaticamente ao executar:

```bash
npm run test:coverage
```

O relatório HTML estará disponível em `coverage/index.html`.

### Metas de Cobertura

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

## ✅ Boas Práticas

1. **Isolamento**: Cada teste deve ser independente
2. **Limpeza**: Use `beforeEach` para limpar o banco
3. **Descritivo**: Nomes de testes devem ser claros
4. **Arrange-Act-Assert**: Organize seus testes nesse padrão
5. **Dados únicos**: Use timestamps ou IDs únicos para evitar conflitos

### Exemplo de Teste Bem Estruturado

```javascript
it("deve registrar um novo usuário com sucesso", async () => {
  // Arrange (Preparar)
  const userData = {
    name: "João Silva",
    email: "joao@example.com",
    password: "senha123"
  };

  // Act (Executar)
  const response = await request(app)
    .post("/api/auth/register")
    .send(userData)
    .expect(201);

  // Assert (Verificar)
  expect(response.body).toHaveProperty("token");
  expect(response.body.user.email).toBe(userData.email);
  expect(response.body.user).not.toHaveProperty("senhaHash");
});
```

## 🐛 Debugging

### Rodar com logs detalhados

```bash
npm test -- --verbose
```

### Detectar testes lentos

```bash
npm test -- --detectOpenHandles
```

### Rodar um único teste

```javascript
it.only("deve fazer algo específico", async () => {
  // Este será o único teste executado
});
```

### Pular um teste

```javascript
it.skip("deve fazer algo que ainda não funciona", async () => {
  // Este teste será pulado
});
```

## 🔍 Troubleshooting

### Erro: "Cannot find module"

- Verifique se todos os imports usam a extensão `.js`
- Certifique-se de que `"type": "module"` está no package.json

### Erro: Timeout

- Aumente o timeout no jest.config.js
- Verifique conexões com banco de dados

### Erro: "Port already in use"

- Os testes não iniciam servidor real, apenas testam rotas
- Certifique-se de usar `createTestApp()` ao invés do servidor

### Testes falhando aleatoriamente

- Verifique se `cleanDatabase()` está sendo chamado
- Garanta que os testes não dependem da ordem de execução

## 📚 Referências

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
