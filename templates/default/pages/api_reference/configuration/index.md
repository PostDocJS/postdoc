<%
const titleUrl = '#configuration-options';
const titleLabel = 'Configuration Options';

const links = [
  { linkUrl: '#configuration-option-1', linkLabel: 'Configuration Option 1' },
  { linkUrl: '#configuration-option-2', linkLabel: 'Configuration Option 2' },
  { linkUrl: '#configuration-option-3', linkLabel: 'Configuration Option 3' },
  { linkUrl: '#example', linkLabel: 'Example' },
];

const lang = 'js';
const exampleCode =
  'import plugin from "some-plugin";\n' +
  '\n' +
  'export default {\n' +
  '    entry: "./src/index.js",\n' +
  '    output: "./out/index.js",\n' +
  '    plugins: [plugin]\n' +
  '};\n'
;

const option1Code =
  'driver: {\n' +
  '    headless: false,\n' +
  '    launch_url: "https://example.domain",\n' +
  '}\n';
%>

<div id="content">

# Configuration Options

## Configuration Option 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

<%- include("highlight", { code: option1Code, lang }) %>

## Configuration Option 2

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Configuration Option 3

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Example

<%- include("highlight", { code: exampleCode, lang }) %>

</div>

<%- include('../_right_sidebar', { titleUrl, titleLabel, links }) %>
