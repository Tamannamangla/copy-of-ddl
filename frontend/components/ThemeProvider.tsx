"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "decisionlens_theme";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  setTheme: (t: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Inline script that runs before paint to avoid a flash of the wrong theme. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const apply = useCallback((t: ThemePreference) => {
    const dark = t === "dark" || (t === "system" && systemPrefersDark());
    document.documentElement.classList.toggle("dark", dark);
    setResolvedTheme(dark ? "dark" : "light");
  }, []);

  useEffect(() => {
    let saved: ThemePreference = "system";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") saved = raw;
    } catch {
      // ignore
    }
    setThemeState(saved);
    apply(saved);
  }, [apply]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, apply]);

  const setTheme = useCallback(
    (t: ThemePreference) => {
      setThemeState(t);
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch {
        // ignore
      }
      apply(t);
    },
    [apply]
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "system",
      resolvedTheme: "light",
      setTheme: () => undefined,
      toggleTheme: () => undefined,
    };
  }
  return ctx;
}

/** Compact icon button that flips between light and dark. */
export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-[8px] text-ink-2 hover:text-ink hover:bg-subtle border border-transparent hover:border-line transition-colors ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

/** Segmented Light / Dark / System control for settings pages. */
export function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme();
  const options: { id: ThemePreference; label: string; Icon: typeof Sun }[] = [
    { id: "light", label: "Light", Icon: Sun },
    { id: "dark", label: "Dark", Icon: Moon },
    { id: "system", label: "System", Icon: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-2 p-1 rounded-[10px] bg-subtle border border-line">
      {options.map(({ id, label, Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(id)}
            className={`flex items-center justify-center gap-2 h-11 rounded-[8px] text-sm font-medium transition-all ${
              active
                ? "bg-surface text-ink shadow-soft border border-line"
                : "text-ink-2 hover:text-ink border border-transparent"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
