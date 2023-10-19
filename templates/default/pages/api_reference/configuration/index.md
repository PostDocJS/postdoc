<%
const titleUrl = '#configuration-options';
const titleLabel = 'Configuration Options';

const links = [
  { linkUrl: '#configuration-option-1', linkLabel: 'Configuration Option 1' },
  { linkUrl: '#configuration-option-2', linkLabel: 'Configuration Option 2' },
  { linkUrl: '#configuration-option-3', linkLabel: 'Configuration Option 3' },
];
%>

# Configuration Options

## Configuration Option 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Configuration Option 2

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Configuration Option 3

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

<%- include('../_right_sidebar', { titleUrl, titleLabel, links }) %>
