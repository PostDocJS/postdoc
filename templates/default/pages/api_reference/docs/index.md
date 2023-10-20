<%
const titleUrl = '#api-endpoints';
const titleLabel = 'API Endpoints';

const links = [
{ linkUrl: '#api-endpoint-1', linkLabel: 'API Endpoint 1' },
{ linkUrl: '#api-endpoint-2', linkLabel: 'API Endpoint 2' },
{ linkUrl: '#api-endpoint-3', linkLabel: 'API Endpoint 3' },
];
%>

<div id="content">

# API Endpoints

## API Endpoint 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## API Endpoint 2

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## API Endpoint 3

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

</div>

<%- include('\_right_sidebar', { titleUrl, titleLabel, links }) %>
