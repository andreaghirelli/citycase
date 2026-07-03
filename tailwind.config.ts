import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        archive: {
          950: "#0b0d10",
          900: "#11151b",
          850: "#151b23",
          800: "#1c2430",
          700: "#2b3544",
          500: "#667085"
        },
        brass: "#c8a24a",
        ink: "#d9ded8",
        rust: "#a95535",
        ledger: "#88a096"
      },
      boxShadow: {
        panel: "0 20px 60px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
