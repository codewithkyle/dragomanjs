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
    lang: ["es-MX", "jp-JA", "ca-FR", "ko-KR"],
    content: "./templates",
};
```

Setup an NPM script to run the CLI:

```json
"translate:create": "dragoman"
```

Run the NPM script:

```bash
npm run translate:create
```

## Configuration

Dragoman requires a `dragoman.config.js` configuration file located in the project's root directory. A custom config file location can be provided via the `--config` flag.

```javascript
module.exports = {
    project: "craft", // currently supports 'craft'
    lang: ["es-MX", "jp-JA", "ca-FR", "ko-KR"], // must be an array of strings
    content: "./templates", // can be an array of template directories
};
```

## Translating Strings

When the `dragoman` command runs all translatable strings will be parsed from the provided content directories and used to generate a `translations.csv` file. The file can be imported into applications such as Numbers, Excel, Google Sheets, or OpenOffice Calc.

To convert the CSV file into JSON and PHP use the `--input` flag.

```json
"translate:convert": "dragoman --input ./translations.csv"
```

The files will be placed in a `dragoman` directory at your project root. Each language will be split into their own directory with a `site.php` and `site.json`.

## Roadmap

-   **0.2:** Symfony support
-   **0.3:** Blade support
