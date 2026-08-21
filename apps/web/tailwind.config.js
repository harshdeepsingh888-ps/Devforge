/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#050706",
        surface: "#080a09",
        "surface-hover": "#0b0f0d",
        "surface-active": "#0e1310",
        border: "#161a18",
        "border-subtle": "#1c201e",
        "text-primary": "#f4f4f5",
        "text-secondary": "#9ca3af",
        "text-muted": "#6b7280",
        brand: {
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        forest: {
          900: "#064e3b",
          950: "#022c22",
        },
        status: {
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
          info: "#06b6d4",
          purple: "#8b5cf6",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        "emerald-glow": "0 0 15px -3px rgba(16, 185, 129, 0.15)",
        "emerald-subtle": "0 0 8px 0 rgba(16, 185, 129, 0.08)",
      },
    },
  },
  plugins: [],
};
