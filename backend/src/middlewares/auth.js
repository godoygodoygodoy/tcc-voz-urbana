import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { email: true }
    });
    if (!user) return res.status(401).json({ error: "Conta não encontrada" });
    // A verificacao de e-mail foi mantida no schema como legado e nao bloqueia acesso.
    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
};

export const adminMiddleware = async (req, res, next) => {
  const admin = await prisma.admin.findUnique({
    where: { usuarioId: req.userId }
  });

  if (!admin) {
    return res
      .status(403)
      .json({ error: "Acesso negado. Apenas administradores." });
  }
  req.adminLevel = admin.nivel;
  next();
};
