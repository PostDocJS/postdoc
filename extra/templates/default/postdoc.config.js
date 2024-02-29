import {sep} from 'node:path';
import customHeadingId from 'marked-custom-heading-id';

export default {
  pwa: {
    enabled: true
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
    options: {async: true},
    extensions: [customHeadingId()],
    shikiOptions: {}
  },

  vite: {
    publicDir: './src/public',
    logLevel: 'silent'
  }
};
