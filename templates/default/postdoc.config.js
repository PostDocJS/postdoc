import { sep } from "node:path";

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
    tags: {},
    source: null,
    layout: "apidocs.ejs",
    filters: ["**/*.js"],

    createUrl(filePath) {
      return filePath.split(sep).join("/").replace(/\.js$/, ".html");
    },
  },

  ignore: {
    pages: [],
    apidocs: [],
  },

  logger: {
    quiet: false,
    noColors: false,
  },

  appSettings: {},

  markdown: {
    options: { async: true },
    extensions: [],
    shikiOptions: {},
  },
};
