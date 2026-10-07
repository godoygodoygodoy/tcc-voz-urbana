import "dotenv/config";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/password.js";

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
  for (const category of categories) {
    await prisma.categoria.upsert({
      where: { nome: category.nome },
      update: { icone: category.icone, cor: category.cor },
      create: category
    });
  }

  const email = (process.env.ADMIN_EMAIL || "danielgodoy.txt@gmail.com").trim().toLowerCase();
  let user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) throw new Error("Defina ADMIN_PASSWORD para criar a conta administrativa inexistente");
    user = await prisma.usuario.create({
      data: {
        nome: "Administrador",
        email,
        senhaHash: await hashPassword(password)
      }
    });
  }

  await prisma.usuario.update({
    where: { id: user.id },
    data: { nivel: "ADMIN", emailVerificado: true, tokenVerificacao: null, tokenVerificacaoExpira: null }
  });

  await prisma.admin.upsert({
    where: { usuarioId: user.id },
    update: { nivel: "SUPER_ADMIN" },
    create: { usuarioId: user.id, nivel: "SUPER_ADMIN" }
  });
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
