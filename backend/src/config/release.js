// Public deployment identity only. Never expose environment variables or secrets.
export const API_CONTRACT = '2026-11-15-profile-v1';
export function releaseInfo(env = process.env) {
  const commit = env.RENDER_GIT_COMMIT || env.GIT_COMMIT_SHA || '';
  return { apiContract: API_CONTRACT, revision: /^[a-f0-9]{40}$/i.test(commit) ? commit : null };
}
