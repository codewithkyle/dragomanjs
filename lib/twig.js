const glob = require("glob");
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();

/** Matches anything between double curly brackets */
const aggressiveMatcher = new RegExp(/(\{\{|\{\{\s).*?(\}\}|\s\}\})/, "g");

/** Matches anything between single or double quotes that end with a |t */
const passiveMatcher = new RegExp(/(["'].*?["']\|t)/, "g");

class Craft {
    constructor() {
        this.config = null;
        this.tempDir = null;
    }

    getTemplates() {
        return new Promise(resolve => {
            let files = [];
            for (let i = 0; i < this.config.content.length; i++) {
                const newFiles = glob.sync(`${this.config.content[i]}/**/*.twig`);
                files = [...files, ...newFiles];
            }
            resolve(files);
        });
    }

    collectRawStrings(templates) {
        return new Promise((resolve, reject) => {
            if (!templates.length) {
                reject("No templates provided.");
            }
            let strings = [];
            let parsed = 0;
            for (let i = 0; i < templates.length; i++) {
                fs.readFile(templates[i], (error, buffer) => {
                    if (error) {
                        reject(error);
                    }
                    const newStrings = buffer.toString().match(aggressiveMatcher);
                    if (newStrings) {
                        for (let k = 0; k < newStrings.length; k++) {
                            strings.push(newStrings[k]);
                        }
                    }
                    parsed++;
                    if (parsed === templates.length) {
                        resolve(strings);
                    }
                });
            }
        });
    }

    cleanStrings(rawStrings) {
        return new Promise(resolve => {
            if (!rawStrings.length) {
                resolve(rawStrings);
            }
            const cleanedStrings = [];
            for (let i = 0; i < rawStrings.length; i++) {
                const translationString = rawStrings[i].match(passiveMatcher);
                if (translationString) {
                    const cleanString = translationString[0]
                        .replace(/(\|t)/g, "")
                        .replace(/^["']|["']$/gm, "")
                        .trim();
                    cleanedStrings.push(cleanString);
                }
            }
            resolve(cleanedStrings);
        });
    }

    prugeDuplicates(strings) {
        return new Promise(resolve => {
            if (!strings.length) {
                resolve(strings);
            }
            const uniqueStrings = [];
            for (let i = 0; i < strings.length; i++) {
                let isUnique = true;
                const currString = strings[i];
                for (let k = 0; k <= uniqueStrings.length; k++) {
                    if (currString === uniqueStrings[k]) {
                        isUnique = false;
                        break;
                    }
                }
                if (isUnique) {
                    uniqueStrings.push(strings[i]);
                }
            }
            resolve(uniqueStrings);
        });
    }

    async run(config) {
        try {
            this.config = config;

            /** Get template files */
            const templateFiles = await this.getTemplates();

            /** Get strings */
            const rawStrings = await this.collectRawStrings(templateFiles);
            const cleanStrings = await this.cleanStrings(rawStrings);
            const uniqueStrings = await this.prugeDuplicates(cleanStrings);

            /** Pass the unique keys back to the CLI script */
            return uniqueStrings;
        } catch (error) {
            throw error;
        }
    }
}
const parser = new Craft();
module.exports = parser.run.bind(parser);
