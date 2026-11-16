import { Prisma } from '@prisma/client';

// Metadata only. This does not create tables, run migrations or inspect account data.
export async function inspectSchema(db, models = Prisma.dmmf.datamodel.models) {
  const columns = await db.$queryRaw`SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()`;
  const tables = new Map();
  for (const row of columns) {
    if (!tables.has(row.TABLE_NAME)) tables.set(row.TABLE_NAME, new Set());
    tables.get(row.TABLE_NAME).add(row.COLUMN_NAME);
  }
  const missing = [];
  for (const model of models) {
    const table = model.dbName || model.name;
    if (!tables.has(table)) { missing.push({ table, missingTable: true }); continue; }
    const fields = model.fields.filter(field => field.kind !== 'object' && !tables.get(table).has(field.dbName || field.name)).map(field => field.dbName || field.name);
    if (fields.length) missing.push({ table, columns: fields });
  }
  return { compatible: missing.length === 0, missing, migrationHistoryPresent: tables.has('_prisma_migrations') };
}

export async function assertSchemaReady(db) {
  const result = await inspectSchema(db);
  if (!result.compatible) throw Object.assign(new Error('Database schema is behind this release. Review migrations and verify a backup before deploying.'), { code: 'SCHEMA_NOT_READY', missingSchema: result.missing });
  return result;
}
