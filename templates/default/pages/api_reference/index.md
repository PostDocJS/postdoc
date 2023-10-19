<%
const titleUrl = '#implementation-details';
const titleLabel = 'Implementation Details';

const links = [
  { linkUrl: '#implementation-stage-1', linkLabel: 'Implementation Stage 1' },
  { linkUrl: '#implementation-stage-2', linkLabel: 'Implementation Stage 2' },
  { linkUrl: '#implementation-stage-3', linkLabel: 'Implementation Stage 3' },
];
%>

# Implementation Details

## Implementation Stage 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Implementation Stage 2

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Implementation Stage 3

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

<%- include('./_right_sidebar', { titleUrl, titleLabel, links }) %>
