import {getAllPages} from '../../lib/bundler/page/entity.js';
import {createPageCompiler} from '../../lib/bundler/page/index.js';

export const basicHtml = `
<html>
	<head></head>
	<body>
</body>
</html>
`;

export const defaultConfiguration = {
  i18n: {
    languages: ['uk', 'de']
  },
  directories: {
    pages: 'pages',
    tests: 'test',
    output: 'out',
    contents: 'pages',
    layouts: 'pages',
    includes: 'includes'
  },
  logger: {
    noColors: false
  }
};

export const createCompilerFor = (basename, configuration = defaultConfiguration) => {
  const pages = getAllPages(configuration);

  const compile = createPageCompiler(pages);

  return {
    page: pages.find((page) => page.url.includes(basename)),
    pages,
    compile
  };
};

export const compilePage = async (
  basename,
  configuration = defaultConfiguration
) => {
  const {page, compile} = createCompilerFor(basename, configuration);

  return compile(page);
};
