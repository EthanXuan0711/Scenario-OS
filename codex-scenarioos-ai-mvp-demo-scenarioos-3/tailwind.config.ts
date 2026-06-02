import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mystic: ["Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", "Georgia", "ui-serif", "serif"]
      },
      colors: {
        void: "#060913",
        ink: "#0c1221",
        panel: "#101827",
        line: "rgba(160, 174, 211, 0.18)",
        gold: "#e7c766"
      },
      boxShadow: {
        glow: "0 0 80px rgba(105, 124, 255, 0.22)",
        gold: "0 0 52px rgba(231, 199, 102, 0.18)"
      }
    }
  },
  plugins: []
} satisfies Config;
