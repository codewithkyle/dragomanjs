# DragomanJS

> _drag·o·man_: an interpreter or guide

Dragoman is a tool used to programmatically scrub your Symfony, Laravel, or Craft CMS templates and outputs all translatable strings into a CSV file. Dragoman also provides the ability to convert a CSV file into PHP and JSON files.

## Installation

Install the package from NPM:

```bash
npm i -D dragomanjs
```

Create a `dragoman.config.js` config file:

```javascript
module.exports = {
    project: "craft",
    locals: ["es-MX", "jp-JA", "ca-FR", "ko-KR"],
    content: "./templates",
};
```

Setup an NPM script to run the CLI:

```json
"translate": "dragoman"
```

Run the NPM script:

```bash
npm run translate
```

## Configuration

Dragoman requires a `dragoman.js` or `dragoman.config.js` configuration file located in the project's root directory. A custom config file location can be provided via the `--config` flag.

```javascript
module.exports = {
    project: "craft", // supports 'craft' or 'symfony' or 'blade'
    locals: ["es-MX", "jp-JA", "ca-FR", "ko-KR"], // must be an array of strings
    content: "./templates", // can be an array of template directories
};
```

## Translating Strings

When the `dragoman` command runs all translatable strings will be parsed from the provided content directories and used to generate a `translations.csv` file. The file can be imported into applications such as Numbers, Excel, Google Sheets, or OpenOffice Calc.
