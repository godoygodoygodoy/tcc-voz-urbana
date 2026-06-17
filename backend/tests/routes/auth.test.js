import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import { cleanDatabase, createTestUser } from "../helpers/testDb.js";

const app = createTestApp();

describe("Auth Routes", () => {
  // Limpar banco antes de cada teste
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe("POST /api/auth/register", () => {
    it("deve registrar um novo usuário com sucesso", async () => {
      const userData = {
        name: "João Silva",
        email: "joao@example.com",
        password: "senha123"
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "Usuário registrado com sucesso"
      );
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toMatchObject({
        nome: userData.name,
        email: userData.email
      });
      expect(response.body.user).not.toHaveProperty("senhaHash");
    });

    it("deve retornar erro 400 se dados inválidos", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "João",
          email: "email-invalido",
          password: "123" // senha muito curta
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("deve retornar erro 400 se senha menor que 6 caracteres", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "João Silva",
          email: "joao@example.com",
          password: "12345"
        })
        .expect(400);

      expect(response.body.error).toContain("6");
    });

    it("deve retornar erro 409 se email já cadastrado", async () => {
      const userData = {
        name: "João Silva",
        email: "joao@example.com",
        password: "senha123"
      };

      // Primeiro registro
      await request(app).post("/api/auth/register").send(userData).expect(201);

      // Tentativa de registro duplicado
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(409);

      expect(response.body.error).toContain("já cadastrado");
    });

    it("deve retornar erro 400 se campos obrigatórios estão faltando", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "João Silva"
          // faltando email e password
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Criar usuário para login
      await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "password123"
      });
    });

    it("deve fazer login com sucesso", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password123"
        })
        .expect(200);

      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toMatchObject({
        email: "test@example.com"
      });
      expect(response.body.user).not.toHaveProperty("senhaHash");
    });

    it("deve retornar erro 401 com email inválido", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "naoexiste@example.com",
          password: "password123"
        })
        .expect(401);

      expect(response.body.error).toContain("Credenciais inválidas");
    });

    it("deve retornar erro 401 com senha inválida", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "senhaerrada"
        })
        .expect(401);

      expect(response.body.error).toContain("Credenciais inválidas");
    });

    it("deve retornar erro 400 se campos obrigatórios estão faltando", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com"
          // faltando password
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("deve retornar erro 400 se email inválido", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "email-invalido",
          password: "password123"
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/users/me", () => {
    let token;
    let user;

    beforeEach(async () => {
      // Criar e fazer login do usuário
      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: "test@example.com",
          password: "password123"
        });

      token = registerResponse.body.token;
      user = registerResponse.body.user;
    });

    it("deve retornar dados do usuário autenticado", async () => {
      const response = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: user.id,
        email: user.email,
        nome: user.nome
      });
    });

    it("deve retornar erro 401 sem token", async () => {
      const response = await request(app).get("/api/users/me").expect(401);

      expect(response.body).toHaveProperty("error");
    });

    it("deve retornar erro 401 com token inválido", async () => {
      const response = await request(app)
        .get("/api/users/me")
        .set("Authorization", "Bearer token-invalido")
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });
  });
});
