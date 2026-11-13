// Run from backend/: node scripts/diagnose-production.js --read-only
// Only SELECTs and counts; never logs credentials, JWTs or account records.
import 'dotenv/config';

if (!process.argv.includes('--read-only')) {
  console.error('Use --read-only to run the metadata and search diagnostics. No migrations are executed.');
  process.exit(1);
}
const { prisma } = await import('../src/config/prisma.js');
const { createPeopleSearch } = await import('../src/services/peopleSearch.js');
const print = value => console.log(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? Number(item) : item));
const errorCode = error => ({ code: error.code || error.name,
  databaseCode: error.meta?.driverAdapterError?.cause?.originalCode || error.cause?.originalCode || null,
  collationConflict: /collation/i.test(error.message || '') });

try {
  print({ session: await prisma.$queryRaw`SELECT @@version AS version, @@collation_server AS serverCollation,
    @@character_set_database AS databaseCharset, @@collation_database AS databaseCollation,
    @@character_set_connection AS connectionCharset, @@collation_connection AS connectionCollation` });
  print({ tables: await prisma.$queryRaw`SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.TABLES
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('usuarios','problemas','notificacoes')` });
  const columns = await prisma.$queryRaw`SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND (
      (TABLE_NAME='usuarios' AND COLUMN_NAME IN ('nome','username','email')) OR
      (TABLE_NAME='problemas' AND COLUMN_NAME IN ('titulo','descricao','endereco','cidade','estado','bairro')) OR
      (TABLE_NAME='notificacoes' AND COLUMN_NAME='chave_evento'))`;
  print({ columns });
  const pattern = '%Voz%';
  print({ parameter: await prisma.$queryRaw`SELECT COLLATION(${pattern}) AS parameterCollation, COERCIBILITY(${pattern}) AS parameterCoercibility` });
  const models = { usuarios: 'usuario', problemas: 'problema', notificacoes: 'notificacao' };
  for (const column of columns) {
    const field = column.COLUMN_NAME === 'chave_evento' ? 'chaveEvento' : column.COLUMN_NAME;
    try {
      const count = await prisma[models[column.TABLE_NAME]].count({ where: { [field]: { contains: 'Voz' } } });
      print({ search: { table: column.TABLE_NAME, column: column.COLUMN_NAME, ok: true, count } });
    } catch (error) {
      process.exitCode = 1;
      print({ search: { table: column.TABLE_NAME, column: column.COLUMN_NAME, ok: false, error: errorCode(error) } });
    }
  }
  await createPeopleSearch(prisma)({ query: { q: 'Voz' } }, { json: result => print({ peopleSearch: { ok: true, total: result.total } }) });
  // Validate a positive match using an existing registration without printing its identity.
  const sample = await prisma.usuario.findFirst({ select: { id: true, nome: true, username: true } });
  const term = [sample?.username, sample?.nome].find(value => typeof value === 'string' && value.trim().replace(/^@+/, '').length >= 2);
  if (term) {
    await createPeopleSearch(prisma)({ query: { q: term, limit: 30 } }, { json: result => {
      const matched = result.data.some(user => user.id === sample.id);
      // A very common name may span multiple pages, so check total without exposing records.
      const publicFieldsOnly = result.data.every(user => Object.keys(user).every(key => ['id', 'nome', 'username', 'fotoPerfil'].includes(key)));
      if (result.total < 1 || !publicFieldsOnly) process.exitCode = 1;
      print({ existingRegistrationSearch: { ok: result.total > 0 && publicFieldsOnly, sampledRecordOnFirstPage: matched, publicFieldsOnly } });
    } });
  } else print({ existingRegistrationSearch: { skipped: 'No searchable existing registration' } });
} catch (error) {
  process.exitCode = 1; print({ diagnosticError: errorCode(error) });
} finally {
  await prisma.$disconnect();
}
