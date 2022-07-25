# Code requirements

- Write a file extension of the imported file:

`BAD`
```js
const foo = require('./baz');
```

`GOOD`
```js
const foo = require('./baz.js');
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

- Use only named exports:

`BAD`
```js
module.exports = {
  foo: 8
};
```

`GOOD`
```js
exports.foo = 8;
```

- If the module contains only one *exported* member, then you can assign it directly to the *exports*' property. Otherwise, write all exports at the end of the file:

`BAD`
```js
const foo = () => ({});

exports.foo = foo;
```

`GOOD`
```js
exports.foo = () => ({});
```

`BAD`
```js
exports.foo = () => {};
exports.baz = {};
```

`GOOD`
```js
const foo = () => {};
const baz = {};

exports.foo = foo;
exports.baz = baz;
```

- Separate imports of the Node core modules, packages and internal modules.

`BAD`
```js
const path = require('path');
const settings = require('../urils/settings.js');
const dotenv = require('dotenv');
const fs = require('fs');
```

`GOOD`
```js
const fs = require('fs');
const path = require('path');

const dotenv = require('dotenv');

const settings = require('../urils/settings.js');
```

- Default imports have higher priority than named:

`BAD`
```js
const {promises} = require('fs');
const path = require('path');
```

`GOOD`
```js
const path = require('path');
const {promises} = require('fs');
```

- Sort every import group by the variables' length (shorter -> higher):

`BAD`
```js
const {resolve, join} = require('path');
const {promises} = require('fs');
```

`GOOD`
```js
const {promises} = require('fs');
const {join, resolve} = require('path');
```