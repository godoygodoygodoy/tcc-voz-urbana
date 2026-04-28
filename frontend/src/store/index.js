import { create } from 'zustand';
import { authAPI } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.register(data);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      set({ user: response.data.user, token: response.data.token });
      return response.data;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Erro ao registrar' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      set({ user: response.data.user, token: response.data.token });
      return response.data;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Erro ao fazer login' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  isAuthenticated: () => get().token !== null,
}));

export const useProblemsStore = create((set) => ({
  problems: [],
  selectedProblem: null,
  loading: false,
  error: null,

  setProblems: (problems) => set({ problems }),
  setSelectedProblem: (problem) => set({ selectedProblem: problem }),
}));

export const useCategoriesStore = create((set) => ({
  categories: [],
  loading: false,
  error: null,

  setCategories: (categories) => set({ categories }),
}));
