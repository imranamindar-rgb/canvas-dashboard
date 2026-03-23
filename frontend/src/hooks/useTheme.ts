import { useState, useCallback, useEffect } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "theme";
const DEFAULT_THEME: Theme = "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return DEFAULT_THEME;
}

export function initTheme(): void {
  const theme = getInitialTheme();
  document.documentElement.setAttribute("data-theme", theme);
  const loader = document.getElementById("app-loader");
  if (loader) {
    loader.style.background = theme === "dark" ? "#09090B" : "#F8FAFC";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle } as const;
}
