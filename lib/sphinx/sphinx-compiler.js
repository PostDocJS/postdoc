import { JSDOM } from 'jsdom';
import fs from 'fs';

// WIP Trying to create a parsable json from xml file 
// node lib/sphinx/sphinx-compiler.js

const ignoredAttrs = new Set(["classes"])
const tagsDropValue = new Set(["section", "document", "image", "reference"])


const XMLtoHTMLTags = {
    paragraph: "p",
    section: "section",
    document: "div",
    compound: "span", // Part of aside toc navigation
}

export default class SphinxCompiler {

    async getXMLDom(xmlFilePath) {
        const dom = await JSDOM.fromFile(xmlFilePath, { contentType: "text/xml" });
        const document = dom.window.document;
        return document;
    }
    
    replaceTagLiteralWithItalic(textHTML){
        const replacedHTML = textHTML.replaceAll(/<literal>(.*?)<\/literal>/g, '<i>$1</i>');
        return replacedHTML;
    }

    replaceTagReferenceWithAnchor(textHTML){
        // <reference internal=\"True\" refuri=\"processing-levels\"><span>data processing levels</span></reference>
        const regex = /<reference ref(?:uri|id)="(.*?)">(.*?)<\/reference>/g;
        textHTML = textHTML.replaceAll(regex, '<a href="$1">$2</a>');
        return textHTML
    }

    replaceTagInlineWithSpan(textHTML) {
        textHTML = textHTML.replaceAll(/<inline[^>]*>(.*?)<\/inline>/g, '<span>$1</span>');
        return textHTML
    }

    replaceTagImageWithImageHtml(textHTML){
        const regex = /<image alt="(.*?)".*?uri="(.*?)".*?>/g;
        textHTML = textHTML.replaceAll(regex, '<img alt="$1" src="$2">');
        return textHTML
    }

    // TODO extract to another class ParagraphParser
    parseParagraph(textHTML){
        textHTML = this.replaceTagLiteralWithItalic(textHTML);
        textHTML = this.replaceTagReferenceWithAnchor(textHTML);
        textHTML = this.replaceTagInlineWithSpan(textHTML);
        textHTML = this.replaceTagImageWithImageHtml(textHTML);
        return textHTML
    }

    getHTMLTagName(xmlTagName, attributes){
        if (xmlTagName == "title") {
            return `h${attributes.header_level || 1}`
        }
        return XMLtoHTMLTags[xmlTagName] || "div"
    }

    getElemValue(element){
        let elemValue = null
        if (!tagsDropValue.has(element.tagName)) {
            if (element.tagName == "paragraph"){
                elemValue = element.innerHTML.trim();
            } else {
                elemValue = element.textContent.trim();
            }  
        } 
        return elemValue
    }

    getElemAttrs(element){
        const attrs = {}
        for (const attr of element.attributes) {
            if (!ignoredAttrs.has(attr.name)) {
                attrs[attr.name] = attr.value;
            }
        }
        return attrs
    }

    xmlToJson(element, prevTagName, prevAttrs) {

        const elemValue = this.getElemValue(element);
        const elemAttrs = this.getElemAttrs(element);

        const result = {
            xmlTagName: element.tagName,
            htmlTagName: null,
            value: elemValue,
            attributes: elemAttrs,
        };

        // Pass down section attrs to title (header_level)
        if (prevTagName == "section" && prevAttrs && result.xmlTagName == "title")  {
            result.attributes = prevAttrs
        }
        
        prevTagName = result.xmlTagName == "section" ? result.xmlTagName : null;
        prevAttrs = result.xmlTagName == "section" ? result.attributes : null;
        
        const tagsChildren = Array.from(element.children).map(child => this.xmlToJson(child, prevTagName, prevAttrs));

        result.htmlTagName = this.getHTMLTagName(result.xmlTagName, result.attributes);

        // We parse the <p> string
        if (result.xmlTagName == "paragraph") {
            result.value = this.parseParagraph(result.value);
            result.children = [];
            return result    
        }

        result.children = tagsChildren;

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


let text = `
<section docname="index" header_level="5" ids="license" names="license">
            <title>License</title>
            <paragraph>Echopype is licensed under the open source
                <reference refuri="https://opensource.org/licenses/Apache-2.0">Apache 2.0 license</reference>.</paragraph>
        </section>
`

sphinxCompiler.replaceTagReferenceWithAnchor()



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
