module.exports = {
  root: true,
  // This tells ESLint to load the config from the package `eslint-config-custom`
  extends: ["custom"],
  rules: { curly: ["error", "all"] },
  settings: {
    next: {
      rootDir: ["apps/*/"],
    },
  },
};
