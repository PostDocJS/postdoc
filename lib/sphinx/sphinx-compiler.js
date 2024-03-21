import { JSDOM } from 'jsdom';
import fs from 'fs';
import path, { sep } from 'path';
import XMLToHTMLRegexCompiler from './xml-to-html-regex-compiler.js';
import { walkDirectory } from '../fs.js';
import AsyncIterable from '@halo-lab/iterable/async';
import { pipeWith } from 'pipe-ts';


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
    "definition_list_item", "definition", "citation"
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


    async compileSphinxDocs(sphinxDocsPath) {

        const xmlFilePaths = await this.getXMLFilePaths(sphinxDocsPath);

        const xmlFilesInfo = {
            index: null,
            api: [],
            guide: []
        }
        for (const fp of xmlFilePaths) {
            const fileInfo = await this.getFileInfo(fp)

            if (fp.endsWith("index.xml")) {
                xmlFilesInfo.index = fileInfo
            } else if (fp.includes(`build${sep}xml${sep}api`)) {
                xmlFilesInfo.api.push(fileInfo)
            } else if (fp.includes(`build${sep}xml`)) {
                xmlFilesInfo.guide.push(fileInfo)
            }
        }

        return xmlFilesInfo
    }

    async getXMLFilePaths(sphinxDocsPath) {

        const directoryDescriptor = walkDirectory(sphinxDocsPath);

        const xmlFilePaths = await pipeWith(
            directoryDescriptor.files,
            AsyncIterable.filter((file) => {
                if (file.includes(`build${path.sep}xml`) && file.endsWith('.xml')) {
                    if (file.includes('site-packages') && file.includes('python') && file.includes('lib')) {
                        return false
                    } else {
                        return true
                    }
                }
                return false
            }),
            AsyncIterable.fold([], (pages, file) => {
                pages.push(file);
                return pages;
            }));

        return xmlFilePaths

    }

    async getFileInfo(sphinxXMLPath) {

        let fileInfo = {
            parsedData: null,
            filePath: sphinxXMLPath,
            ipynbFilePath: null,
            outputFilePath: null,
            fileType: null,
        }

        const xmlDirPath = path.dirname(sphinxXMLPath)
        const xmlFileName = path.basename(sphinxXMLPath)
        const jsonFilename = xmlFileName.split(".xml")[0] + ".json"
        const ipynbFileName = xmlFileName.split(".xml")[0] + ".ipynb"
        const ipynbDirPath = xmlDirPath.replace(`build${path.sep}xml`, `build${path.sep}jupyter_execute`)
        const ipynbFilePath = path.join(ipynbDirPath, ipynbFileName)

        fileInfo.outputFilePath = path.join(xmlDirPath, jsonFilename)

        if (fs.existsSync(ipynbFilePath)) {
            fileInfo.fileType = "xml+ipynb"
            fileInfo.ipynbFilePath = ipynbFilePath
            const dom = await this.getXMLDom(fileInfo.filePath)
            const data = await this.getJSONRaw(fileInfo.ipynbFilePath)
            fileInfo.parsedData = this.xmlToJson(dom.documentElement, data.cells)
        } else {
            fileInfo.fileType = "xml"
            const dom = await this.getXMLDom(fileInfo.filePath)
            fileInfo.parsedData = this.xmlToJson(dom.documentElement, [])
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


// const sphinxCompiler = new SphinxCompiler();
// const sphinxDocsPath = "/home/climentea/Documents/postdoc-project/postdoc-fork/postdoc/sphinx-docs/echopype/docs";
// const savePath = "/home/climentea/Documents/postdoc-project/postdoc-fork/postdoc/sphinx-docs/a-raw-json-postdoc-sphinx-output/postdoc-sphinx.json"

// sphinxCompiler.compileSphinxDocs(sphinxDocsPath).then(data => {
//     fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
//     console.log(`JSON data saved to ${savePath}`);
// })
