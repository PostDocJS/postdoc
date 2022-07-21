/**
 * @file Contains compiler for a single page.
 *   It handles only layouts and contents files.
 *   Other assets are handled by the third-party Vite
 *   bundler.
 *
 * @module bundler_page
 */

const path = require('path');
const process = require('process');
const {inspect} = require('util');

const ejs = require('ejs');
const yaml = require('yaml');
const {marked} = require('marked');

const {File} = require('../files.js');
const {Typography} = require('../logger/colors.js');
const {Configuration} = require('../configuration/index.js');
const {withURLSeparator} = require('../utils/url.js');
const {error, MessageBuilder, LineBuilder} = require('../logger/index.js');

const includesDirectory = path.join(
  process.cwd(),
  Configuration.directories.includes
);

const CLOSING_BODY_TAG = '</body>';
const CLOSING_HEAD_TAG = '</head>';

const HTML_TAG_RE = /<html(.(?!lang=))*>/;
const FRONT_MATTER_AND_CONTENT_RE = /^\s*(?:---(.*?)---)?(.*)$/s;

/**
 * Extracts the front matter block and the actual content from the MD file if it exists.
 *
 * @param {string} content
 * @returns {[string|null,string]}
 */
const splitFrontMatterAndContent = (content) => {
  const extractedParts = FRONT_MATTER_AND_CONTENT_RE.exec(content);

  if (extractedParts && extractedParts[1]) {
    const [, frontMatter, content] = extractedParts;

    return [frontMatter.trim(), content.trim()];
  }

  return [null, content];
};

/**
 * Describes options that are accepted by the {@link compileMarkdown} function.
 *
 * @typedef {Object} CompileMarkdownOptions
 * @property {boolean} [withFrontMatter=false] Determines whether the front matter data should
 *   be compiled.
 */

/**
 * Compiles the Markdown file.
 * It will compile files with or without the front matter data.
 * Provide {@link CompileMarkdownOptions} in order to handle the front matter.
 *
 * @param {ReturnType<typeof File>} file
 * @param {CompileMarkdownOptions} [options={}]
 * @returns {Promise<[FrontMatter|null, string]>}
 */
const compileMarkdown = (file, {withFrontMatter= false} = {}) =>
  file
    .map(splitFrontMatterAndContent)
    .map(
      ([frontMatter, content]) => [
        withFrontMatter && frontMatter ? yaml.parse(frontMatter) : null,
        marked.parse(content)
      ]
    )
    .content()
    .run()
    .then((result) =>
      result.extract((err) => {
        MessageBuilder()
          .line(
            LineBuilder()
              .text('The compilation of the')
              .phrase(Typography.bold(file.source()))
              .phrase('ends with a failure:')
              .build()
          )
          .line(inspect(err))
          .pipe(error);

        return [null, ''];
      })
    );

/**
 * Injects the script to the Navigation manager into a page.
 * It's necessary to even empty pages will register the manager
 * after loading and establish the client-side navigation.
 *
 * @param {string} content
 */
const injectManagerScript = (content) => content
  .replace(
    CLOSING_BODY_TAG,
    '<script type="module" src="~/node_modules/postdoc/lib/assets/files/client/manager.js"></script>\n'
    + CLOSING_BODY_TAG
  );

/**
 * Injects the main page's script if there is any.
 *
 * @param {import('./pages.js').Page} page
 */
const injectMainScript = (page) =>
  /** @param {string} content */
  (content) => page.script.exists()
    ? content.replace(
      /* eslint-disable */
      CLOSING_BODY_TAG,
      `<script type="module" src="${
        withURLSeparator(page.script.source().replace(process.cwd(), '~'))
      }"></script>\n${CLOSING_BODY_TAG}`
    )
    /* eslint-enable */
    : content;

/**
 * Injects the main page's stylesheet file if there is any.
 *
 * @param {import('./pages.js').Page} page
 */
const injectMainStyle = (page) =>
  /** @param {string} content */
  (content) => page.style.exists()
    ? content.replace(
      /* eslint-disable */
      CLOSING_HEAD_TAG,
      `<link rel="stylesheet" href="${
        withURLSeparator(page.style.source().replace(process.cwd(), '~'))
      }"/>\n${CLOSING_HEAD_TAG}`
    )
    /* eslint-enable */
    : content;

/**
 * Describes the shape of the front matter data that the user can write
 * at the top of the MD file.
 *
 * @typedef {Object} FrontMatter
 * @property {string} [title] - contains a title of the current page. It participates in creation
 *   of the <title> and "og:title" meta tags.
 * @property {string} [description] - contains a description of the current page. It participates in creation
 *   of the "description" and "og:description" meta tags.
 * @property {string[]} [keywords] - contains a list of keywords of the current page. Creates the "keywords"
 *   meta tag.
 * @property {string} [image] - contains the URL of the cover page image. Creates the "og:image" meta tag.
 * @property {string} [author] - contains the name of the page's author. Creates the "author" meta tag.
 * @property {string} [language] - contains the RFC 5646 language code. Creates the "og:locale" meta tag
 *   and defines the *lang* attribute of the `html` tag. If the attribute is explicitly defined, then it
 *   is not touched.
 */

/**
 * Injects the meta information into the document.
 * It can be:
 *
 * - `meta` tags.
 * - `html` attributes.
 * - `body` attributes.
 *
 * @param {ReturnType<typeof renderMeta>|null} meta
 */
const injectMeta = (meta) =>
  /** @param {string} content */
  (content) => meta
    ? content
      .replace(
        CLOSING_HEAD_TAG,
        meta.tags + '\n' + CLOSING_HEAD_TAG
      )
      .replace(HTML_TAG_RE, `<html ${
        meta.html.lang
          ? `lang="${meta.html.lang}"`
          : ''
      } $1>`)
    : content;

/**
 * Builds the *Meta* object from the FrontMatter information.
 * The information of that object will be injected into the
 * document.
 *
 * @param {FrontMatter} frontMatter
 */
const renderMeta = (frontMatter) => ({
  html: {
    lang: frontMatter.language || null
  },
  tags: Object.entries(frontMatter)
    .reduce((content, [name, value]) => {
      switch (name) {
        case 'title':
          return content + `<title>${value}</title>\n<meta property="og:title" content="${value}">\n`;
        case 'description':
          return content + `<meta name="description" content="${value}">\n<meta property="og:description" content="${value}">\n`;
        case 'image':
          return content + `<meta property="og:image" content="${value}">\n`;
        case 'keywords':
          return content + `<meta name="keywords" content="${Array.isArray(value) ? value.join(', ') : value}"/>\n`;
        case 'author':
          return content + `<meta name="author" content="${value}">\n`;
        case 'language':
          return content + `<meta property="og:locale" content="${value}">\n`;
        default:
          return content;
      }
    }, '')
});

/** EJS render options. */
const renderOptions = {root: [includesDirectory], views: [includesDirectory]};

/**
 * Compiles one EJS page with all contents and includes.
 *
 * @param {import('./pages.js').Page} page
 * @param {ReturnType<typeof import('./pages.js').PublicApiOf>} api
 */
const compile = (page, api) =>
  page.layout.map(async (layoutContent) => {
    const data = {
      ...api(page),
      page: {url: page.url}
    };

    /**
     * Page's content.
     *
     * @type {string}
     */
    let content = '';
    /**
     * The *Meta* object that contains the <head> information of the
     * current page.
     *
     * @type {Object|null}
     */
    let meta = null;

    if (page.content.exists()) {
      const [frontMatter, pageContent] = await compileMarkdown(
        page.content,
        {withFrontMatter: true}
      );

      if (frontMatter) {
        meta = renderMeta(frontMatter);
      }

      content = ejs.render(pageContent, data, renderOptions);
    }

    const sections = await Promise.all(page.sections.map(async ({name, file}) => {
      const [_, sectionContent] = await compileMarkdown(file);

      return {
        [name]: ejs.render(sectionContent, data, renderOptions)
      };
    }));

    const html = ejs.render(
      layoutContent,
      {
        ...data,
        page: {
          ...data.page,
          content,
          sections: Object.assign({}, ...sections)
        }
      },
      renderOptions
    );

    return injectMainStyle(page)(injectMainScript(page)(injectMeta(meta)(injectManagerScript(html))));
  });

/**
 * Builds a page and writes it to the temporal build directory.
 * It should be the processed by the Vite and outputted to the
 * *output* directory. The file at the _destination_ path will
 * be overwritten if there is one.
 *
 * @param {ReturnType<typeof import('./pages.js').PublicApiOf>} api
 */
exports.build =
  (api) =>
    /** @param {import('./pages.js').Page} page */
    (page) =>
      compile(page, api).setDestination(page.temporaryOutput.source()).write();
