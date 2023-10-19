<%
const titleUrl = '#usage';
const titleLabel = 'Usage';

const links = [
  { linkUrl: '#usage-stage-1', linkLabel: 'Usage Stage 1' },
  { linkUrl: '#usage-stage-2', linkLabel: 'Usage Stage 2' },
  { linkUrl: '#usage-stage-3', linkLabel: 'Usage Stage 3' },
];
%>

# Usage

## Usage Stage 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Usage Stage 2

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Usage Stage 3

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

<%- include('../_right_sidebar', { titleUrl, titleLabel, links }) %>
