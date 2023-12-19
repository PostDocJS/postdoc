import fm from 'front-matter';
import shiki from 'shiki';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

import Configuration from './configuration.js';

const LIGHT_THEME_RE = /light-theme\s*=\s*(\S+)/;
const DARK_THEME_RE = /dark-theme\s*=\s*(\S+)/;
const INTERPOLATION_RE = /{{([^}]+)}}/g;

export default class MarkdownCompiler {
  #compiler;

  async initialise() {
    if (this.#compiler) {
      return;
    }

    const configuration = Configuration.get();

    const shikiOptions = Object.assign({
      themes: shiki.BUNDLED_THEMES
    }, configuration.markdown.shikiOptions);

    const highlighter = await shiki.getHighlighter(shikiOptions);

    this.#compiler = new Marked(configuration.markdown.options);

    this.#compiler.use(markedHighlight({
      highlight(code, lang) {
        // For code blocks the first line may be a comment that
        // contains light and dark theme names. We are going to parse that
        // line and discard it, since its purpose is solely to tune
        // the shiki highlighter.
        const lines = code.split('\n');

        const firstContentfulLine = lines.find((line) => line.length)?.trim();
        const firstContentfulLineIndex = lines.findIndex((line) => line.length);

        let lightTheme = 'github-light';
        let darkTheme = 'github-dark';
        let shouldSkipShikiSettingsComment = false;

        if (firstContentfulLine?.startsWith('//')) {
          const lightThemeMatch = LIGHT_THEME_RE.exec(firstContentfulLine);
          const darkThemeMatch = DARK_THEME_RE.exec(firstContentfulLine);

          if (lightThemeMatch) {
            lightTheme = lightThemeMatch[1];
            shouldSkipShikiSettingsComment = true;
          }

          if (darkThemeMatch) {
            darkTheme = darkThemeMatch[1];
            shouldSkipShikiSettingsComment = true;
          }
        }

        if (shouldSkipShikiSettingsComment) {
          lines.splice(firstContentfulLineIndex, 1);
        }

        const finalCode = lines.join('\n');

        const lightCodeContent = highlighter.codeToHtml(finalCode, {
          lang, theme: lightTheme
        });
        const darkCodeContent = highlighter.codeToHtml(finalCode, {
          lang, theme: darkTheme
        });

        return `<div class="code-block">${lightCodeContent}${darkCodeContent}</div>`;
      }
    }));

    configuration.markdown.extensions.forEach((extension) => this.#compiler.use(extension));
  }

  async compile(content) {
    const { attributes, body } = fm(content);

    const html = await this.#compiler.parse(body);

    const configuration = Configuration.get();

    return [attributes, html.replace(INTERPOLATION_RE, (_, variableName) => {
      const trimmedVariableName = variableName.trim();

      if (trimmedVariableName.startsWith('appSettings')) {
        const properties = trimmedVariableName.split('.').slice(1);

        return properties.reduce((target, property) => target[property.trim()], configuration.appSettings);
      }

      return attributes[trimmedVariableName];
    })];
  }
}
