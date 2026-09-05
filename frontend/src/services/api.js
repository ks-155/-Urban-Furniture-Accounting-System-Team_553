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

// Phase 2 Master Data APIs (live on backend). GETs are public; POST/PUT need JWT (attached above).
export const contactsAPI = {
  list: (params) => api.get('/contacts', { params }),
  get: (id) => api.get(`/contacts/${id}`),
  create: (payload) => api.post('/contacts', payload),
  update: (id, payload) => api.put(`/contacts/${id}`, payload),
};

export const productsAPI = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (payload) => api.post('/products', payload),
  update: (id, payload) => api.put(`/products/${id}`, payload),
};

export const accountsAPI = {
  list: (params) => api.get('/accounts', { params }),
  create: (payload) => api.post('/accounts', payload),
};

export const journalsAPI = {
  list: () => api.get('/journals'),
  create: (payload) => api.post('/journals', payload),
};

export const analyticsAPI = {
  list: () => api.get('/analytic-accounts'),
  create: (payload) => api.post('/analytic-accounts', payload),
};

// Admin user management (Excalidraw Create User; ADMIN-only, never changes session)
export const usersAPI = {
  list: () => api.get('/users'),
  create: (payload) => api.post('/users', payload),
};

// Phase 3 Purchase Flow (live backend). All routes require ADMIN/ACCOUNTANT JWT.
export const purchasesAPI = {
  list: (params) => api.get('/purchases', { params }),
  get: (id) => api.get(`/purchases/${id}`),
  create: (payload) => api.post('/purchases', payload),
  confirm: (id) => api.post(`/purchases/${id}/confirm`),
  createBill: (id) => api.post(`/purchases/${id}/create-bill`),
  // Vendor Portal: vendor submits bill with their own invoice ref (SUBMITTED, no JE yet)
  vendorSubmitBill: (id, payload) => api.post(`/purchases/${id}/vendor-submit-bill`, payload),
};

export const billsAPI = {
  list: (params) => api.get('/bills', { params }),
  get: (id) => api.get(`/bills/${id}`),
  create: (payload) => api.post('/bills', payload),
  confirm: (id) => api.post(`/bills/${id}/confirm`),
  pay: (id, payload) => api.post(`/bills/${id}/pay`, payload),
};

// Phase 3 Accounting Engine — strict balanced_entries enforced server-side
export const journalEntriesAPI = {
  list: (params) => api.get('/journal-entries', { params }),
  create: (payload) => api.post('/journal-entries', payload),
};

// Phase 4 Sales Flow (live backend). Reads are role-filtered (USER sees own);
// writes are staff-only except invoice pay (owner-verified for USER portal).
export const salesAPI = {
  list: (params) => api.get('/sales', { params }),
  get: (id) => api.get(`/sales/${id}`),
  create: (payload) => api.post('/sales', payload),
  confirm: (id) => api.post(`/sales/${id}/confirm`),
  createInvoice: (id) => api.post(`/sales/${id}/create-invoice`),
};

export const invoicesAPI = {
  list: (params) => api.get('/invoices', { params }),
  get: (id) => api.get(`/invoices/${id}`),
  create: (payload) => api.post('/invoices', payload),
  confirm: (id) => api.post(`/invoices/${id}/confirm`),
  pay: (id, payload) => api.post(`/invoices/${id}/pay`, payload),
};

export const paymentsAPI = {
  list: (params) => api.get('/payments', { params }),
  get: (id) => api.get(`/payments/${id}`),
};

// Phase 5 Financial Reports, Budgets & Dashboard
export const reportsAPI = {
  balanceSheet: (params) => api.get('/reports/balance-sheet', { params }),
  profitLoss: (params) => api.get('/reports/profit-loss', { params }),
  budget: (params) => api.get('/reports/budget', { params }),
};

export const budgetsAPI = {
  list: (params) => api.get('/budgets', { params }),
  get: (id) => api.get(`/budgets/${id}`),
  create: (payload) => api.post('/budgets', payload),
  confirm: (id) => api.post(`/budgets/${id}/confirm`),
  revise: (id) => api.post(`/budgets/${id}/revise`),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard'),
};

