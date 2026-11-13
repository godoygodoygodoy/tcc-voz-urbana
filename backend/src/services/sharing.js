import { socialError } from './socialGraph.js';
const escape = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[char]);
export async function publicShare(db, id, {
  apiOrigin,
  frontendUrl,
  language = 'pt-BR'
}) {
  const problem = await db.problema.findFirst({
    where: {
      id,
      usuario: {
        is: {
          perfilPrivado: false
        }
      }
    },
    include: {
      imagens: {
        orderBy: {
          id: 'asc'
        },
        take: 1
      }
    }
  });
  if (!problem) throw socialError(404, 'sharePublicOnly');
  const origin = new URL(apiOrigin);
  if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password) throw socialError(503, 'shareUnavailable');
  if (typeof frontendUrl !== 'string') throw socialError(503, 'shareUnavailable');
  const frontend = new URL(frontendUrl.endsWith('/') ? frontendUrl : frontendUrl + '/');
  if (!['http:', 'https:'].includes(frontend.protocol) || frontend.username || frontend.password) throw socialError(503, 'shareUnavailable');
  const languageQuery = ['en','es'].includes(language) ? '?lang='+language : '';
  const url = origin.origin + '/share/problem/' + encodeURIComponent(id)+languageQuery,
    appUrl = new URL('problem/' + encodeURIComponent(id), frontend).href;
  const image = problem.imagens?.[0],
    imageUrl = image ? origin.origin + '/api/shares/' + encodeURIComponent(id) + '/image/' + encodeURIComponent(image.id) : null;
  const title = String(problem.titulo || 'Voz Urbana').slice(0, 150),
    description = String(problem.descricao || '').slice(0, 300);
  const words = {
      en: ['Open post', 'Shared from Voz Urbana'],
      es: ['Abrir publicación', 'Compartido desde Voz Urbana'],
      'pt-BR': ['Abrir publicação', 'Compartilhado pelo Voz Urbana']
    },
    locale = Object.hasOwn(words,language) ? language : 'pt-BR';
  const html = `<!DOCTYPE html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Voz Urbana</title><link rel="canonical" href="${escape(url)}"><meta name="description" content="${escape(description)}"><meta property="og:type" content="article"><meta property="og:site_name" content="Voz Urbana"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(url)}">${imageUrl ? `<meta property="og:image" content="${escape(imageUrl)}">` : ''}<meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}"></head><body style="margin:0;background:#09090f;color:#fff;font-family:system-ui,sans-serif"><main style="max-width:720px;margin:8vh auto;padding:24px;border:1px solid #7c3aed55;border-radius:28px;background:#151021"><p style="color:#c4b5fd">VOZ URBANA</p><h1>${escape(title)}</h1>${imageUrl ? `<img src="${escape(imageUrl)}" alt="" width="640" height="360" style="max-width:100%;height:auto;border-radius:16px">` : ''}<p style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(description)}</p><a href="${escape(appUrl)}" style="display:inline-block;padding:12px 20px;border-radius:14px;background:#7c3aed;color:#fff;text-decoration:none">${words[locale][0]}</a><p style="color:#a1a1aa;font-size:12px">${words[locale][1]}</p></main></body></html>`;
  return {
    url,
    appUrl,
    title,
    description,
    imageUrl,
    html
  };
}
