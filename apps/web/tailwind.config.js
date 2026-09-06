/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#ffffff",
        surface: {
          DEFAULT: "#f9f8f6",
          subtle: "#f2ede5",
          hover: "#ebe5db",
          active: "#e2dcce",
        },
        ink: {
          DEFAULT: "#0a0a0a",
          secondary: "#737373",
          muted: "#858585",
        },
        border: {
          DEFAULT: "#d5d9e2",
          subtle: "#e5e7eb",
          strong: "#b0b7c3",
        },
        code: {
          bg: "#151515",
          text: "#f4f4f5",
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
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

