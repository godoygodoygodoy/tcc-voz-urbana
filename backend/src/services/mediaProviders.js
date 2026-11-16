import jwt from 'jsonwebtoken';
import { socialError } from './socialGraph.js';

// Providers return references. Protected Apple audio is never fetched or exported.
export function createMediaProviders({
  env = process.env,
  fetcher = fetch,
  now = Date.now
} = {}) {
  let token = null,
    expires = 0;
  const configured = () => Boolean(env.APPLE_MUSIC_TEAM_ID && env.APPLE_MUSIC_KEY_ID && env.APPLE_MUSIC_PRIVATE_KEY);
  const developerToken = origin => {
    if (!configured()) throw socialError(503, 'mediaProviderNotConfigured');
    if (!token || now() > expires) {
      try {
        token = jwt.sign({}, env.APPLE_MUSIC_PRIVATE_KEY.replace(/\\n/g, '\n'), {
          algorithm: 'ES256',
          keyid: env.APPLE_MUSIC_KEY_ID,
          issuer: env.APPLE_MUSIC_TEAM_ID,
          expiresIn: '15m'
        });
        expires = now() + 12 * 60000;
      } catch {
        throw socialError(503, 'mediaProviderNotConfigured');
      }
    }
    if (!origin) return token;
    const allowed = [env.FRONTEND_URL, env.CORS_ORIGIN].filter(Boolean).flatMap(value => value.split(',')).map(value => {
      try {
        return new URL(value.trim()).origin;
      } catch {
        return null;
      }
    });
    if (!allowed.includes(origin)) throw socialError(403, 'mediaProviderUnavailable');
    try {
      return jwt.sign({
        origin: [origin]
      }, env.APPLE_MUSIC_PRIVATE_KEY.replace(/\\n/g, '\n'), {
        algorithm: 'ES256',
        keyid: env.APPLE_MUSIC_KEY_ID,
        issuer: env.APPLE_MUSIC_TEAM_ID,
        expiresIn: '10m'
      });
    } catch {
      throw socialError(503, 'mediaProviderNotConfigured');
    }
  };
  const storefront = () => /^[a-z]{2}$/.test(env.APPLE_MUSIC_STOREFRONT || '') ? env.APPLE_MUSIC_STOREFRONT : 'br';
  const read = async path => {
    const authorization = developerToken();
    let response;
    try {
      response = await fetcher('https://api.music.apple.com/v1/catalog/' + storefront() + '/' + path, {
        headers: {
          Authorization: 'Bearer ' + authorization
        },
        signal: AbortSignal.timeout(8000)
      });
    } catch {
      throw socialError(503, 'mediaProviderUnavailable');
    }
    if (!response.ok) throw socialError(response.status === 429 ? 429 : 503, response.status === 429 ? 'mediaProviderRateLimited' : 'mediaProviderUnavailable');
    try {
      return await response.json();
    } catch {
      throw socialError(503, 'mediaProviderUnavailable');
    }
  };
  const item = row => {
    const a = row.attributes || {};
    return {
      id: row.id,
      type: row.type,
      provider: 'apple',
      name: String(a.name || '').slice(0, 300),
      artist: String(a.artistName || '').slice(0, 300),
      url: /^https:\/\/music\.apple\.com\//.test(a.url || '') ? a.url : null,
      artwork: /^https:\/\/[^/]+\.mzstatic\.com\//.test(a.artwork?.url || '') ? a.artwork.url.replace('{w}', '240').replace('{h}', '240') : null
    };
  };
  return {
    status: () => ({
      apple: {
        configured: configured(),
        audioExport: false
      },
      giphy: {
        configuration: 'public-web-key',
        clientSide: true
      }
    }),
    clientToken: origin => {
      if (!origin) throw socialError(403, 'mediaProviderUnavailable');
      return {
        developerToken: developerToken(origin),
        storefront: storefront()
      };
    },
    async search({
      q = '',
      type = 'songs',
      offset = 0
    } = {}) {
      if (!['songs', 'artists', 'albums'].includes(type) || typeof q !== 'string' || !q.trim() || q.length > 100) throw socialError(400, 'storyCompositionInvalid');
      const start = Math.max(0, Math.min(1000, parseInt(offset, 10) || 0));
      const result = await read('search?' + new URLSearchParams({
        term: q.trim(),
        types: type,
        limit: '12',
        offset: String(start)
      }));
      const group = result.results?.[type] || {};
      return {
        data: (group.data || []).map(item),
        hasMore: Boolean(group.next),
        offset: start
      };
    },
    async song(id) {
      if (!/^\d{1,64}$/.test(id)) throw socialError(400, 'storyCompositionInvalid');
      const result = await read('songs/' + id);
      if (!result.data?.[0]) throw socialError(400, 'mediaProviderUnavailable');
      return item(result.data[0]);
    }
  };
}
export const mediaProviders = createMediaProviders();
