import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

// DATABASE_URL é a mesma fonte usada pelas migrations. Variáveis separadas
// continuam disponíveis para instalações locais existentes.
const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (url && url.protocol !== 'mysql:') throw new Error('DATABASE_URL deve usar mysql://');
if (!url && process.env.NODE_ENV === 'production') throw new Error('Defina DATABASE_URL');
const config = url ? {
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.slice(1)),
} : {
	host: process.env.DATABASE_HOST || "localhost",
	port: Number(process.env.DATABASE_PORT || 3306),
	user: process.env.DATABASE_USER || "root",
	password: process.env.DATABASE_PASSWORD || "",
	database: process.env.DATABASE_NAME || "voz_urbana",
};
const caPath = process.env.DATABASE_SSL_CA || url?.searchParams.get('sslcert');
const ssl = process.env.DATABASE_SSL === 'true' || Boolean(caPath) || url?.searchParams.get('sslaccept') === 'strict';
const adapter = new PrismaMariaDb({ ...config, connectionLimit: 5,
  ...(ssl ? { ssl: { rejectUnauthorized: true, ...(caPath ? { ca: fs.readFileSync(caPath, 'utf8') } : {}) } } : {}),
});
const prisma = new PrismaClient({ adapter });

export { prisma };
