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
  list: (params) => api.get('/problems', { params }),
  create: (data) => {
    return api.post('/problems', data);
  },
  get: (id) => api.get(`/problems/${id}`),
  update: (id, data) => api.put(`/problems/${id}`, data),
  remove: (id) => api.delete(`/problems/${id}`),
};

export const savedAPI = {
  list: () => api.get('/saved'),
  save: (problemId) => api.post(`/saved/${problemId}`),
  remove: (problemId) => api.delete(`/saved/${problemId}`),
};

// Categories
export const categoriesAPI = {
  list: () => api.get('/categories').then((response) => ({
    ...response,
    data: [...(response.data || [])].sort((a, b) => {
      const aIsOther = a.name?.toLocaleLowerCase() === 'outros';
      const bIsOther = b.name?.toLocaleLowerCase() === 'outros';

      if (aIsOther !== bIsOther) return aIsOther ? 1 : -1;
      return (a.name || '').localeCompare(b.name || '', 'pt-BR');
    }),
  })),
};

// Votes
export const votesAPI = {
  vote: (problemId, data) => api.post(`/votes/${problemId}`, data),
};

export const commentsAPI = {
  list: (problemId) => api.get(`/comments/${problemId}`),
  create: (problemId, data) => api.post(`/comments/${problemId}`, data),
};

export const notificationsAPI = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const socialAPI = {
  searchUsers: (params) => api.get('/social/users/search', { params }),
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
  messages: (id) => api.get(`/conversations/${id}/messages`),
  send: (id, data) => api.post(`/conversations/${id}/messages`, data),
};

// Users
export const usersAPI = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => data instanceof FormData
    ? api.put('/users/me', data)
    : api.put('/users/me', data),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getStatsByPeriod: (period) => api.get('/admin/stats', { params: { period } }),
  updateProblem: (id, data) => api.put(`/admin/problems/${id}`, data),
  createCategory: (data) => api.post('/admin/categories', data),
  listUsers: (params) => api.get('/admin/users', { params }),
  listProblems: (params) => api.get('/admin/problems', { params }),
  deleteProblem: (id) => api.delete(`/admin/problems/${id}`),
  getAnalytics: () => api.get('/admin/analytics'),
  getLogs: (params) => api.get('/admin/logs', { params }),
  getSystem: () => api.get('/admin/system'),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
};

export default api;
