import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";

import { queryClient } from "@/api/query-client";
import { ThemeProvider } from "@/app/theme-provider";
import { router } from "@/app/router";
import { AuthProvider } from "@/features/auth/auth-provider";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
