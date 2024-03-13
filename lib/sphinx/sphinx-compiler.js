import { JSDOM } from 'jsdom';
import fs from 'fs';
import XMLToHTMLRegexCompiler from './xml-to-html-regex-compiler.js';

// WIP Trying to create a parsable json from xml file 
// node lib/sphinx/sphinx-compiler.js

const ignoredAttrs = new Set(["classes"])
const ignoredTags = new Set(["target"])
const tagsDropValue = new Set([
    "section", "document", "image", "reference",
    "bullet_list", "list_item", "attention", "note", "definition_list",
])


const XMLtoHTMLTags = {
    paragraph: "p",
    section: "section",
    document: "div",
    compound: "span", // Part of aside toc navigation
    bullet_list: "ul",
    list_item: "li",
    definition_list: "ul",
    definition_list_item: "li",
    literal: "code",
    term: "code",
    literal_block: "pre>code",
    attention: "blockquote",
    note: "blockquote",
    title_reference: "i",
    image: "img",
}

const compilerFuncMapper = {
    paragraph: XMLToHTMLRegexCompiler.parseParagraph,
    literal_block: XMLToHTMLRegexCompiler.parseLiteralBlock,
    title: XMLToHTMLRegexCompiler.parseTitle,
    mermaid: XMLToHTMLRegexCompiler.parseMermaid,
    image: XMLToHTMLRegexCompiler.parseImage,
}

export default class SphinxCompiler {

    async getXMLDom(xmlFilePath) {
        const dom = await JSDOM.fromFile(xmlFilePath, { contentType: "text/xml" });
        const document = dom.window.document;
        return document;
    }

    getHTMLTagName(xmlTagName, attributes) {
        if (xmlTagName == "title") {
            return `h${attributes.header_level || 1}`
        }
        return XMLtoHTMLTags[xmlTagName] || "div"
    }

    getElemValue(element) {
        let elemValue = null
        if (!tagsDropValue.has(element.tagName)) {
            if (element.tagName == "paragraph") {
                elemValue = element.innerHTML.trim();
            } else if (element.tagName == "mermaid") {
                elemValue = element.attributes.code.value;
            } else {
                elemValue = element.textContent.trim();
            }
        }
        return elemValue
    }

    getElemAttrs(element) {
        const attrs = {}
        for (const attr of element.attributes) {
            if (!ignoredAttrs.has(attr.name)) {
                attrs[attr.name] = attr.value;
            }
        }
        return attrs
    }

    xmlToJson(element, prevTagName, prevAttrs, sectionCount = 0) {

        const elemValue = this.getElemValue(element);
        const elemAttrs = this.getElemAttrs(element);

        const result = {
            xmlTagName: element.tagName,
            xmlStr: elemValue,
            htmlTagName: null,
            htmlStr: null,
            attributes: elemAttrs,
        };

        // Figure out header level based on nested sections
        if (result.xmlTagName == "section") {
            sectionCount += 1
        }
        if (prevTagName == "section" && prevAttrs && result.xmlTagName == "title") {
            if (prevAttrs.header_level) {
                result.attributes = prevAttrs
            } else {
                result.attributes = { ...prevAttrs, header_level: sectionCount }
            }
        }

        prevTagName = result.xmlTagName == "section" ? result.xmlTagName : null;
        prevAttrs = result.xmlTagName == "section" ? result.attributes : null;

        const tagsChildren = Array.from(element.children).map(child => this.xmlToJson(child, prevTagName, prevAttrs, sectionCount));

        result.htmlTagName = this.getHTMLTagName(result.xmlTagName, result.attributes);

        const compileFunc = compilerFuncMapper[result.xmlTagName]

        if (compileFunc) {
            result.htmlStr = compileFunc(result)
            return result
        }

        result.children = tagsChildren.filter(item => !ignoredTags.has(item.xmlTagName));

        return result;
    }

    saveJsonToFile(jsonData, filePath) {
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
        console.log(`JSON data saved to ${filePath}`);
    }
}

const sphinxCompiler = new SphinxCompiler();
const fp = "/home/climentea/Documents/postdoc-project/postdoc-fork/postdoc/documentation/sphinx-docs/echopype-xmldocs/build/xml/convert.xml";
const outputPath = "/home/climentea/Documents/postdoc-project/postdoc-fork/postdoc/documentation/sphinx-docs/echopype-xmldocs/build/xml/convert.json";

sphinxCompiler.getXMLDom(fp).then(dom => {
    const jsonRepr = sphinxCompiler.xmlToJson(dom.documentElement);
    sphinxCompiler.saveJsonToFile(jsonRepr, outputPath);
});







// let text1 = `
// <section docname="index" header_level="5" ids="license" names="license">
//             <title>License</title>
//             <paragraph>Echopype is licensed under the open source
//                 <reference refuri="https://opensource.org/licenses/Apache-2.0">Apache 2.0 license</reference>.</paragraph>
//         </section>
// `


// let text2 = `
// <paragraph>The section <reference internal="True" refuri="data-proc-func#data-proc-functions"><inline classes="std std-ref"><strong>Data processing functionalities</strong></inline></reference> provides information for current processing functions and their usage.</paragraph>
// `

// let result1 = sphinxCompiler.replaceTagReferenceWithAnchor(text1)
// let result2 = sphinxCompiler.replaceTagReferenceWithAnchor(text2)

// // console.log(result1)
// console.log(result2)


// External links

"<reference refuri=\"https://github.com/OSOceanAcoustics/echopype/graphs/contributors\"><image alt=\"Contributors\" candidates=\"{'?': 'https://contrib.rocks/image?repo=OSOceanAcoustics/echopype'}\" uri=\"https://contrib.rocks/image?repo=OSOceanAcoustics/echopype\"/></reference>"

"<a href=\"https://github.com/OSOceanAcoustics/echopype/graphs/contributors\"><image alt=\"Contributors\" candidates=\"{'?': 'https://contrib.rocks/image?repo=OSOceanAcoustics/echopype'}\" src=\"https://contrib.rocks/image?repo=OSOceanAcoustics/echopype\"/></a>"


"<reference refuri=\"https://github.com/leewujung\">@leewujung</reference>"

"<a href=\"https://github.com/leewujung\">@leewujung</a>"


// Internal links

'<reference internal="True" refuri="data-proc-func#data-proc-functions"><inline classes="std std-ref"><strong>Data processing functionalities</strong></inline></reference>'

'<a href="/data-proc-func#data-proc-functions"><strong>Data processing functionalities</strong></a>'


'<reference refid="data-process:functionalities"><inline classes="xref myst">processing functions</inline></reference>'

'<a href="/data-process:functionalities">processing functions</a>'

'<reference internal="True" reftitle="echopype.calibrate.compute_Sv" refuri="api/echopype.calibrate.compute_Sv#echopype.calibrate.compute_Sv"><inline classes="xref myst py py-func"><literal>compute_Sv</literal></inline></reference>'

'<a href="/api/echopype.calibrate.compute_Sv#echopype.calibrate.compute_Sv"><i>compute_Sv</i></a>'
