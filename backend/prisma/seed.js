import "dotenv/config";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/password.js";
import Joi from "joi";

const categories = [
  { nome: "Asfalto", icone: "⚫", cor: "#4B5563" },
  { nome: "Lixo", icone: "🟢", cor: "#166534" },
  { nome: "Vegetação", icone: "🌿", cor: "#22C55E" },
  { nome: "Iluminação", icone: "💡", cor: "#FACC15" },
  { nome: "Sinalização", icone: "🔵", cor: "#2563EB" },
  { nome: "Saneamento", icone: "🩵", cor: "#06B6D4" },
  { nome: "Área com grande quantidade de furto", icone: "🟣", cor: "#7C3AED" },
  { nome: "Acidentes de carros", icone: "🔴", cor: "#DC2626" },
  { nome: "Outros", icone: "⚪", cor: "#6B7280" },
  { nome: "Limpeza", icone: "🧹", cor: "#15803D" },
  { nome: "Acessibilidade", icone: "♿", cor: "#0EA5E9" }
];

const seed = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (Joi.string().email().required().validate(email).error) {
    throw new Error("Defina ADMIN_EMAIL com um e-mail válido antes de executar o seed administrativo");
  }
  const existingUser = await prisma.usuario.findUnique({ where: { email } });
  const password = process.env.ADMIN_PASSWORD;
  if (!existingUser && (!password || password.trim().length < 12 || Buffer.byteLength(password, "utf8") > 72)) {
    throw new Error("Defina ADMIN_PASSWORD com pelo menos 12 caracteres e no máximo 72 bytes para criar o administrador");
  }
  const senhaHash = existingUser ? undefined : await hashPassword(password);
  for (const category of categories) {
    await prisma.categoria.upsert({
      where: { nome: category.nome },
      update: { icone: category.icone, cor: category.cor },
      create: category
    });
  }

  const permissions = {
    nivel: "ADMIN",
    emailVerificado: true,
    tokenVerificacao: null,
    tokenVerificacaoExpira: null
  };
  // Escrita aninhada: conta e permissões são persistidas na mesma transação.
  if (!existingUser) {
    await prisma.usuario.create({
      data: {
        nome: "Administrador",
        email,
        senhaHash,
        ...permissions,
        admin: { create: { nivel: "SUPER_ADMIN" } }
      }
    });
  } else {
    // Reexecutar o seed promove a conta sem redefinir sua senha ou perfil.
    await prisma.usuario.update({
      where: { id: existingUser.id },
      data: {
        ...permissions,
        admin: {
          upsert: {
            update: { nivel: "SUPER_ADMIN" },
            create: { nivel: "SUPER_ADMIN" }
          }
        }
      }
    });
  }
  console.log("Conta administrativa configurada com acesso SUPER_ADMIN.");
};

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
