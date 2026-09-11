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

  const email = process.env.ADMIN_EMAIL || "admin@vozurbana.local";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD precisa estar definido para executar o seed");
  }

  const user = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nome: "Administrador",
      email,
      senhaHash: await hashPassword(password)
    }
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
