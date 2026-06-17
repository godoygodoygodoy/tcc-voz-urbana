import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import {
  cleanDatabase,
  createTestUser,
  createTestCategory,
  createTestProblem,
  createTestAdmin,
  generateTestToken
} from "../helpers/testDb.js";

const app = createTestApp();

describe("Problem Routes", () => {
  let user;
  let token;
  let category;

  // Configurar dados de teste antes de cada teste
  beforeEach(async () => {
    await cleanDatabase();

    user = await createTestUser({
      nome: "Test User",
      email: "test@example.com"
    });

    token = generateTestToken(user);

    category = await createTestCategory({
      nome: "Infraestrutura",
      descricao: "Problemas de infraestrutura urbana"
    });
  });

  describe("GET /api/problems", () => {
    it("deve listar problemas sem autenticação", async () => {
      // Criar alguns problemas de teste
      await createTestProblem(user.id, category.id, {
        titulo: "Buraco na rua",
        status: "ABERTO"
      });

      await createTestProblem(user.id, category.id, {
        titulo: "Iluminação quebrada",
        status: "ABERTO"
      });

      const response = await request(app).get("/api/problems").expect(200);

      expect(response.body).toHaveProperty("problems");
      expect(response.body).toHaveProperty("total");
      expect(response.body.problems).toHaveLength(2);
    });

    it("deve filtrar problemas por categoria", async () => {
      const category2 = await createTestCategory({
        nome: "Limpeza",
        descricao: "Problemas de limpeza"
      });

      await createTestProblem(user.id, category.id, {
        titulo: "Buraco na rua"
      });

      await createTestProblem(user.id, category2.id, {
        titulo: "Lixo acumulado"
      });

      const response = await request(app)
        .get(`/api/problems?category=${category.id}`)
        .expect(200);

      expect(response.body.problems).toHaveLength(1);
      expect(response.body.problems[0].titulo).toBe("Buraco na rua");
    });

    it("deve filtrar problemas por status", async () => {
      await createTestProblem(user.id, category.id, {
        titulo: "Problema aberto",
        status: "ABERTO"
      });

      await createTestProblem(user.id, category.id, {
        titulo: "Problema em andamento",
        status: "EM_ANDAMENTO"
      });

      await createTestProblem(user.id, category.id, {
        titulo: "Problema resolvido",
        status: "RESOLVIDO"
      });

      const response = await request(app)
        .get("/api/problems?status=ABERTO")
        .expect(200);

      expect(response.body.problems).toHaveLength(1);
      expect(response.body.problems[0].status).toBe("ABERTO");
    });

    it("deve paginar resultados", async () => {
      // Criar 25 problemas
      for (let i = 0; i < 25; i++) {
        await createTestProblem(user.id, category.id, {
          titulo: `Problema ${i + 1}`
        });
      }

      // Primeira página
      const page1 = await request(app)
        .get("/api/problems?page=1&limit=10")
        .expect(200);

      expect(page1.body.problems).toHaveLength(10);
      expect(page1.body.total).toBe(25);

      // Segunda página
      const page2 = await request(app)
        .get("/api/problems?page=2&limit=10")
        .expect(200);

      expect(page2.body.problems).toHaveLength(10);
    });
  });

  describe("GET /api/problems/:id", () => {
    it("deve retornar detalhes de um problema específico", async () => {
      const problem = await createTestProblem(user.id, category.id, {
        titulo: "Buraco na rua",
        descricao: "Grande buraco causando acidentes"
      });

      const response = await request(app)
        .get(`/api/problems/${problem.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: problem.id,
        titulo: "Buraco na rua",
        descricao: "Grande buraco causando acidentes"
      });
      expect(response.body).toHaveProperty("usuario");
      expect(response.body).toHaveProperty("categoria");
    });

    it("deve retornar erro 404 para problema inexistente", async () => {
      const response = await request(app)
        .get("/api/problems/99999")
        .expect(404);

      expect(response.body).toHaveProperty("error");
    });

    it("deve incluir contagem de votos", async () => {
      const problem = await createTestProblem(user.id, category.id, {
        titulo: "Problema com votos"
      });

      const response = await request(app)
        .get(`/api/problems/${problem.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("_count");
      expect(response.body._count).toHaveProperty("votos");
    });
  });

  describe("POST /api/problems", () => {
    it("deve criar um novo problema com autenticação", async () => {
      const problemData = {
        titulo: "Buraco na Rua Principal",
        descricao: "Grande buraco causando acidentes",
        latitude: -23.5505,
        longitude: -46.6333,
        categoriaId: category.id
      };

      const response = await request(app)
        .post("/api/problems")
        .set("Authorization", `Bearer ${token}`)
        .send(problemData)
        .expect(201);

      expect(response.body).toMatchObject({
        titulo: problemData.titulo,
        descricao: problemData.descricao,
        status: "ABERTO"
      });
      expect(response.body.usuarioId).toBe(user.id);
    });

    it("deve retornar erro 401 sem autenticação", async () => {
      const problemData = {
        titulo: "Buraco na rua",
        descricao: "Descrição",
        latitude: -23.5505,
        longitude: -46.6333,
        categoriaId: category.id
      };

      const response = await request(app)
        .post("/api/problems")
        .send(problemData)
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });

    it("deve retornar erro 400 se dados obrigatórios estão faltando", async () => {
      const response = await request(app)
        .post("/api/problems")
        .set("Authorization", `Bearer ${token}`)
        .send({
          titulo: "Buraco na rua"
          // faltando outros campos obrigatórios
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("deve validar coordenadas geográficas", async () => {
      const response = await request(app)
        .post("/api/problems")
        .set("Authorization", `Bearer ${token}`)
        .send({
          titulo: "Problema",
          descricao: "Descrição",
          latitude: 200, // latitude inválida
          longitude: -46.6333,
          categoriaId: category.id
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /api/problems/:id", () => {
    it("deve atualizar problema do próprio usuário", async () => {
      const problem = await createTestProblem(user.id, category.id, {
        titulo: "Título original",
        descricao: "Descrição original"
      });

      const response = await request(app)
        .put(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          titulo: "Título atualizado",
          descricao: "Descrição atualizada"
        })
        .expect(200);

      expect(response.body).toMatchObject({
        titulo: "Título atualizado",
        descricao: "Descrição atualizada"
      });
    });

    it("deve retornar erro 403 ao tentar atualizar problema de outro usuário", async () => {
      const otherUser = await createTestUser({
        nome: "Other User",
        email: "other@example.com"
      });

      const problem = await createTestProblem(otherUser.id, category.id, {
        titulo: "Problema de outro usuário"
      });

      const response = await request(app)
        .put(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          titulo: "Tentativa de atualização"
        })
        .expect(403);

      expect(response.body).toHaveProperty("error");
    });

    it("deve retornar erro 401 sem autenticação", async () => {
      const problem = await createTestProblem(user.id, category.id);

      const response = await request(app)
        .put(`/api/problems/${problem.id}`)
        .send({
          titulo: "Título atualizado"
        })
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /api/problems/:id", () => {
    it("deve deletar problema do próprio usuário", async () => {
      const problem = await createTestProblem(user.id, category.id, {
        titulo: "Problema a ser deletado"
      });

      await request(app)
        .delete(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // Verificar se foi realmente deletado
      await request(app).get(`/api/problems/${problem.id}`).expect(404);
    });

    it("deve retornar erro 403 ao tentar deletar problema de outro usuário", async () => {
      const otherUser = await createTestUser({
        nome: "Other User",
        email: "other@example.com"
      });

      const problem = await createTestProblem(otherUser.id, category.id);

      const response = await request(app)
        .delete(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty("error");
    });

    it("admin deve poder deletar qualquer problema", async () => {
      const adminUser = await createTestUser({
        nome: "Admin",
        email: "admin@example.com"
      });

      // Criar registro de admin para esse usuário
      await createTestAdmin(adminUser);

      const adminToken = generateTestToken(adminUser);

      const problem = await createTestProblem(user.id, category.id);

      await request(app)
        .delete(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
