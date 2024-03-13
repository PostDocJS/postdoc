import assert from 'node:assert/strict';
import SphinxCompiler from '../../lib/sphinx/sphinx-compiler.js';


// nightwatch.js --test test/src/sphinx.js

describe('SphinxCompiler module', function () {

    test('replace Tag Literal With Italic', async function(client){

        const sphinx = new SphinxCompiler()

        const original = `
        -echodata-object"><inline classes="std std-ref"><literal>EchoData</literal> objects</inline></reference> (or stored in <literal>.zarr</literal> or <literal>.nc</literal> format) and calibrated, the core input and output of most subsequent functions are generic <reference refuri="https://docs.xarray.dev/en/stable/generated/xarray.Dataset.html">xarray <literal>Datasets</literal></reference>. This design allows new processing functions be easily added without needing to understand specialized objects, other than functions needing access of data stored only in the raw-converted <literal>EchoData</literal> objects.</paragraph
        `
        const expected = `
        -echodata-object"><inline classes="std std-ref"><i>EchoData</i> objects</inline></reference> (or stored in <i>.zarr</i> or <i>.nc</i> format) and calibrated, the core input and output of most subsequent functions are generic <reference refuri="https://docs.xarray.dev/en/stable/generated/xarray.Dataset.html">xarray <i>Datasets</i></reference>. This design allows new processing functions be easily added without needing to understand specialized objects, other than functions needing access of data stored only in the raw-converted <i>EchoData</i> objects.</paragraph
        `

        const result = sphinx.replaceTagLiteralWithItalic(original);

        assert.equal(result, expected)

    })

});
