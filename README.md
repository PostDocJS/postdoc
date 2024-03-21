# Postodc

<a href="https://postdoc.dev">Postdoc</a> enables you to create delightful documentation with ease.

## Install

The **recommended** way to install Postdoc is by running:

```bash
npm init postdoc@latest
```

Or you can add Postdoc to an existing project manually: 

```bash
npm i -D postdoc
```

and then run `npx postdoc init` to create a new Postdoc project.

## Documentation

Visit [the official documentation](https://postdoc.dev).

## Support

Having trouble? Get help in the [Discussions](https://github.com/PostDocJS/postdoc/discussions) or [create an issue](https://github.com/PostDocJS/postdoc/issues).

## Directory

| Package name                                | Package version |
|---------------------------------------------|-----------------|
| [postdoc](/PostDocJS/postdoc)               | 0.1.3           |
| [create-postdoc](/PostDocJS/create-postdoc) | 0.0.1           |

## Links

- [License (MIT)](LICENSE)
- [Website](https://postdoc.dev)


## Sphinx documentation

Postdoc can handle sphinx documentation as well. 

In your python project repository directory run the following CLI command:

```shell
sphinx-build -M xml ./docs/source ./docs/build/ -W --keep-going
```

**Important**: You sould be able to generate sphinx docs before running `postdoc init` command.

On `postdoc init` command to handle the sphinx docs select the `sphinx-python` template and paste path to sphinx docs folder (where you have the Makefile and source folder).

```
? Select the UI template to used: sphinx-python
? Enter path to python sphinx docs: absolute/path/to/sphinx/docs
```

**Something went wrong?**

In case `sphinx-build` command failed, make sure the following applies to your python project as well.  

Usually, setup for sphinx documentation has the following directory structure:

```

/docs: Main directory for Sphinx documentation. <---- we need this path!
    /source: Your sphinx configuration and documentation in .md, .rst files.
        conf.py: Config file for Sphinx
        index.rst: Entrypoint for Sphinx docs (main page)
        modules.rst: Lists the modules of your Python package.
    /build: The output directory where Sphinx saves the generated documentation.
    Makefile: A file with commands to build the docs in various formats.

/your_python_package: The directory containing your Python package code.
    __init__.py: Indicates that this directory is a Python package.
    module1.py: A module in your package.
    module2.py: Another module in your package.
    setup.py: The setup script for installing the package.

```

TIP: If you get some imports errors make sure in the `conf.py` you added this code at the top:  

```py
# conf.py

import sys

absPathToPyPackage = __file__.split("docs")[0]

sys.path.append(absPathToPyPackage)

```

With that change sphinx will be able to get doc strings from python classes and functions.




