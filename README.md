# postdoc

[![CI](https://github.com/PostDocJS/postdoc/actions/workflows/main.yml/badge.svg)](https://github.com/PostDocJS/postdoc/actions/workflows/main.yml)

## Development

To be able to develop the project you should have NodeJS >=10 only.

Commands can be tested with `node ./bin/postdoc.js <arguments here...>`.

### Code requirements

- Write file extension in an imported file:

`BAD`
```js
import foo from './baz';
```

`GOOD`
```js
import foo from './baz.js';
```

- Use the dash in the filenames instead of the point:

`BAD`
```
file.name.js
```

`GOOD`
```
file-name.js
```
