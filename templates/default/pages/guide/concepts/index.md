<%
const titleUrl = '#concepts';
const titleLabel = 'Concepts';

const links = [
  { linkUrl: '#concept-stage-1', linkLabel: 'Concept Stage 1' },
  { linkUrl: '#concept-stage-2', linkLabel: 'Concept Stage 2' },
  { linkUrl: '#concept-stage-3', linkLabel: 'Concept Stage 3' },
];
%>

# Concepts

A deep-dive into key project concepts and architecture goes here.

## Concept Stage 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Concept Stage 2

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Concept Stage 3

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

<%- include('../_right_sidebar', { titleUrl, titleLabel, links }) %>
