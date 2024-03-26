import { JSDOM } from 'jsdom';
import fs from 'fs';
import path, { sep } from 'path';
import XMLToHTMLRegexCompiler from './xml-to-html-regex-compiler.js';
import { walkDirectory } from '../fs.js';
import AsyncIterable from '@halo-lab/iterable/async';
import { pipeWith } from 'pipe-ts';


const ignoredAttrs = new Set(["classes"])
const ignoredTags = new Set([
    "target", "colspec", "comment", "index", "tabular_col_spec",
    "HiddenCellNode", "autosummary_toc", "desc_sig_space", "compound",
    "script",
])
const tagsDropValue = new Set([
    "section", "document", "image", "reference",
    "list_item", "attention", "note", "definition_list",
    "table", "tgroup", "thead", "tbody", "row", "entry", "autosummary_table",
    "desc", "desc_content", "field_list", "field", "field_body",
    "definition_list_item", "citation", "raw", "desc_parameterlist",
    "desc_parameter", "desc_annotation"
])

const attentionNote = ["attention", "note"]


const XMLtoHTMLTags = Object.freeze({
    paragraph: "p",
    section: "section",
    table: "table",
    thead: "thead",
    tbody: "tbody",
    row: "tr",
    entry: "td",
    rubric: "strong.block",
    strong: "strong",
    field_name: "strong",
    desc_addname: "strong",
    label: "strong",
    term: "strong",
    desc_parameterlist: "strong>i",
    classifier: "strong>i",
    desc_name: "strong>code",
    literal_block: "pre>code",
    container: "pre>code",
    math: "code",
    math_block: "pre>code",
    doctest_block: "pre>code",
    desc_parameter: "span",
    desc_sig_operator: "span",
    desc_sig_punctuation: "span",
    desc_sig_name: "span",
    reference: "a",
    inline: "span",
    document: "main",
    enumerated_list: "ul",
    bullet_list: "ul",
    list_item: "li",
    definition_list: "ul",
    definition_list_item: "li",
    literal: "code",
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
    desc_parameterlist: XMLToHTMLRegexCompiler.parseDescParameters,
    desc_signature: XMLToHTMLRegexCompiler.parseDescSignature,
    desc_returns: XMLToHTMLRegexCompiler.parseDescReturns,
    container: XMLToHTMLRegexCompiler.parseContainer,
    bullet_list: XMLToHTMLRegexCompiler.parseBulletList,
    table: XMLToHTMLRegexCompiler.parseTable,
    math: XMLToHTMLRegexCompiler.parseMath,
    math_block: XMLToHTMLRegexCompiler.parseMathBlock,
    figure: XMLToHTMLRegexCompiler.parseFigure,
    field_list: XMLToHTMLRegexCompiler.parseFieldList,
}

export default class SphinxCompiler {


    async compile(sphinxDocsPath, docsPath) {

        const xmlFilePaths = await this.getXMLFilePaths(sphinxDocsPath);

        const indexBasePath = path.join(docsPath, "content")
        const guideBasePath = path.join(docsPath, "content", "guide")
        const apiBasePath = path.join(docsPath, "content", "api")

        if (!fs.existsSync(indexBasePath)) fs.mkdirSync(indexBasePath, { recursive: true });
        if (!fs.existsSync(guideBasePath)) fs.mkdirSync(guideBasePath, { recursive: true });
        if (!fs.existsSync(apiBasePath)) fs.mkdirSync(apiBasePath, { recursive: true });

        for (const fp of xmlFilePaths) {
            const fileInfo = await this.getFileInfo(fp)

            if (fp.endsWith("index.xml")) {
                this.saveParsedDataToHTML(
                    fileInfo.parsedData,
                    path.join(indexBasePath, "index.html")
                )
            } else if (fp.includes(`build${sep}xml${sep}api`) && !fp.endsWith("api.xml")) {
                this.saveParsedDataToHTML(
                    fileInfo.parsedData,
                    path.join(apiBasePath, fileInfo.fileNameNoExtension + ".html")
                )
            } else if (fp.includes(`build${sep}xml`)) {
                this.saveParsedDataToHTML(
                    fileInfo.parsedData,
                    path.join(guideBasePath, fileInfo.fileNameNoExtension + ".html")
                )
            }
        }

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
            fileType: null,
            sourceDirPath: null,
            fileNameNoExtension: null
        }

        const xmlDirPath = path.dirname(sphinxXMLPath)
        const xmlFileName = path.basename(sphinxXMLPath)
        const fileNameWithNoExt = xmlFileName.split(".xml")[0]
        const ipynbFileName = fileNameWithNoExt + ".ipynb"
        const ipynbDirPath = xmlDirPath.replace(`build${path.sep}xml`, `build${path.sep}jupyter_execute`)
        const ipynbFilePath = path.join(ipynbDirPath, ipynbFileName)

        fileInfo.fileNameNoExtension = fileNameWithNoExt
        fileInfo.sourceDirPath = xmlDirPath.replace(`build${path.sep}xml`, `source`)

        if (fs.existsSync(ipynbFilePath)) {
            fileInfo.fileType = "xml+ipynb"
            fileInfo.ipynbFilePath = ipynbFilePath
            const dom = await this.getXMLDom(fileInfo.filePath)
            const data = this.getJSONRaw(fileInfo.ipynbFilePath)
            fileInfo.parsedData = this.xmlToJson(fileInfo, dom.documentElement, data.cells)
        } else {
            fileInfo.fileType = "xml"
            const dom = await this.getXMLDom(fileInfo.filePath)
            fileInfo.parsedData = this.xmlToJson(fileInfo, dom.documentElement, [])
        }

        return fileInfo
    }

    async getXMLDom(xmlFilePath) {
        const dom = await JSDOM.fromFile(xmlFilePath, { contentType: "text/xml" });
        const document = dom.window.document;
        return document;
    }

    getJSONRaw(ipynbFilePath) {
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
            if (element.tagName == "mermaid") {
                elemValue = element.attributes.code.value;
            } else {
                elemValue = element.innerHTML.trim();
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

    xmlToJson(fileInfo, element, ipynbCells,
        prevSectionTagName, prevSectionAttrs,
        prevNoteAttentionTagName, prevNoteAttentionAttrs,
        sectionCount = 0, tableCellTag = "td", ipynbCellIndex = "0",
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
        if (prevSectionTagName == "section" && prevSectionAttrs && result.xmlTagName == "title") {
            if (prevSectionAttrs.header_level) {
                result.attributes = prevSectionAttrs
            } else {
                result.attributes = { ...prevSectionAttrs, header_level: sectionCount }
            }
        }

        if (attentionNote.includes(prevNoteAttentionTagName) && result.xmlTagName == "paragraph") {
            result.attributes = { ...prevNoteAttentionAttrs, className: prevNoteAttentionTagName }
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

        // Set previous needed elem tag and attrs
        prevSectionTagName = result.xmlTagName == "section" ? result.xmlTagName : null;
        prevSectionAttrs = result.xmlTagName == "section" ? result.attributes : null;
        prevNoteAttentionTagName = attentionNote.includes(result.xmlTagName) ? result.xmlTagName : null;
        prevNoteAttentionAttrs = attentionNote.includes(result.xmlTagName) ? result.attributes : null;

        const tagsChildren = Array.from(element.children).map(child => this.xmlToJson(
            fileInfo, child, ipynbCells,
            prevSectionTagName, prevSectionAttrs,
            prevNoteAttentionTagName, prevNoteAttentionAttrs,
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
            result.htmlStr = compileFunc({ ...result, sourceDirPath: fileInfo.sourceDirPath })
            return result
        }

        result.htmlStr = XMLToHTMLRegexCompiler.parseDefault(result)

        return result
    }

    buildHTMLString(parsedData) {
        if (parsedData.htmlStr) {
            return parsedData.htmlStr;
        }
        let htmlString = '';
        if (parsedData.children && parsedData.children.length > 0) {
            parsedData.children.forEach(child => {
                htmlString += this.buildHTMLString(child);
            });
        }
        return htmlString;
    }

    saveParsedDataToHTML(parsedData, savePath) {

        const title = path.basename(savePath).split(".html")[0]
        const htmlContent = this.buildHTMLString(parsedData)

        const htmlPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" 
    href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.green.min.css"/>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css">
    <style>

    img {
        width: 100vw;
    }

    .font-mono {
        font-family: monospace;
    }

    .block {
        display: block;
    }

    .inline-block {
        display: inline-block;
    }

    .w-100 {
        width: 100%;
    }

    .px1rem-py6px {
        padding-left: 1rem;
        padding-right: 1rem;
        padding-top: 6px;
        padding-bottom: 6px;
    }

    .mb-1 {
        margin-bottom: 1rem;
    }

    .mb-2 {
        margin-bottom: 2rem;
    }

    .bg-grey {
        background-color: whitesmoke;
    }

    .attention {
        border: solid 5px;
        border-color: lightcoral;
        border-radius: 8px;
        padding: 1.5rem 1rem 1.5rem 1rem;
        border-left: 20px solid lightcoral;
    }

    .attention::before {
        content: "Attention: "
    }

    .note {
        border: solid 5px;
        border-color: lightblue;
        border-radius: 8px;
        padding: 1.5rem 1rem 1.5rem 1rem;
        border-left: 20px solid lightblue;
    }

    .note::before {
        content: "Note: "
    }

    </style>
    <title>${title}</title>
</head>
<body>

    ${htmlContent}

    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/shell.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/javascript.min.js"></script>
    <script>hljs.highlightAll();</script>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({ startOnLoad: true });
    </script>
</body>
</html>
`

        fs.writeFileSync(savePath, htmlPage, "utf-8")

    }
}
