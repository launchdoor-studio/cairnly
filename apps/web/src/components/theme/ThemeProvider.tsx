"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const themeStorageKey = "cairnly-theme";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const preferredTheme = getPreferredTheme();
    setTheme(preferredTheme);
    document.documentElement.classList.toggle("dark", preferredTheme === "dark");
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      theme,
      toggleTheme: () => {
        setTheme((currentTheme) => {
          const nextTheme = currentTheme === "dark" ? "light" : "dark";
          window.localStorage.setItem(themeStorageKey, nextTheme);
          document.documentElement.classList.toggle("dark", nextTheme === "dark");
          return nextTheme;
        });
      },
    };
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        value.toggleTheme();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [value]);

  return (
    <ThemeContext.Provider value={value}>
      <div data-theme={theme}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return value;
}
