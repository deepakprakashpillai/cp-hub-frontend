import axios, { type InternalAxiosRequestConfig } from "axios";

type RetriableRequest = InternalAxiosRequestConfig & { _retried?: boolean };
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export const api = axios.create({
  baseURL,
  // The API owns the HttpOnly session cookie. Keeping it out of JavaScript makes
  // this ready for a second provider (for example Google) without changing the UI.
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({ baseURL, withCredentials: true });
let refreshInFlight: Promise<void> | null = null;
let accessToken: string | null = null;

export function setAccessToken(token: string | null) { accessToken = token; }

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = refreshClient.post<{ access_token: string }>("/auth/refresh").then((response) => {
      setAccessToken(response.data.access_token);
    }).finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as RetriableRequest | undefined;
    const isAuthEndpoint = request?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && request && !request._retried && !isAuthEndpoint) {
      request._retried = true;
      try {
        await refreshSession();
        return api(request);
      } catch {
        // The refresh cookie is HttpOnly and never exposed to app code. A failed
        // refresh means the server session is no longer usable.
      }
    }
    if (error.response?.status === 401) window.dispatchEvent(new Event("cp-hub:session-expired"));
    return Promise.reject(error);
  },
);
