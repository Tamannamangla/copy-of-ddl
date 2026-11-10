import type { Config } from "tailwindcss";

/**
 * DecisionLens theme
 * ------------------
 * Every color is driven by CSS variables (see app/globals.css) so the whole
 * app switches between Light and Dark mode by toggling the `dark` class on
 * <html>. Legacy palette names (slate, indigo, emerald, amber, blue …) are
 * remapped onto ONE neutral scale and ONE accent scale, which keeps the UI
 * consistent and minimal without touching every component.
 */

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const scale = (prefix: string) => ({
  50: v(`${prefix}-50`),
  100: v(`${prefix}-100`),
  200: v(`${prefix}-200`),
  300: v(`${prefix}-300`),
  400: v(`${prefix}-400`),
  500: v(`${prefix}-500`),
  600: v(`${prefix}-600`),
  700: v(`${prefix}-700`),
  800: v(`${prefix}-800`),
  900: v(`${prefix}-900`),
  950: v(`${prefix}-950`),
});

const neutral = scale("n");
const accentScale = scale("a");
const danger = scale("d");

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Larger, more readable type scale (base = 17px)
    fontSize: {
      xs: ["0.875rem", { lineHeight: "1.3rem" }], // 14px
      sm: ["1rem", { lineHeight: "1.55rem" }], // 16px
      base: ["1.0625rem", { lineHeight: "1.7rem" }], // 17px
      lg: ["1.1875rem", { lineHeight: "1.8rem" }], // 19px
      xl: ["1.375rem", { lineHeight: "1.9rem" }], // 22px
      "2xl": ["1.625rem", { lineHeight: "2.1rem" }], // 26px
      "3xl": ["2rem", { lineHeight: "2.4rem" }], // 32px
      "4xl": ["2.5rem", { lineHeight: "2.9rem" }], // 40px
      "5xl": ["3rem", { lineHeight: "1.1" }],
      "6xl": ["3.75rem", { lineHeight: "1.05" }],
      "7xl": ["4.5rem", { lineHeight: "1" }],
      "8xl": ["6rem", { lineHeight: "1" }],
      "9xl": ["8rem", { lineHeight: "1" }],
    },
    extend: {
      colors: {
        white: v("white"),

        // Semantic tokens
        page: v("page"),
        surface: v("surface"),
        subtle: v("subtle"),
        line: v("line"),
        ink: {
          DEFAULT: v("ink"),
          hover: v("ink-hover"),
          2: v("ink-2"),
          3: v("ink-3"),
          secondary: v("ink-2"),
          tertiary: v("ink-3"),
        },
        "on-ink": v("on-ink"),
        accent: { DEFAULT: v("a-600"), hover: v("a-700"), ...accentScale },

        // Neutral family → one neutral scale
        slate: neutral,
        gray: neutral,
        zinc: neutral,
        stone: neutral,
        neutral: neutral,

        // Every hue → one accent scale (no stray green / blue / orange)
        indigo: accentScale,
        blue: accentScale,
        sky: accentScale,
        cyan: accentScale,
        teal: accentScale,
        emerald: accentScale,
        green: accentScale,
        lime: accentScale,
        violet: accentScale,
        purple: accentScale,
        fuchsia: accentScale,
        pink: accentScale,
        amber: accentScale,
        orange: accentScale,
        yellow: accentScale,

        // Errors / destructive stay red, but theme-aware
        red: danger,
        rose: danger,
        danger,

        // Legacy names kept so nothing breaks
        brand: neutral,
        border: { DEFAULT: v("line"), subtle: v("line") },
        paper: { page: v("page"), surface: v("surface"), sidebar: v("subtle") },
        dossier: {
          page: v("page"),
          surface: v("surface"),
          sidebar: v("subtle"),
          ink: v("ink"),
          "ink-hover": v("ink-hover"),
          "ink-secondary": v("ink-2"),
          "ink-tertiary": v("ink-3"),
          accent: v("a-600"),
          border: v("line"),
        },
        editorial: {
          ground: v("page"),
          "ground-secondary": v("subtle"),
          ink: v("ink"),
          "ink-secondary": v("ink-2"),
          muted: v("ink-3"),
          blue: v("a-600"),
          amber: v("a-600"),
          hairline: v("line"),
        },
        softly: {
          bg: v("page"),
          sage: v("subtle"),
          lavender: v("subtle"),
          coral: v("a-300"),
          dark: v("ink"),
          muted: v("ink-3"),
          blush: v("a-100"),
          softpurple: v("a-100"),
        },
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        ui: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        jakarta: ["Inter", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        outfit: ["Inter", "sans-serif"],
        newsreader: ["Newsreader", "Georgia", "serif"],
        courier: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        reenie: ['"Reenie Beanie"', "cursive"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px -4px rgb(0 0 0 / 0.08)",
        "soft-lg": "0 2px 4px rgb(0 0 0 / 0.04), 0 12px 32px -8px rgb(0 0 0 / 0.14)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "float-delayed": {
          "0%, 100%": { transform: "translateY(-6px)" },
          "50%": { transform: "translateY(10px)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float-delayed 7s ease-in-out infinite",
        breathe: "breathe 4s ease-in-out infinite",
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
