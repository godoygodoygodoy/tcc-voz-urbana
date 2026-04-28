import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// Problems
export const problemsAPI = {
  list: (params) => api.get('/problems', { params }),
  create: (data) => api.post('/problems', data),
  get: (id) => api.get(`/problems/${id}`),
};

// Categories
export const categoriesAPI = {
  list: () => api.get('/categories'),
};

// Votes
export const votesAPI = {
  vote: (problemId, data) => api.post(`/votes/${problemId}`, data),
};

// Users
export const usersAPI = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  updateProblem: (id, data) => api.put(`/admin/problems/${id}`, data),
  createCategory: (data) => api.post('/admin/categories', data),
};

export default api;
