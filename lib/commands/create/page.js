/**
 * This command generates the MD page and a test suite for it.
 * For the page, the [page object](https://nightwatchjs.org/guide/using-page-objects/getting-started.html)
 * with a basic test file that uses it will be generated.
 *
 * @example
 * npx postdoc create page --name /feature-page
 *
 * @name page
 * @since 0.1.0
 */

import {inspect} from 'node:util';
import {resolve, sep} from 'node:path';

import inquirer from 'inquirer';

import Logger from '../../logger.js';
import Configuration from '../../configuration.js';
import GeneratedPage from '../../generated-page.js';
import GeneratedTest from '../../generated-test.js';
import PostDocCommand from '../../command.js';
import runAndMeasureAction from '../measured-action.js';
import chalk from 'chalk';

export default function createPageCommand() {
  return new PostDocCommand('page')
    .description('Creates a new page and a minimal test suite for it.')
    .option('-n, --name <url>', 'URL of a new page.')
    .action(({name}) => runAndMeasureAction(async () => {
      const configuration = Configuration.get();

      if (!name) {
        name = (await inquirer.prompt({
          type: 'input',
          name: 'name',
          message: 'Name or url of the new page:',
          default: '/example/page.html'
        })).name;

        if (!name) {
          Logger.log((typography) => `
                The ${typography.bold('-n or --name')} option is required.
                  Please try again.
              `, Logger.ErrorLevel);

          return;
        }
      }

      const prefixedName = name.startsWith('/') ? name : '/' + name;
      const contentFilePartialPath = prefixedName.endsWith('.md') ? prefixedName : prefixedName.endsWith('.html') ? prefixedName.replace('.html', '.md') : prefixedName + '.md';

      const pageOutputPath = resolve(configuration.directories.content, contentFilePartialPath.slice(1).replaceAll('/', sep));

      let page;
      let pageUrl;

      try {
        page = new GeneratedPage(GeneratedPage.DEFAULT_CONTENT, pageOutputPath);
        pageUrl = page.url;
      } catch {
        Logger.log((typography) => `
              The page ${typography.bold(name)} already exists.
                Skipping...
            `, Logger.ErrorLevel);

        return;
      }

      let test;
      let testOutputPath;

      try {
        test = new GeneratedTest(page, GeneratedTest.DEFAULT_PAGE_OBJECT_CONTENT);
        testOutputPath = test.outputPath;
      } catch (err) {
        Logger.log((typography) => `An error occurred while creating the test for the ${typography.bold(name)} page. Skipping...\n\n` + err.stack, Logger.ErrorLevel);

        return;
      }

      try {
        await page.write();
        await test.write();
      } catch (error) {
        Logger.log((typography) => `
              The ${typography.dim(contentFilePartialPath)} page generation has failed due to:
                ${inspect(error, {colors: true, depth: Infinity})}  
                Clearing artifacts...
            `, Logger.ErrorLevel);

        await page.clearIfPresent();
        await test.clearIfPresent();
      }

      Logger.log((typography) => `
            ${typography.bold('Page was created successfully.')}
            ${chalk.gray('────────────────────────────────────────────')}
            ${typography.bold('File location:')}
              - Path: ${typography.italic(pageOutputPath)}

            ${typography.bold('Test file:')}
              - Path: ${typography.italic(testOutputPath)}
            ${chalk.gray('────────────────────────────────────────────')}
            
          `, Logger.SuccessLevel);

      Logger.log(() => `
            To view it in the browser, use the following command:
            ${chalk.cyan(`npx postdoc run --open ${pageUrl}`)}
              
          `, Logger.SuccessLevel);
    }));
}
