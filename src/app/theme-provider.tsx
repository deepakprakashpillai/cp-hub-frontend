import { type PropsWithChildren, useEffect } from "react";

import { useThemeStore } from "@/app/theme-store";

export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }, [theme]);

  return children;
}
