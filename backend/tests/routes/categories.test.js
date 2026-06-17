import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import { cleanDatabase, createTestCategory } from "../helpers/testDb.js";

const app = createTestApp();

describe("Category Routes", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe("GET /api/categories", () => {
    it("deve listar todas as categorias", async () => {
      await createTestCategory({
        nome: "Infraestrutura",
        descricao: "Problemas de infraestrutura"
      });

      await createTestCategory({
        nome: "Limpeza",
        descricao: "Problemas de limpeza urbana"
      });

      const response = await request(app).get("/api/categories").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty("nome");
      expect(response.body[0]).toHaveProperty("descricao");
    });

    it("deve retornar array vazio se não houver categorias", async () => {
      const response = await request(app).get("/api/categories").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it("deve incluir contagem de problemas por categoria", async () => {
      await createTestCategory({
        nome: "Infraestrutura"
      });

      const response = await request(app).get("/api/categories").expect(200);

      expect(response.body[0]).toHaveProperty("_count");
    });
  });

  describe("GET /api/categories/:id", () => {
    it("deve retornar uma categoria específica", async () => {
      const category = await createTestCategory({
        nome: "Infraestrutura",
        descricao: "Problemas de infraestrutura urbana",
        icone: "🏗️",
        cor: "#FF5733"
      });

      const response = await request(app)
        .get(`/api/categories/${category.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: category.id,
        nome: "Infraestrutura",
        descricao: "Problemas de infraestrutura urbana",
        icone: "🏗️",
        cor: "#FF5733"
      });
    });

    it("deve retornar erro 404 para categoria inexistente", async () => {
      const response = await request(app)
        .get("/api/categories/99999")
        .expect(404);

      expect(response.body).toHaveProperty("error");
    });
  });
});
