import { releaseInfo } from '../config/release.js';
export function notFound(req, res) {
  // Do not log query strings: media access tickets and tokens can be in them.
  console.error(JSON.stringify({ event: 'route_not_found', method: req.method,
    area: req.path.startsWith('/api/') ? req.path.split('/').slice(0,3).join('/') : 'outside_api', ...releaseInfo() }));
  res.status(404).json({ error: 'Rota não encontrada', code: 'API_ROUTE_NOT_FOUND' });
}
