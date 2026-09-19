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
        primary: {
          DEFAULT: "#16a34a",
          dark: "#15803d",
          light: "#22c55e",
        },
        danger: {
          DEFAULT: "#dc2626",
          dark: "#b91c1c",
        },
        neutral: {
          DEFAULT: "#6b7280",
        },
      },
    },
  },
  plugins: [],
};

export default config;
