import fm from 'front-matter';
// import rst2html from 'rst2html';
import asciidoctor from 'asciidoctor' 
import Configuration from './configuration.js';

const INTERPOLATION_RE = /{{([^}]+)}}/g;

// rst2html gives a parsing error
// class RSTToHTML {
//   parse(rstText){
//     return rst2html(rstText)
//   }
// }

// Doesn't give errors, but it doesn't parse corectly
class RSTToHTML {
  parse(rstText){
    const Asciidoctor = asciidoctor()
    const html = Asciidoctor.convert(rstText) 
    return html
  }
}

// tried python's rst2html5 index.rst index.html
// tried python's docutils index.rst index.html



class RSTToHTML {
  parse(rstText){
    const Asciidoctor = asciidoctor()
    const html = Asciidoctor.convert(rstText) 
    return html
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
