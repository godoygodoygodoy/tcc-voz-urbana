import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import {
  cleanDatabase,
  createTestUser,
  createTestCategory,
  createTestProblem,
  generateTestToken
} from "../helpers/testDb.js";
import { prisma } from "../../src/config/prisma.js";

const app = createTestApp();

describe("Vote Routes", () => {
  let user;
  let token;
  let category;
  let problem;

  beforeEach(async () => {
    await cleanDatabase();

    user = await createTestUser({
      nome: "Test User",
      email: "test@example.com"
    });

    token = generateTestToken(user);

    category = await createTestCategory({
      nome: "Infraestrutura"
    });

    problem = await createTestProblem(user.id, category.id, {
      titulo: "Problema para votar"
    });
  });

  describe("POST /api/votes", () => {
    it("deve adicionar voto a um problema", async () => {
      const response = await request(app)
        .post("/api/votes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          problemId: problem.id
        })
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "Voto registrado com sucesso"
      );
      expect(response.body.vote).toMatchObject({
        usuarioId: user.id,
        problemaId: problem.id
      });
    });

    it("deve retornar erro 401 sem autenticação", async () => {
      const response = await request(app)
        .post("/api/votes")
        .send({
          problemId: problem.id
        })
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });

    it("deve retornar erro 400 sem problemId", async () => {
      const response = await request(app)
        .post("/api/votes")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("deve retornar erro 404 para problema inexistente", async () => {
      const response = await request(app)
        .post("/api/votes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          problemId: 99999
        })
        .expect(404);

      expect(response.body).toHaveProperty("error");
    });

    it("deve prevenir voto duplicado do mesmo usuário", async () => {
      // Primeiro voto
      await request(app)
        .post("/api/votes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          problemId: problem.id
        })
        .expect(201);

      // Tentativa de voto duplicado
      const response = await request(app)
        .post("/api/votes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          problemId: problem.id
        })
        .expect(409);

      expect(response.body.error).toContain("já votou");
    });
  });

  describe("DELETE /api/votes/:problemId", () => {
    beforeEach(async () => {
      // Adicionar um voto antes de cada teste
      await prisma.voto.create({
        data: {
          usuarioId: user.id,
          problemaId: problem.id
        }
      });
    });

    it("deve remover voto de um problema", async () => {
      const response = await request(app)
        .delete(`/api/votes/${problem.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty(
        "message",
        "Voto removido com sucesso"
      );

      // Verificar se o voto foi realmente removido
      const vote = await prisma.voto.findFirst({
        where: {
          usuarioId: user.id,
          problemaId: problem.id
        }
      });

      expect(vote).toBeNull();
    });

    it("deve retornar erro 401 sem autenticação", async () => {
      const response = await request(app)
        .delete(`/api/votes/${problem.id}`)
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });

    it("deve retornar erro 404 se usuário não votou nesse problema", async () => {
      const otherUser = await createTestUser({
        nome: "Other User",
        email: "other@example.com"
      });

      const otherToken = generateTestToken(otherUser);

      const response = await request(app)
        .delete(`/api/votes/${problem.id}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body.error).toContain("Voto não encontrado");
    });
  });

  describe("GET /api/votes/user", () => {
    beforeEach(async () => {
      // Criar vários problemas e votar em alguns
      const problem2 = await createTestProblem(user.id, category.id, {
        titulo: "Problema 2"
      });

      const problem3 = await createTestProblem(user.id, category.id, {
        titulo: "Problema 3"
      });

      await prisma.voto.createMany({
        data: [
          { usuarioId: user.id, problemaId: problem.id },
          { usuarioId: user.id, problemaId: problem2.id }
        ]
      });
    });

    it("deve listar todos os votos do usuário autenticado", async () => {
      const response = await request(app)
        .get("/api/votes/user")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty("problema");
    });

    it("deve retornar array vazio se usuário não tem votos", async () => {
      const newUser = await createTestUser({
        nome: "New User",
        email: "new@example.com"
      });

      const newToken = generateTestToken(newUser);

      const response = await request(app)
        .get("/api/votes/user")
        .set("Authorization", `Bearer ${newToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it("deve retornar erro 401 sem autenticação", async () => {
      const response = await request(app).get("/api/votes/user").expect(401);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/votes/problem/:problemId", () => {
    it("deve retornar contagem de votos de um problema", async () => {
      // Criar múltiplos usuários e votos
      const user2 = await createTestUser({
        nome: "User 2",
        email: "user2@example.com"
      });

      const user3 = await createTestUser({
        nome: "User 3",
        email: "user3@example.com"
      });

      await prisma.voto.createMany({
        data: [
          { usuarioId: user.id, problemaId: problem.id },
          { usuarioId: user2.id, problemaId: problem.id },
          { usuarioId: user3.id, problemaId: problem.id }
        ]
      });

      const response = await request(app)
        .get(`/api/votes/problem/${problem.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("problemId", problem.id);
      expect(response.body).toHaveProperty("count", 3);
    });

    it("deve retornar 0 votos para problema sem votos", async () => {
      const response = await request(app)
        .get(`/api/votes/problem/${problem.id}`)
        .expect(200);

      expect(response.body.count).toBe(0);
    });
  });
});
