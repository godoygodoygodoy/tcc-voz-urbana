const key = import.meta.env.VITE_GIPHY_API_KEY?.trim();
// Official policy: direct requests, no response/media cache, no proxy or Storage
// copy. Only the provider ID is persisted, never a cached rendition URL.
export const giphyConfigured = () => Boolean(key);
async function read(path, params, signal) {
  if (!key) throw Error('mediaProviderNotConfigured');
  let response;
  try {
    response = await fetch('https://api.giphy.com/v1/' + path + '?' + new URLSearchParams({
      ...params,
      api_key: key
    }), {
      signal,
      cache: 'no-store',
      credentials: 'omit'
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw Error('mediaProviderUnavailable');
  }
  if (!response.ok) throw Error(response.status === 429 ? 'mediaProviderRateLimited' : 'mediaProviderUnavailable');
  try{return await response.json();}catch{throw Error('mediaProviderUnavailable');}
}
export const giphyProvider = {
  async search({
    q = '',
    kind = 'gifs',
    offset = 0,
    language = 'pt'
  }, signal) {
    const result = await read((kind === 'stickers' ? 'stickers' : 'gifs') + '/' + (q.trim() ? 'search' : 'trending'), {
      ...(q.trim() ? {
        q: q.trim(),
        lang: language
      } : {}),
      limit: '12',
      offset: String(offset),
      rating: 'pg'
    }, signal);
    return {
      data: result.data || [],
      hasMore: offset + (result.pagination?.count || 0) < Math.min(q.trim() ? 4999 : 499, result.pagination?.total_count || 0)
    };
  },
  async get(id, signal) {
    if (!/^[a-zA-Z0-9]{1,64}$/.test(id)) throw Error('storyCompositionInvalid');
    return (await read('gifs/' + id, {}, signal)).data;
  }
};
export const giphyImage = item => item?.images?.fixed_height?.url || null;
