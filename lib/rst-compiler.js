import fm from 'front-matter';
import shelljs from 'shelljs';
import fs from 'node:fs';
import path from 'node:path';
import Configuration from './configuration.js';

const INTERPOLATION_RE = /{{([^}]+)}}/g;


class RSTToHTML {
  async parse(rstText){

    // Needs pandoc installed
    // https://github.com/jgm/pandoc/releases
    // pandoc index.rst -f rst -t html -o index.html 

    const rstFilePath = path.join(shelljs.tempdir(), "file.rst")
    fs.writeFileSync(rstFilePath, rstText, 'utf-8')
    const htmlFilePath = path.join(shelljs.tempdir(), "file.html")
    const command = `pandoc ${rstFilePath} -f rst -t html -o ${htmlFilePath}`
    shelljs.exec(command)
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8')
    fs.unlinkSync(htmlFilePath)

    return htmlContent

  }
}


export default class RSTCompiler {
  #compiler;

  async initialise() {
    if (this.#compiler) {
      return;
    }

    this.#compiler = new RSTToHTML();

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
