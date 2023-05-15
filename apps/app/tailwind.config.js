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
    },
  },
  plugins: [],
};
