import { JSDOM } from 'jsdom';
import fs from 'fs';

// WIP Trying to create a parsable json from xml file 
// node lib/sphinx/sphinx-compiler.js

const onlyAttrs = new Set(["header_level", "refuri", "alt", "uri", "format"])
const excludeValues = new Set(["section", "document", "image", "reference"])


export default class SphinxCompiler {

    async getXMLDom(xmlFilePath) {
        const dom = await JSDOM.fromFile(xmlFilePath, { contentType: "text/xml" });
        const document = dom.window.document;
        return document;
    }

    xmlToJson(element, prevTagName, prevAttrs) {

        const elemValue = excludeValues.has(element.tagName) ? null : element.textContent.trim();

        const result = {
            name: element.tagName,
            value: elemValue,
            attributes: {}
        };

        for (const attr of element.attributes) {
            if (onlyAttrs.has(attr.name)) {
                result.attributes[attr.name] = attr.value;
            }
        }

        // Pass down section attrs to title (header_level)
        if (prevTagName == "section" && prevAttrs && result.name == "title")  {
            result.attributes = prevAttrs
        }

        if (result.name == "section") {
            prevTagName = result.name;
            prevAttrs = result.attributes;
        } else {
            prevTagName = null;
            prevAttrs = null;
        }

        result.children = Array.from(element.children).map(child => this.xmlToJson(child, prevTagName, prevAttrs));

        return result;
    }

    saveJsonToFile(jsonData, filePath) {
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
        console.log(`JSON data saved to ${filePath}`);
    }
}

const sphinxCompiler = new SphinxCompiler();
const fp = "/home/climentea/Documents/postdoc-project/postdoc-fork/postdoc/documentation/sphinx-docs/echopype-xmldocs/build/xml/index.xml";
const outputPath = "/home/climentea/Documents/postdoc-project/postdoc-fork/postdoc/documentation/sphinx-docs/echopype-xmldocs/build/xml/index.json";

sphinxCompiler.getXMLDom(fp).then(dom => {
    const jsonRepr = sphinxCompiler.xmlToJson(dom.documentElement);
    sphinxCompiler.saveJsonToFile(jsonRepr, outputPath);
});
