import { JSDOM } from 'jsdom';
import fs from 'fs';

export default class SphinxCompiler {
    async getXMLDom(xmlFilePath) {
        const dom = await JSDOM.fromFile(xmlFilePath, { contentType: "text/xml" });
        const document = dom.window.document;
        return document;
    }

    xmlToJson(element) {
        
        const result = {
            name: element.tagName,
            value: element.textContent.trim(),
            attributes: {}
        };

        for (const attr of element.attributes) {
            result.attributes[attr.name] = attr.value;
        }

        result.children = Array.from(element.children).map(child => this.xmlToJson(child));

        return result;
    }

    saveJsonToFile(jsonData, filePath) {
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
        console.log(`JSON data saved to ${filePath}`);
    }
}

const sphinxCompiler = new SphinxCompiler();
const fp = "/home/climentea/Documents/postdoc-project/postdoc-fork/postdoc/documentation/convert.xml";
const outputPath = "/home/climentea/Documents/postdoc-project/postdoc-fork/postdoc/documentation/convert.json";

sphinxCompiler.getXMLDom(fp).then(dom => {
    const jsonRepr = sphinxCompiler.xmlToJson(dom.documentElement);
    sphinxCompiler.saveJsonToFile(jsonRepr, outputPath);
});
