import axios, { AxiosError, AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const ACCESS_KEY = 'rz_access';
const REFRESH_KEY = 'rz_refresh';

export const tokens = {
  get access() { return localStorage.getItem(ACCESS_KEY); },
  get refresh() { return localStorage.getItem(REFRESH_KEY); },
  set({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  setAccess(t: string) { localStorage.setItem(ACCESS_KEY, t); },
  clear() { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY); },
};

export const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const t = tokens.access;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// On 401, try one refresh + retry. If refresh fails, clear and bubble up.
let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const rt = tokens.refresh;
  if (!rt) return null;
  try {
    const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: rt });
    tokens.set(data);
    return data.accessToken;
  } catch {
    tokens.clear();
    return null;
  }
}

api.interceptors.response.use(
  (r: AxiosResponse) => r,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing = refreshing || doRefresh();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      window.dispatchEvent(new Event('rz:logout'));
    }
    return Promise.reject(err);
  }
);
