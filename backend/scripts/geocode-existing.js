import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

const stateNames = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina",
  SP: "São Paulo", SE: "Sergipe", TO: "Tocantins"
};

const uniqueParts = (parts) => {
  const seen = new Set();
  return parts.map((part) => String(part || "").trim()).filter((part) => {
    const key = part.toLocaleLowerCase("pt-BR");
    if (!part || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const geocode = async (problem) => {
  const state = stateNames[String(problem.estado || "").toUpperCase()] || problem.estado;
  const query = uniqueParts([problem.endereco, problem.cidade, state, "Brasil"]).join(", ");
  if (!problem.endereco || !query) return null;
  const response = await fetch(`https://photon.komoot.io/api/?limit=5&q=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json", "User-Agent": "VozUrbana/1.0 (contact@vozurbana.local)" }
  });
  if (!response.ok) return null;
  const feature = (await response.json()).features?.find((item) => item.properties?.countrycode === "BR");
  if (!feature?.geometry?.coordinates || feature.geometry.coordinates.length !== 2) return null;
  const [longitude, latitude] = feature.geometry.coordinates;
  return { latitude: Number(latitude), longitude: Number(longitude) };
};

const run = async () => {
  const problems = await prisma.problema.findMany({
    where: { endereco: { not: null } },
    select: { id: true, endereco: true, cidade: true, estado: true, latitude: true, longitude: true }
  });
  let updated = 0;
  for (const problem of problems) {
    try {
      const cleanAddress = uniqueParts(problem.endereco.split(",")).join(", ");
      const location = problem.latitude !== null && problem.longitude !== null ? null : await geocode(problem);
      if (!location && cleanAddress === problem.endereco) continue;
      await prisma.problema.update({
        where: { id: problem.id },
        data: { endereco: cleanAddress, ...(location || {}) }
      });
      updated += 1;
    } catch (error) {
      console.warn(`Não foi possível geocodificar ${problem.id}: ${error.message}`);
    }
  }
  console.log(`Geocodificação concluída: ${updated} de ${problems.length} publicação(ões) atualizada(s).`);
};

run().finally(() => prisma.$disconnect());
