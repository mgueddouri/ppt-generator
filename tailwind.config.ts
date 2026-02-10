import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f7fa",
          100: "#e9eef5",
          200: "#d5dfea",
          300: "#b4c6d6",
          400: "#89a2bb",
          500: "#5f7f9f",
          600: "#4a6682",
          700: "#3e536a",
          800: "#344658",
          900: "#2d3b4b"
        },
        ember: {
          400: "#f97316",
          500: "#ea580c",
          600: "#c2410c"
        }
      },
      fontFamily: {
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui"],
        body: ["'Work Sans'", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glow: "0 0 40px rgba(249, 115, 22, 0.18)",
        panel: "0 20px 60px rgba(15, 23, 42, 0.18)"
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at 10% 20%, rgba(249, 115, 22, 0.18), transparent 40%), radial-gradient(circle at 90% 10%, rgba(94, 234, 212, 0.18), transparent 40%), radial-gradient(circle at 50% 80%, rgba(59, 130, 246, 0.15), transparent 45%)"
      }
    }
  },
  plugins: []
};

export default config;
