import { api, setAccessToken } from "@/api/http";

export type UserRole = "admin" | "teacher" | "student" | "lead_manager";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  teacher_id?: string | null;
  student_id?: string | null;
};

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await api.get<AuthUser>("/auth/me");
  return response.data;
}

export type Session = { access_token: string; expires_at: string; user: AuthUser };

export async function login(payload: { email: string; password: string }): Promise<Session> {
  const response = await api.post<Session>("/auth/login", payload);
  setAccessToken(response.data.access_token);
  return response.data;
}

export async function restoreSession(): Promise<Session> {
  const response = await api.post<Session>("/auth/refresh");
  setAccessToken(response.data.access_token);
  return response.data;
}

export async function logout(): Promise<void> {
  try { await api.post("/auth/logout"); } finally { setAccessToken(null); }
}

export async function setPassword(payload: { token: string; password: string }): Promise<void> {
  await api.post("/auth/password/setup", payload);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/password/reset-request", { email });
}

export async function resetPassword(payload: { token: string; password: string }): Promise<void> {
  await api.post("/auth/password/reset", payload);
}
