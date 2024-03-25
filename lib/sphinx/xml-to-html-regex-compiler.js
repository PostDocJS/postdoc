import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import katex from 'katex';


const nestedTagsMapper = {
    "strong>i": (str) => `<strong><i>${str}</i></strong>`,
    "strong>code": (str) => `<strong><code>${str}</code></strong>`,
    "pre>code": (str) => `<pre><code class="language-shell">${str}</code></pre>`,
}

/**
 * There are some tags that are dependent on parent tags
 * ex: title - depends on nested level of sections
 * 
 * this makes things a bit complicated 
 * because in the xml traverse we need to keep track of some values
 * and just using a regex mapper xmltag to html tag may not fully work
 * 
 * Parsing directly the html files from sphinx is not an option because 
 * there is one xml output, but the html ouput may differ on the sphinx template. 
 * 
 * */
export default class XMLToHTMLRegexCompiler {

    static parseDefault({ htmlTagName, xmlStr }) {

        if (!xmlStr) return xmlStr

        const tagFunc = nestedTagsMapper[htmlTagName]
        if (tagFunc) return tagFunc(xmlStr)

        return `<${htmlTagName}>${xmlStr}</${htmlTagName}>`
    }

    static parseMermaid({ htmlTagName, xmlStr }) {
        return `<${htmlTagName} class="mermaid">${xmlStr}</${htmlTagName}>`
    }

    static parseLiteralBlock({ xmlStr, attributes }) {
        return `<pre><code class="language-${attributes.language}">${xmlStr}</code></pre>`
    }

    static parseImage({ attributes, sourceDirPath }) {
        return XMLToHTMLRegexCompiler.convertImgPathToBase64Img(attributes.alt, attributes.uri, sourceDirPath)
    }

    static replaceTagEmphasisWithItalic(xmlStr) {
        return xmlStr.replaceAll(/<emphasis[^>]*>([\s\S]*?)<\/emphasis>/g, '<i>$1</i>');
    }

    static replaceTagLiteralWithCode(xmlStr) {
        return xmlStr.replaceAll(/<literal[^>]*>([\s\S]*?)<\/literal>/g, '<code>$1</code>');
    }

    static replaceTagListItemWithLi(xmlStr) {
        return xmlStr.replaceAll(/<list_item[^>]*>([\s\S]*?)<\/list_item>/g, '<li>$1</li>')
    }

    static replaceTagParagraphItemWithP(xmlStr) {
        return xmlStr.replaceAll(/<paragraph[^>]*>([\s\S]*?)<\/paragraph>/g, '<p>$1</p>')
    }

    static replaceTagBulletListWithUl(xmlStr) {
        return xmlStr.replaceAll(/<bullet_list[^>]*>([\s\S]*?)<\/bullet_list>/g, '<ul>$1</ul>')
    }

    static replaceTagTitleReferenceWithItalic(xmlStr) {
        return xmlStr.replaceAll(/<title_reference[^>]*>([\s\S]*?)<\/title_reference>/g, '<i>$1</i>');
    }

    static replaceTagReferenceWithAnchor(xmlStr) {
        const regex = /<reference(?:[^>]*\s+ref(uri|id)="([\s\S]*?)")?[^>]*>([\s\S]*?)<\/reference>/g;
        xmlStr = xmlStr.replaceAll(regex, (match, reftype, refval, innerHtml) => {
            let url;
            if (reftype === 'uri') url = refval.startsWith('http') ? refval : '/' + refval;
            if (reftype === 'id') url = '#' + refval;
            return `<a href="${url}">${innerHtml}</a>`;
        });
        return xmlStr;
    }

    static replaceTagInlineWithSpan(xmlStr) {
        xmlStr = xmlStr.replaceAll(/<inline[^>]*>([\s\S]*?)<\/inline>/g, '<span>$1</span>');
        return xmlStr
    }

    static replaceTagMathWithCode(xmlStr) {
        const regex = /<math[^>]*>([\s\S]*?)<\/math>/g
        xmlStr = xmlStr.replaceAll(regex, (match, rawFormula) => {
            return XMLToHTMLRegexCompiler.parseMath({ xmlStr: rawFormula })
        });
        return xmlStr
    }

    static replaceTagMathBlockWithPreCode(xmlStr) {
        const regex = /<math_block[^>]*>([\s\S]*?)<\/math_block>/g
        xmlStr = xmlStr.replaceAll(regex, (match, rawFormula) => {
            return XMLToHTMLRegexCompiler.parseMathBlock({ xmlStr: rawFormula })
        });
        return xmlStr
    }

    static convertImgPathToBase64Img(alt, src, sourceDirPath = null) {

        alt = alt || "";

        if (src.startsWith('http')) return `<img alt="${alt}" src="${src}">`;

        const localSrc = '/' + src;
        if (!sourceDirPath) return `<img alt="${alt}" src="${localSrc}">`;

        const imagePath = path.join(sourceDirPath, localSrc.replaceAll("/", path.sep));
        if (!existsSync(imagePath)) return `<img alt="${alt}" src="${localSrc}">`;

        const base64Raw = Buffer.from(readFileSync(imagePath), 'binary').toString('base64');
        const base64Img = "data:image/png;base64," + base64Raw;
        return `<img alt="${alt}" src="${base64Img}">`

    }

    static replaceTagImageWithImageHtml(xmlStr, sourceDirPath = null) {
        const regex = /<image alt="([\s\S]*?)"(?:(?=.*?uri="([\s\S]*?)").*?)?>/g;
        xmlStr = xmlStr.replaceAll(regex, (match, alt, src) => {
            return XMLToHTMLRegexCompiler.convertImgPathToBase64Img(alt, src, sourceDirPath)
        });
        return xmlStr
    }

    static replaceTagTargetWithNull(xmlStr) {
        const regex = /<target[^>]*\/?>/g;
        xmlStr = xmlStr.replaceAll(regex, '');
        return xmlStr
    }

    static replaceTagRawWithNull(xmlStr) {
        const regex = /<raw[^>]*\/?>[\s\S]*?<\/raw>/g;
        xmlStr = xmlStr.replaceAll(regex, '');
        return xmlStr
    }

    static replaceXMLTagsWithHTMLTags(xmlStr, sourceDirPath = null) {
        xmlStr = XMLToHTMLRegexCompiler.replaceTagBulletListWithUl(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagListItemWithLi(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagParagraphItemWithP(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagTargetWithNull(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagRawWithNull(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagTitleReferenceWithItalic(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagEmphasisWithItalic(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagLiteralWithCode(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagReferenceWithAnchor(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagInlineWithSpan(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagMathWithCode(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagMathBlockWithPreCode(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagImageWithImageHtml(xmlStr, sourceDirPath);
        return xmlStr
    }

    static parseParagraph({ xmlStr, attributes, sourceDirPath }) {
        xmlStr = XMLToHTMLRegexCompiler.replaceXMLTagsWithHTMLTags(xmlStr, sourceDirPath);
        if (attributes.className) {
            return `<p class="${attributes.className}">${xmlStr}</p>`
        }
        return `<p>${xmlStr}</p>`
    }

    static parseBulletList({ xmlStr, sourceDirPath }) {
        xmlStr = XMLToHTMLRegexCompiler.replaceXMLTagsWithHTMLTags(xmlStr, sourceDirPath)
        return `<ul>${xmlStr}</ul>`
    }

    static getKatexFormula(textFormula) {
        return katex.renderToString(textFormula, {
            throwOnError: false,
            output: 'html'
        });
    }

    static parseMath({ xmlStr }) {
        const katexFormula = XMLToHTMLRegexCompiler.getKatexFormula(xmlStr)
        return `<code>${katexFormula}</code>`
    }

    static parseMathBlock({ xmlStr }) {
        const katexFormula = XMLToHTMLRegexCompiler.getKatexFormula(xmlStr)
        return `<pre><code>${katexFormula}</code></pre>`
    }

    static parseFigure(result) {

        let figureHTML = "<figure>"
        for (const c of result.children) {

            if (c.xmlTagName == "image") {
                figureHTML += c.htmlStr
            }

            if (c.xmlTagName == "caption") {
                figureHTML += "<div>" + XMLToHTMLRegexCompiler.replaceXMLTagsWithHTMLTags(c.xmlStr) + "</div>"
            }
        }

        figureHTML += "</figure>"

        return figureHTML
    }

    static parseTable({ children }) {

        let htmlTable = "<table>"

        const tgroupChildren = children[0].children;
        for (const c of tgroupChildren) {

            if (c.xmlTagName == "thead") {
                htmlTable += "<thead>"
                for (const headerRow of c.children) {
                    htmlTable += "<tr>"
                    for (const headerCell of headerRow.children) {
                        htmlTable += "<th>" + headerCell.children[0].htmlStr + "</th>"
                    }
                    htmlTable += "</tr>"
                }
                htmlTable += "</thead>"
            }

            if (c.xmlTagName == "tbody") {
                htmlTable += "<tbody>"
                for (const headerRow of c.children) {
                    htmlTable += "<tr>"
                    for (const headerCell of headerRow.children) {
                        htmlTable += "<td>" + headerCell.children[0].htmlStr + "</td>"
                    }
                    htmlTable += "</tr>"
                }
                htmlTable += "</tbody>"
            }
        }

        htmlTable += "</table>"

        return htmlTable

    }

    static parseDescParameters({ children }) {

        const sigPunctuationRegex = /<desc_sig_punctuation classes="p p">(.*?)<\/desc_sig_punctuation>/g
        const sigSpaceRegex = /<desc_sig_space classes="w w">\s{1,}<\/desc_sig_space>/g
        const sigLiteralRegex = /<desc_sig_literal_string classes="s s">'(.*?)<\/desc_sig_literal_string>/g

        let paramsHTML = "<span class='font-mono'>("
        for (const c of children) {
            if (c.xmlTagName == "desc_parameter") {
                for (const cparam of c.children) {

                    const space = cparam.xmlTagName == "desc_sig_punctuation" ? " " : ""
                    paramsHTML += cparam.xmlStr + space

                    if (cparam.xmlTagName == "desc_sig_name" && cparam.children.length > 0) {
                        cparam.xmlStr = cparam.xmlStr.replaceAll(sigPunctuationRegex, '$1');
                    }

                }
                paramsHTML += ", "
            }
        }

        paramsHTML = paramsHTML.replaceAll(sigLiteralRegex, '"$1"')
        paramsHTML = paramsHTML.replaceAll(sigSpaceRegex, " ")
        paramsHTML = paramsHTML.replaceAll(`'"`, '"')
        paramsHTML = paramsHTML.slice(0, paramsHTML.length - 2) + ") -> </span>"

        return paramsHTML
    }

    static parseDescReturns({ xmlStr }) {
        xmlStr = XMLToHTMLRegexCompiler.replaceTagReferenceWithAnchor(xmlStr);
        return `<div>${xmlStr}</div>`
    }

    static parseContainer({ ipynbCell }) {
        if (!ipynbCell || ipynbCell.outputs?.length == 0) return ""

        let outputHTML = ""
        for (const out of ipynbCell.outputs) {

            if (out.text?.length > 0) {
                const codeText = "\n".concat(...out.text);
                outputHTML += `<pre><code>${codeText.trim()}</code></pre>`;
            }

            if (out.data?.["text/html"]) {
                let textHTML = "\n".concat(...out.data["text/html"]);
                outputHTML += `<div>${textHTML.trim()}</div>`;
            }

            if (out.data?.["image/png"]) {
                const base64Img = "data:image/png;base64," + out.data["image/png"];
                const imgHTML = `<img src="${base64Img}" alt="${", ".concat(...out.data["text/plain"])}">`;
                outputHTML += imgHTML
            }
        }

        if (!outputHTML) {
            // In case there are more types of cell outputs to handle them later
            throw new Error(`Unhandled cell output!\nCell: ${JSON.stringify(ipynbCell).slice(0, 500)}`);
        }

        return outputHTML
    }
}
