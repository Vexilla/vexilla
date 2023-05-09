module.exports = {
  publicPath: process.env.NODE_ENV === "production" ? "/app/" : "/",
  pages: {
    index: {
      entry: "./src/main.ts",
      template: "./public/index.html",
      filename: "index.html",
      title: "Vexilla Config UI",
      chunks: ["chunk-vendors", "chunk-common", "index"]
    }
  }
};
