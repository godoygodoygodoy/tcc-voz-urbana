export function prepareTestDatabase(env = process.env) {
  if (env.NODE_ENV !== 'test') throw new Error('Database fixtures require NODE_ENV=test.');
  if (!env.TEST_DATABASE_URL || env.TEST_DATABASE_ALLOW_CLEANUP !== 'true') {
    throw new Error('Tests blocked: configure an isolated TEST_DATABASE_URL and TEST_DATABASE_ALLOW_CLEANUP=true.');
  }
  const url = new URL(env.TEST_DATABASE_URL);
  if (url.protocol !== 'mysql:' || !decodeURIComponent(url.pathname).endsWith('_test')) {
    throw new Error('Test database must use mysql:// and a database name ending in _test.');
  }
  if (env.DATABASE_URL && env.DATABASE_URL !== env.TEST_DATABASE_URL && new URL(env.DATABASE_URL).pathname === url.pathname) {
    throw new Error('Test database name must differ from the configured application database.');
  }
  env.DATABASE_URL = env.TEST_DATABASE_URL;
}
