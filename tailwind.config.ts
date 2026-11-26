import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAF8F5",
        foreground: "#0F0E11",
        primary: {
          DEFAULT: "#0F0E11",
          foreground: "#FAF8F5",
          50: "#F7F6F8",
          100: "#ECE9EE",
          200: "#D8D4DC",
          800: "#1E1C22",
          900: "#0F0E11",
        },
        accent: {
          DEFAULT: "#7C3AED",
          foreground: "#FFFFFF",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        violet: {
          DEFAULT: "#7C3AED",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
        },
        muted: {
          DEFAULT: "#F0ECE4",
          foreground: "#666158",
        },
        border: "#E6E1D8",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
