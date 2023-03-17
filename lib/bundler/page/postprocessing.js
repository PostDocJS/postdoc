const CLOSING_HEAD_TAG = "</head>";

const HTML_TAG_RE = /<html(.*)>/;

const extractHtmlAttributes = (attributesStringPart) => {
  const attributeRe =
    /([-\w]+)=["']?((?:.(?!["']?\s+(?:\S+)=|\s*\/?[>"']))+.)["']?/g;

  const attributes = [];

  let occurence;
  while ((occurence = attributeRe.exec(attributesStringPart))) {
    attributes.push(occurence[0]);
  }

  return attributes;
};

/**
 * Injects the meta information into the document.
 * It can be:
 *
 * - `meta` tags.
 * - `html` attributes.
 * - `body` attributes.
 *
 * @param {import('./front-matter.js').Meta|null} meta
 */
export const injectMeta =
  (meta) =>
  /** @param {string} content */
  (content) =>
    meta
      ? content
          .replace(CLOSING_HEAD_TAG, meta.tags + "\n" + CLOSING_HEAD_TAG)
          .replace(HTML_TAG_RE, (_, attributesStringPart) => {
            const attributes = extractHtmlAttributes(attributesStringPart);

            if (meta.html.lang) {
              const userProvidedLangAttribute = `lang="${meta.html.lang}"`;

              const langAttributeIndex = attributes.find((pair) =>
                pair.includes("lang=")
              );

              if (langAttributeIndex >= 0) {
                attributes.splice(
                  langAttributeIndex,
                  1,
                  userProvidedLangAttribute
                );
              } else {
                attributes.push(userProvidedLangAttribute);
              }
            }

            return `<html${
              attributes.length ? ` ${attributes.join(" ")}` : ""
            }>`;
          })
      : content;
