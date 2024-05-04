/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Racing Sans One"'],
        body: ['"Atkinson Hyperlegible"'],
        default: ['"Atkinson Hyperlegible"'],
      },
      colors: {
        primary: {
          DEFAULT: "var(--mantine-primary-color-filled)",
          dark: "#000000",
          light: "#000000",
        },
      },
    },
  },
  plugins: [],
};
