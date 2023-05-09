module.exports = {
  theme: {
    extend: {
      colors: {
        //purples
        "primary-color": "var(--primary-color)",
        "primary-color-light": "var(--primary-color-light)",

        //grays
        "secondary-color": "var(--secondary-color)"
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")]
};
