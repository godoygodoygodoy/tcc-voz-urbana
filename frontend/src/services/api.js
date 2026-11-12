import { translateApiError } from '../i18n';
import axios from 'axios';

const BACKEND_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : ''))
  .trim().replace(/\/+$/, '').replace(/\/api$/, '');
const API_URL = `${BACKEND_URL}/api`;
export const mediaUrl = (url) => (!url || /^(https?:|blob:|data:)/i.test(url) ? url : `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`);

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para erro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data && typeof error.response.data === 'object') {
      for (const field of ['error', 'message']) {
        const original = error.response.data[field];
        if (typeof original === 'string') Object.defineProperty(error.response.data, field, {
          configurable: true, enumerable: true, get: () => translateApiError(original),
        });
      }
    }
    // Redirecionamento por verificacao de e-mail mantido como legado, mas desativado.
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = `${import.meta.env.BASE_URL}login`;
    }
    return Promise.reject(error);
  }
);

const inFlight = new Map();
let categoriesCache;
const sharedGet = (url) => {
  const key = JSON.stringify([localStorage.getItem('token'), url]);
  if (!inFlight.has(key)) {
    const request = api.get(url).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
  }
  return inFlight.get(key);
};
// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  // verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),
  // resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

export const visitsAPI = {
  record: (data) => api.post('/visits', data),
};

// Problems
export const problemsAPI = {
  list: (params, options) => api.get('/problems', { params, ...options }),
  create: (data) => {
    return api.post('/problems', data);
  },
  get: (id, options) => api.get(`/problems/${id}`, options),
  update: (id, data) => api.put(`/problems/${id}`, data),
  remove: (id) => api.delete(`/problems/${id}`),
};

export const storiesAPI = {
  list:(params,options)=>api.get('/stories',{params,...options}),
  publish:data=>api.post('/stories',data),
  view:id=>api.post('/stories/'+id+'/view'),
  remove:id=>api.delete('/stories/'+id),
};
export const collectionsAPI = {
  list: (params, options) => api.get('/collections', { params, ...options }),
  publicList: (ownerId, params, options) => api.get('/collections/public/'+ownerId, { params, ...options }),
  get: (id, params, options) => api.get('/collections/'+id, { params, ...options }),
  create: data => api.post('/collections', data),
  update: (id,data) => api.patch('/collections/'+id, data),
  remove: id => api.delete('/collections/'+id),
  add: (id,problemId) => api.put('/collections/'+id+'/items/'+problemId),
  removeItem: (id,problemId) => api.delete('/collections/'+id+'/items/'+problemId),
};
export const savedAPI = {
  list: () => api.get('/saved'),
  save: (problemId) => api.post(`/saved/${problemId}`),
  remove: (problemId) => api.delete(`/saved/${problemId}`),
};

// Categories
export const categoriesAPI = {
  list: () => {
    if (categoriesCache && Date.now() - categoriesCache.time < 300000) return Promise.resolve(categoriesCache.response);
    return sharedGet('/categories').then((response) => ({
    ...response,
    data: [...(response.data || [])].sort((a, b) => {
      const aIsOther = a.name?.toLocaleLowerCase() === 'outros';
      const bIsOther = b.name?.toLocaleLowerCase() === 'outros';

      if (aIsOther !== bIsOther) return aIsOther ? 1 : -1;
      return (a.name || '').localeCompare(b.name || '', 'pt-BR');
    }),
  })).then(response => { categoriesCache = { time: Date.now(), response }; return response; });
  },
};

// Votes
export const votesAPI = {
  vote: (problemId, data) => api.post(`/votes/${problemId}`, data),
};

export const commentsAPI = {
  list: (problemId, options) => api.get(`/comments/${problemId}`, options),
  create: (problemId, data) => api.post(`/comments/${problemId}`, data),
};

export const notificationsAPI = {
  list: () => sharedGet('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const socialAPI = {
  searchUsers: (params, options) => api.get('/social/users/search', { params, ...options }),
  commonConnections: (id, options) => api.get('/social/users/'+id+'/common-connections', options),
  commonFollowers: (id, params) => api.get('/social/users/'+id+'/common-connections', { params: { ...params, direction: 'followers' } }),
  commonFollowing: (id, params) => api.get('/social/users/'+id+'/common-connections', { params: { ...params, direction: 'following' } }),
  relationship: (id) => api.get('/social/users/'+id+'/relationship'),
  follow: (id) => api.post('/social/users/'+id+'/follow'),
  unfollow: (id) => api.delete('/social/users/'+id+'/follow'),
  respondFollowRequest: (id, action) => api.patch('/social/follow-requests/'+id, { action }),
  followers: (id, params) => api.get('/social/users/'+id+'/followers', { params }),
  following: (id, params) => api.get('/social/users/'+id+'/following', { params }),
  requests: () => api.get('/social/follow-requests/received'),
  sentRequests: () => api.get('/social/follow-requests/sent'),
  profile: (id) => api.get(`/social/users/${id}/profile`),
  profileByUsername: (username) => api.get(`/social/users/username/${encodeURIComponent(username)}/profile`),
  likedPublications: (id) => api.get(`/social/users/${id}/likes`),
};

export const conversationsAPI = {
  list: () => api.get('/conversations'),
  create: (userId) => api.post(`/conversations/${userId}`),
  messages: (id, params) => api.get(`/conversations/${id}/messages`, { params }),
  send: (id, data) => api.post(`/conversations/${id}/messages`, data),
};

// Users
export const usersAPI = {
  getMe: () => sharedGet('/users/me'),
  updateMe: (data) => data instanceof FormData
    ? api.put('/users/me', data)
    : api.put('/users/me', data),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getStatsByPeriod: (period) => api.get('/admin/stats', { params: { period } }),
  updateProblem: (id, data) => api.put(`/admin/problems/${id}`, data),
  createCategory: (data) => api.post('/admin/categories', data).then(response => { categoriesCache = null; return response; }),
  listUsers: (params) => api.get('/admin/users', { params }),
  listProblems: (params) => api.get('/admin/problems', { params }),
  deleteProblem: (id) => api.delete(`/admin/problems/${id}`),
  getAnalytics: () => api.get('/admin/analytics'),
  getLogs: (params) => api.get('/admin/logs', { params }),
  getSystem: () => api.get('/admin/system'),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
};

export default api;
