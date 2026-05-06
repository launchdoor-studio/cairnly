"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-input border border-border bg-bg text-muted transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover hover:text-text"
      aria-label="Toggle theme"
      title="Toggle theme (Cmd+\\)"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
