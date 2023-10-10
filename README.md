# PostDoc

[![CI](https://github.com/PostDocJS/postdoc/actions/workflows/main.yml/badge.svg)](https://github.com/PostDocJS/postdoc/actions/workflows/main.yml)

## Structure

Implemented commands:

1. `create`:
   1. `page <name> [--test]`
   2. `test <name>`
   3. `include <name>`
2. `build` - runs the build in _production_ mode.
3. `run` - runs the build in _development_ mode, watches for changes and serves the output directory.
4. `init` - creates the minimal structure of the PostDoc project.

Other commands behave as mocks and do nothing.

### Configuration

There may be 4 types of configuration files:

1. `postdoc.conf.mjs`
2. `postdoc.conf.cjs`
3. `postdoc.conf.js` (behaves as ES modules when the `type: "module"` in _package.json_)
4. `postdoc.json`

PostDoc tries to resolve them in the order of priority (`.mjs` has the highest priority).

Even if the user does not provide the file there are default settings which PostDoc uses.
See the _configuration/defaults.js_ file. The configuration file must have the default export. A value may
be either the object or the function (sync or async) that returns an object.

### Pages and assets

Every page must have a layout file - `<name>.html.ejs` which is located in the `pages` directory.
Optionally the user can create the content file (`<name>.md`) which should have the same name as the layout
file or be under the `contents` directory with a similar sub path. Also, the user may create sections - MD
files that starts with the underscore **\_**. Includes live in the `includes` directory.
Assets may be whenever the user wants.

The content files may have the front matter section at the top of the file.

List of available properties:

1. _title_ - title of the page
2. _description_ - description of the page
3. _keywords_ - keywords of the page
4. _image_ - image of the page for the Open graph protocol
5. _author_ - author name of the page for the Open graph protocol
6. _language_ - language of the page
7. _draft_ - defines whether the page has to be built for the production.
8. _last_updated_ - the ISO string date of the last update

All properties are optional.

> Refer to the _bundler/page/front-matter.js_ file for the detailed information.

A user can define _CSS_ and _JS_ by placing it alongside the layout file with the same file name. PostDoc will
automatically pick them up and include into the page. The user may use _TS_, _SCSS_, _Sass_, _Less_ and _Stylus_ as well,
but he/she has to install according packages.

### API

The layout, content file and sections have the special public API. In short, they all behave as the EJS files,
so the user can use JavaScript between special syntax (_<% %>_, by default).

> The user has to write HTML with the EJS syntax in MD files.

There is a global `page` instance with three properties:

1. _url_ - contains the public URL of a current page.
2. _contents_ - compiled HTML output of the content file (available only in layout and includes).
3. _sections_ - compiled HTML output of section files (available only in layout and includes).

Also, there are two global functions:

1. _subPagesOf(url, options?)_ - returns the array of objects. Each object contains the URL of the matched
   page and optionally - URLs of all sections that the page has. By default, it returns only direct subpages,
   but the user may include nested pages by providing the _includeNested_ property in _options_ object parameter.
2. _url(value)_ - normalizes the URL to the referenced asset if the _value_ starts with the **~** symbol
   (means the absolute path to current working directory). Otherwise, it returns the _value_ as is. The function
   produces the relative URL and Vite is able to pick an asset up and process it. If the asset lives in the
   _public_ folder then it must be referenced with the _/_ instead of the _~_. That asset is copied as is and
   not rebased and processed by Vite.

### Navigation

PostDoc produces static pages, but a website behaves as the SPA when JavaScript is enabled in browser.
There is a special _manager_ that traps all anchors on the page and on click loads the HTML of the next page,
parses it and replaces the current DOM with the new one, executes all scripts and loads stylesheets.

The consequence of that approach is that the page's script is executed only once. In order to solve that
problem there is a special API that registers the actions that should be done on the page.
That API is exposed by the `postdoc/client` module, so user can import the file and use exported values.

These are:

1. _onRender(fn)_ - registers and executes the function after the navigation finishes (into the current page).
2. _onLeave(fn)_ - registers and executes the function right before the navigation starts (from the current page).
3. _attachListener(selectors, event, listener)_ - registers event listener in respect to the Navigation API (remember that DOM nodes are discarded after navigation complete).
4. _attachListenerAll(selectors, event, listener)_ - registers event listener to all matched elements in respect to the Navigation API (remember that DOM nodes are discarded after navigation complete).
5. _navigateTo(url)_ - executes the navigation programmatically (useful if the user wants to navigate on the button click).
