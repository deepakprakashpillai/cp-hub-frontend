import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { logout, restoreSession } from "@/features/auth/api";
import { AuthContext, type AuthContextValue } from "@/features/auth/auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => (await restoreSession()).user,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    const clearSession = () => queryClient.setQueryData(["auth", "me"], null);
    window.addEventListener("cp-hub:session-expired", clearSession);
    return () => window.removeEventListener("cp-hub:session-expired", clearSession);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session.data ?? null,
    isLoading: session.isLoading,
    isAuthenticated: Boolean(session.data),
    startSession: (newSession) => queryClient.setQueryData(["auth", "me"], newSession.user),
    signOut: async () => {
      try { await logout(); } finally { queryClient.setQueryData(["auth", "me"], null); queryClient.clear(); }
    },
  }), [queryClient, session.data, session.isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
