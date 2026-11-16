import 'dotenv/config';

// Existing Render services can retain `npm start` in dashboard settings even
// after render.yaml changes. Keep that entry point guarded in production too.
if (process.env.NODE_ENV === 'production') {
  await import('./start-production.js');
} else {
  await import('../src/server.js');
}
