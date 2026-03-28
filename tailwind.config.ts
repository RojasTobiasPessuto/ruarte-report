import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        navy: {
          50: "#f0f4fd",
          100: "#e0e8fa",
          200: "#b9cdf4",
          300: "#8eaeed",
          400: "#5a85e3",
          500: "#3563d4",
          600: "#2549b5",
          700: "#1e3a93",
          800: "#1a3179",
          900: "#0f1f52",
          950: "#091335",
        },
        surface: {
          DEFAULT: "#0f172a",
          raised: "#1e293b",
          overlay: "#334155",
        },
        muted: {
          DEFAULT: "#94a3b8",
          foreground: "#cbd5e1",
        },
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.4375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
