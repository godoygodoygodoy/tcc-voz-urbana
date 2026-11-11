import { safeMigrate } from './safe-migrate.js';
try { await safeMigrate(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
