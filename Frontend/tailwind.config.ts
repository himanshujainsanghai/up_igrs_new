import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        body: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Override orange colors to use new color #ff671f
        orange: {
          50: "#fff5f0",
          100: "#ffe8d9",
          200: "#ffd1b3",
          300: "#ffb380",
          400: "#ff8c4d",
          500: "#ff671f",
          600: "#e65a1c",
          700: "#cc4d19",
          800: "#b34016",
          900: "#993313",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-up": {
          "0%": {
            transform: "translateY(100%)",
          },
          "100%": {
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
      backdropBlur: {
        glass: "16px",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities, theme }: any) {
      // Override orange colors with new color #ff671f
      const orangeColors = {
        ".text-orange-50": { color: "#fff5f0" },
        ".text-orange-100": { color: "#ffe8d9" },
        ".text-orange-200": { color: "#ffd1b3" },
        ".text-orange-300": { color: "#ffb380" },
        ".text-orange-400": { color: "#ff8c4d" },
        ".text-orange-500": { color: "#ff671f" },
        ".text-orange-600": { color: "#e65a1c" },
        ".text-orange-700": { color: "#cc4d19" },
        ".text-orange-800": { color: "#b34016" },
        ".text-orange-900": { color: "#993313" },
        ".bg-orange-50": { backgroundColor: "#fff5f0" },
        ".bg-orange-100": { backgroundColor: "#ffe8d9" },
        ".bg-orange-200": { backgroundColor: "#ffd1b3" },
        ".bg-orange-300": { backgroundColor: "#ffb380" },
        ".bg-orange-400": { backgroundColor: "#ff8c4d" },
        ".bg-orange-500": { backgroundColor: "#ff671f" },
        ".bg-orange-600": { backgroundColor: "#e65a1c" },
        ".bg-orange-700": { backgroundColor: "#cc4d19" },
        ".bg-orange-800": { backgroundColor: "#b34016" },
        ".bg-orange-900": { backgroundColor: "#993313" },
        ".border-orange-50": { borderColor: "#fff5f0" },
        ".border-orange-100": { borderColor: "#ffe8d9" },
        ".border-orange-200": { borderColor: "#ffd1b3" },
        ".border-orange-300": { borderColor: "#ffb380" },
        ".border-orange-400": { borderColor: "#ff8c4d" },
        ".border-orange-500": { borderColor: "#ff671f" },
        ".border-orange-600": { borderColor: "#e65a1c" },
        ".border-orange-700": { borderColor: "#cc4d19" },
        ".border-orange-800": { borderColor: "#b34016" },
        ".border-orange-900": { borderColor: "#993313" },
      };
      addUtilities(orangeColors);
    },
  ],
} satisfies Config;
