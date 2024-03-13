


export default class XMLToHTMLRegexCompiler {

    static parseTitle({htmlTagName, xmlStr}){
        return `<${htmlTagName}>${xmlStr}</${htmlTagName}>`
    }

    static parseMermaid({htmlTagName, xmlStr}){
        return `<${htmlTagName} class="mermaid">${xmlStr}</${htmlTagName}>`
    }

    static parseLiteralBlock({xmlStr, attributes}){
        return `<pre><code class="language-${attributes.language}">${xmlStr}</code></pre>`
    }

    static parseImage({attributes}){
        let alt = attributes.alt ? attributes.alt: ""; 
        let src = attributes.uri.startsWith("http") ? attributes.uri: "/" + attributes.uri; 
        return `<img alt="${alt}" src="${src}">`;
    }

    static replaceTagLiteralWithCode(xmlStr){
        return xmlStr.replaceAll(/<literal>(.*?)<\/literal>/g, '<code>$1</code>');
    }

    static replaceTagTitleReferenceWithItalic(xmlStr){
        return xmlStr.replaceAll(/<title_reference>(.*?)<\/title_reference>/g, '<i>$1</i>');
    }

    static replaceTagReferenceWithAnchor(xmlStr){
        const regex = /<reference(?:[^>]*\s+ref(?:uri|id)="(.*?)")?[^>]*>(.*?)<\/reference>/g;
        xmlStr = xmlStr.replaceAll(regex, (match, url, innerHtml) => {
            const urlWithSlash = url.startsWith('http') ? url: '/' + url;
            return `<a href="${urlWithSlash}">${innerHtml}</a>`;
        });
        return xmlStr
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

    static replaceTagTargetWithNull(xmlStr){
        const regex = /<target[^>]*\/?>/g;
        xmlStr = xmlStr.replaceAll(regex, '');
        return xmlStr
    }

    static parseParagraph({xmlStr}){
        xmlStr = XMLToHTMLRegexCompiler.replaceTagTargetWithNull(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagTitleReferenceWithItalic(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagLiteralWithCode(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagReferenceWithAnchor(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagInlineWithSpan(xmlStr);
        xmlStr = XMLToHTMLRegexCompiler.replaceTagImageWithImageHtml(xmlStr);
        return `<p>${xmlStr}</p>` 
    }
}