

const nestedTagsMapper = {
    "strong>i": (str) => `<strong><i>${str}</i></strong>`,
    "strong>code": (str) => `<strong><code>${str}</code></strong>`,
    "pre>code": (str) => `<pre><code class="language-shell">${str}</code></pre>`,
}


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

    static parseImage({ attributes }) {
        let alt = attributes.alt ? attributes.alt : "";
        let src = attributes.uri.startsWith("http") ? attributes.uri : "/" + attributes.uri;
        return `<img alt="${alt}" src="${src}">`;
    }

    static replaceTagLiteralWithCode(xmlStr) {
        return xmlStr.replaceAll(/<literal[^>]*>(.*?)<\/literal>/g, '<code>$1</code>');
    }

    static replaceTagTitleReferenceWithItalic(xmlStr) {
        return xmlStr.replaceAll(/<title_reference[^>]*>(.*?)<\/title_reference>/g, '<i>$1</i>');
    }

    static replaceTagReferenceWithAnchor(xmlStr) {
        const regex = /<reference(?:[^>]*\s+ref(uri|id)="(.*?)")?[^>]*>(.*?)<\/reference>/g;
        xmlStr = xmlStr.replaceAll(regex, (match, reftype, refval, innerHtml) => {
            let url;
            if (reftype === 'uri') url = refval.startsWith('http') ? refval : '/' + refval;
            if (reftype === 'id') url = '#' + refval;
            return `<a href="${url}">${innerHtml}</a>`;
        });
        return xmlStr;
    }

    static replaceTagInlineWithSpan(xmlStr) {
        xmlStr = xmlStr.replaceAll(/<inline[^>]*>(.*?)<\/inline>/g, '<span>$1</span>');
        return xmlStr
    }

    static replaceTagImageWithImageHtml(xmlStr) {
        const regex = /<image alt="(.*?)"(?:(?=.*?uri="(.*?)").*?)?>/g;
        xmlStr = xmlStr.replaceAll(regex, (match, alt, src) => {
            const urlWithSlash = src.startsWith('http') ? src : '/' + src;
            return `<img alt="${alt}" src="${urlWithSlash}">`;
        });
        return xmlStr
    }

    static replaceTagTargetWithNull(xmlStr) {
        const regex = /<target[^>]*\/?>/g;
        xmlStr = xmlStr.replaceAll(regex, '');
        return xmlStr
    }

    static parseParagraph({ xmlStr }) {
        xmlStr = XMLToHTMLRegexCompiler.replaceTagTargetWithNull(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagTitleReferenceWithItalic(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagLiteralWithCode(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagReferenceWithAnchor(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagInlineWithSpan(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagImageWithImageHtml(xmlStr);
        return `<p>${xmlStr}</p>`
    }

    static parseSigParameters({ xmlStr }) {

        xmlStr = XMLToHTMLRegexCompiler.replaceTagInlineWithSpan(xmlStr);

        const regex = /<desc_\w+[^>]*>|(<\/desc_\w+>)/g;

        const replaceFunction = (match) => {

            if (match.startsWith("<desc_parameter")) return "<div>"
            if (match.startsWith("</desc_parameter")) return "</div>"

            if (match.startsWith("<desc_sig_space")) return ""
            if (match.startsWith("</desc_sig_space")) return ""

            if (match.startsWith("<desc")) return "<span>"
            if (match.startsWith("</desc")) return "</span>"

        };

        xmlStr = xmlStr.replaceAll(regex, replaceFunction)
        xmlStr = xmlStr.replaceAll("\n", "")
        xmlStr = xmlStr.replaceAll(/\s{2,}/g, " ")

        return `<strong><i>${xmlStr}</i></strong>`

    }

    static parseSigReturns({ xmlStr }) {
        xmlStr = XMLToHTMLRegexCompiler.replaceTagReferenceWithAnchor(xmlStr);
        return `<div>${xmlStr}</div>`
    }

    static parseContainer({ ipynbCell }) {
        if (!ipynbCell || ipynbCell.outputs?.length == 0) return ""

        let outputHTML = ""
        for (const out of ipynbCell.outputs) {

            if (out.text?.length > 0) {
                outputHTML += `<pre><code>${"\n".concat(...out.text)}</code></pre>`;
            }

            if (out.data?.["text/html"]) {
                let textHTML = "\n".concat(...out.data["text/html"]);
                textHTML = textHTML.replaceAll(/<style>[\s\S]*?<\/style>/g, '');
                textHTML = textHTML.replaceAll(/class=.*?>/g, '');
                textHTML = textHTML.replaceAll(/style=.*?>/g, '');
                textHTML = textHTML.replaceAll(/<svg[\s\S]*?<\/svg>/g, '<span class=""></span>');
                textHTML = textHTML.replaceAll(/\n{2,}/g, '\n');
                textHTML = textHTML.replaceAll(/\s{2,}/g, ' ');
                outputHTML += `<div>${textHTML}</div>`;
            }

            if (out.data?.["image/png"]) {
                const base64Img = "data:image/png;base64," + out.data["image/png"];
                const imgHTML = `<img src="${base64Img}" alt="${", ".concat(...out.data["text/plain"])}">`
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
