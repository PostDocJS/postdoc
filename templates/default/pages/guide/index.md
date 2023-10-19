<%
const titleUrl = '#what-is-project';
const titleLabel = 'What is [Project]';

const links = [
  { linkUrl: '#part-1', linkLabel: 'Part 1' },
  { linkUrl: '#part-2', linkLabel: 'Part 2' },
];
%>

# What is [Project]

## Part 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Part 2

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

<%- include('./_right_sidebar', { titleUrl, titleLabel, links }) %>
