const assetsToCache = [
  "js",
  "css",
  "html",
  "json",
  "png",
  "jpeg",
  "jpg",
  "ico",
  "webp",
  "avif",
  "svg",
  "woff2",
];

export default {
  pwa: {
    strategies: "generateSW",
    registerType: "autoUpdate",
    workbox: {
      globPatterns: [`**/*.{${assetsToCache.join(",")}}`],
    },
  },

  directories: {
    pages: "./docs",
    tests: "./test",
    output: "./out",
    layouts: "./src/layouts",
    includes: "./src/includes",
  },

  apidocs: {
    outputDirectory: "apidocs",
    template: "./src/includes/default_apidocs_template.ejs",
    tags: {},
  },

  ignore: {
    pages: [],
  },

  logger: {
    quiet: false,
    noColors: false,
  },

  apiExtractor: "dox",

  appSettings: {},

  markdown: {
    options: { async: true },
    shikiOptions: {},
    extensions: [],
  }
};
