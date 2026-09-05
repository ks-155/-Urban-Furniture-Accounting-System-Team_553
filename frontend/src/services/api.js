import axios from 'axios';

// Base URL matches docs/CONTRACT.md — override via .env for deploy
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Mock mode: when backend is down or VITE_USE_MOCK=true, context falls back to local mock.
// Set to 'false' in production once backend is stable.
export const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK !== 'false';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('uf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401/403, clear stale session so ProtectedRoute redirects to /login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      const url = err.config?.url || '';
      // Don't wipe session on the login/signup call itself — the form shows the error
      if (!url.includes('/auth/login') && !url.includes('/auth/signup')) {
        localStorage.removeItem('uf_token');
        localStorage.removeItem('uf_user');
      }
    }
    return Promise.reject(err);
  }
);

export const getApiError = (err, fallback = 'Something went wrong. Please try again.') => {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ECONNABORTED') return 'Request timed out. Is the backend running on :5000?';
  if (err?.message === 'Network Error') return 'Cannot reach backend at http://localhost:5000. Start it with `npm run dev` in backend/.';
  return fallback;
};

export const authAPI = {
  login: (loginId, password) => api.post('/auth/login', { loginId, password }),
  signup: (payload) => api.post('/auth/signup', payload),
  me: () => api.get('/auth/me'),
};

// Stubs for Phase 2+ (Member 1). Frontend keeps using mock context until these land.
export const contactsAPI = {
  list: (params) => api.get('/contacts', { params }),
  get: (id) => api.get(`/contacts/${id}`),
  create: (payload) => api.post('/contacts', payload),
  update: (id, payload) => api.put(`/contacts/${id}`, payload),
};

export const productsAPI = {
  list: () => api.get('/products'),
  create: (payload) => api.post('/products', payload),
};
