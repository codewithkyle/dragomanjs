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
    syntax: "twig", // currently supports 'twig'
    lang: ["es-MX", "jp-JA", "ca-FR", "ko-KR"], // must be an array of strings
    content: "./templates", // can be an array of template directories
    output: "./translations",
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
