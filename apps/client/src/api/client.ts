import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

let token: string | null = null;

export function setAuthToken(value: string | null) {
  token = value;
  if (value) localStorage.setItem('localgym_token', value);
  else localStorage.removeItem('localgym_token');
}

export function loadAuthToken(): string | null {
  const stored = localStorage.getItem('localgym_token');
  if (stored) token = stored;
  return token;
}

api.interceptors.request.use((config) => {
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      setAuthToken(null);
      if (!location.pathname.startsWith('/login')) {
        location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
