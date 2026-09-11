import express from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

const router = express.Router();

// Listar categorias
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await prisma.categoria.findMany({
      orderBy: { nome: "asc" }
    });

    res.json(categories.map(({ id, nome }) => ({ id, name: nome })));
  })
);

// Obter categoria por ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const category = await prisma.categoria.findUnique({
      where: { id: req.params.id }
    });

    if (!category) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    res.json({ id: category.id, name: category.nome });
  })
);

export default router;
