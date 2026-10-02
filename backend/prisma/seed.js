import "dotenv/config";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/password.js";

const categories = ["Asfalto", "Iluminacao", "Limpeza", "Sinalizacao", "Acessibilidade"];

const seed = async () => {
  for (const nome of categories) {
    await prisma.categoria.upsert({
      where: { nome },
      update: {},
      create: { nome }
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
