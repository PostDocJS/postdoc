import { sep } from 'node:path';

export default {
  template: 'sphinx-python',
  sphinx_docs_path: "${sphinx_docs_path}",

  pwa: {
    enabled: false
  },

  directories: {
    content: './content',
    tests: './test',
    output: './out',
    layouts: './src/layouts',
    includes: './src/includes'
  },

  apidocs: {
    tags: {},
    source: null,
    layout: 'apidocs.ejs',

    createUrl(filePath) {
      return filePath.split(sep).join('/').replace(/\.js$/, '.html');
    }
  },

  ignore: {
    pages: [],
    apidocs: [],
    layouts: []
  },

  logger: {
    quiet: false,
    noColors: false
  },

  nightwatch: {
    headless: true,
    browser: 'chrome',
    watch: false,
    parallel: false
  },

  appSettings: {},

  markdown: {
    extensions: [],
    shikiOptions: {}
  },

  vite: {
    publicDir: './src/public',
    logLevel: 'silent'
  }
};
