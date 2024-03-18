import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import XMLToHTMLRegexCompiler from './xml-to-html-regex-compiler.js';


// WIP Trying to create a parsable json from xml file 
// node lib/sphinx/sphinx-compiler.js

const tagsWithHTML = new Set(["paragraph", "desc_parameterlist", "desc_returns"])
const ignoredAttrs = new Set(["classes"])
const ignoredTags = new Set([
    "target", "colspec", "comment", "index", "tabular_col_spec",
    "HiddenCellNode", "autosummary_toc", "desc_sig_space",
])
const tagsDropValue = new Set([
    "section", "document", "image", "reference",
    "bullet_list", "list_item", "attention", "note", "definition_list",
    "table", "tgroup", "thead", "tbody", "row", "entry", "autosummary_table",
    "desc", "desc_signature", "desc_content", "field_list", "field", "field_body",
    "definition_list_item", "definition"
])


const XMLtoHTMLTags = Object.freeze({
    paragraph: "p",
    section: "section",
    table: "table",
    thead: "thead",
    tbody: "tbody",
    row: "tr",
    entry: "td",
    rubric: "strong",
    strong: "strong",
    field_name: "strong",
    desc_addname: "strong",
    desc_parameterlist: "strong>i",
    classifier: "strong>i",
    desc_name: "strong>code",
    literal_block: "pre>code",
    container: "pre>code",
    desc_parameter: "span",
    desc_sig_operator: "span",
    desc_sig_punctuation: "span",
    desc_sig_name: "span",
    reference: "a",
    inline: "span",
    document: "main",
    compound: "span", // Part of aside toc navigation
    enumerated_list: "ul",
    bullet_list: "ul",
    list_item: "li",
    definition_list: "ul",
    definition_list_item: "li",
    literal: "code",
    term: "code",
    attention: "blockquote",
    note: "blockquote",
    title_reference: "i",
    emphasis: "i",
    image: "img",
    figure: "figure",
    caption: "caption",
})

const compilerFuncMapper = {
    paragraph: XMLToHTMLRegexCompiler.parseParagraph,
    literal_block: XMLToHTMLRegexCompiler.parseLiteralBlock,
    mermaid: XMLToHTMLRegexCompiler.parseMermaid,
    image: XMLToHTMLRegexCompiler.parseImage,
    desc_parameterlist: XMLToHTMLRegexCompiler.parseSigParameters,
    desc_returns: XMLToHTMLRegexCompiler.parseSigReturns,
    container: XMLToHTMLRegexCompiler.parseContainer,
}

export default class SphinxCompiler {

    async compile(sourceFilePath) {

        const fileInfo = this.getFileInfo(sourceFilePath)

        if (fileInfo.error) return fileInfo

        if (fileInfo.fileType == "xml") {
            const dom = await this.getXMLDom(fileInfo.filePath)
            fileInfo.parsedData = this.xmlToJson(dom.documentElement, [])
            return fileInfo
        }

        if (fileInfo.fileType == "xml+ipynb") {
            const dom = await this.getXMLDom(fileInfo.filePath)
            const data = await this.getJSONRaw(fileInfo.ipynbFilePath)
            fileInfo.parsedData = this.xmlToJson(dom.documentElement, data.cells)
        }

        return fileInfo

    }


    getFileInfo(sourceFilePath) {

        let fileInfo = {
            parsedData: null,
            filePath: sourceFilePath,
            ipynbFilePath: null,
            outputFilePath: null,
            fileType: null,
            error: null
        }

        if (!sourceFilePath.endsWith(".xml")) {
            fileInfo.error = "Only .xml files are parsable."
            return fileInfo
        }

        const xmlDirPath = path.dirname(sourceFilePath)
        const xmlFileName = path.basename(sourceFilePath)
        const jsonFilename = xmlFileName.split(".xml")[0] + ".json"
        const ipynbFileName = xmlFileName.split(".xml")[0] + ".ipynb"
        const ipynbDirPath = xmlDirPath.replace(`build${path.sep}xml`, `build${path.sep}jupyter_execute`)
        const ipynbFilePath = path.join(ipynbDirPath, ipynbFileName)

        fileInfo.outputFilePath = path.join(xmlDirPath, jsonFilename)

        if (fs.existsSync(ipynbFilePath)) {
            fileInfo.ipynbFilePath = ipynbFilePath
            fileInfo.fileType = "xml+ipynb"
        } else {
            fileInfo.fileType = "xml"
        }

        return fileInfo
    }

    async getXMLDom(xmlFilePath) {
        const dom = await JSDOM.fromFile(xmlFilePath, { contentType: "text/xml" });
        const document = dom.window.document;
        return document;
    }

    async getJSONRaw(ipynbFilePath) {
        const data = JSON.parse(fs.readFileSync(ipynbFilePath, "utf-8"))
        return data
    }

    getHTMLTagName(xmlTagName, attributes) {
        if (xmlTagName == "title") {
            return `h${attributes.header_level || 1}`
        }
        if (xmlTagName == "entry" && attributes.cellType) {
            return attributes.cellType
        }
        return XMLtoHTMLTags[xmlTagName] || "div"
    }

    getElemValue(element) {
        let elemValue = null
        if (!tagsDropValue.has(element.tagName)) {
            // Values are saved in children tags
            if (tagsWithHTML.has(element.tagName)) {
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
                if (attr.value == "ipython3") {
                    attrs[attr.name] = "python";
                } else {
                    attrs[attr.name] = attr.value;
                }
            }
        }
        return attrs
    }

    xmlToJson(element, ipynbCells, prevTagName, prevAttrs,
        sectionCount = 0, tableCellTag = "td", ipynbCellIndex = "0"
    ) {

        const elemValue = this.getElemValue(element);
        const elemAttrs = this.getElemAttrs(element);

        const result = {
            xmlTagName: element.tagName,
            xmlStr: elemValue,
            htmlTagName: null,
            htmlStr: null,
            ipynbCell: null,
            markdown: null,
            attributes: elemAttrs,
            children: []
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

        // Figure out if it's a <th> or <td> in a table
        if (result.xmlTagName == "thead") tableCellTag = "th";
        if (result.xmlTagName == "tbody") tableCellTag = "td";
        if (result.xmlTagName == "entry") result.attributes = { ...result.attributes, cellType: tableCellTag };

        // Figure out ipynb cell index
        if (result.xmlTagName == "container" && result.attributes.cell_index) {
            ipynbCellIndex = result.attributes.cell_index
        }
        if (result.xmlTagName == "container") {
            result.ipynbCell = ipynbCells[ipynbCellIndex]
        }

        prevTagName = result.xmlTagName == "section" ? result.xmlTagName : null;
        prevAttrs = result.xmlTagName == "section" ? result.attributes : null;

        const tagsChildren = Array.from(element.children).map(child => this.xmlToJson(
            child, ipynbCells, prevTagName, prevAttrs,
            sectionCount, tableCellTag, ipynbCellIndex
        ));

        result.htmlTagName = this.getHTMLTagName(result.xmlTagName, result.attributes);

        result.children = tagsChildren.filter(item => {
            if (ignoredTags.has(item.xmlTagName)) return false
            if (item.xmlTagName == "container" && item.attributes.nb_element == "cell_code_output") return false
            return true
        });

        const compileFunc = compilerFuncMapper[result.xmlTagName]

        if (compileFunc) {
            result.htmlStr = compileFunc(result)
            return result
        }

        result.htmlStr = XMLToHTMLRegexCompiler.parseDefault(result)

        return result
    }
}


const sphinxCompiler = new SphinxCompiler();
const fp = "/home/climentea/Documents/postdoc-project/postdoc-fork/postdoc/documentation/sphinx-docs/echopype-xmldocs/build/xml/viz.xml";

sphinxCompiler.compile(fp).then(data => {
    fs.writeFileSync(data.outputFilePath, JSON.stringify(data, null, 2));
    console.log(`JSON data saved to ${data.outputFilePath}`);
})
