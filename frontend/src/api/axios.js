import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,           // always send cookies
  headers: { 'Content-Type': 'application/json' }
});

// ── Refresh state guard ───────────────────────────────────────────────────────
let isRefreshing   = false;
let failedQueue    = [];  // queued requests during a refresh

const processQueue = (error) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve());
  failedQueue = [];
};

// ── Response interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  response => response,                // pass successful responses through
  async error => {
    const originalRequest = error.config;

    // Only handle 401s that haven't already been retried
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Queue the request until the refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');   // refreshToken cookie sent automatically
        processQueue(null);
        return api(originalRequest);       // retry the original request
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed → clear session and redirect to login
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
