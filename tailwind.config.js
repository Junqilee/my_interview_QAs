/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        driving: "#3b82f6",
        agent: "#a855f7",
        ops: "#10b981",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
