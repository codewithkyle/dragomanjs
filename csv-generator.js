const fs = require("fs");
const path = require("path");
const yargs = require("yargs").argv;
const glob = require("glob");

const cwd = process.cwd();

/** Get config file path */
const configFile = yargs.c || yargs.config;
let configPath;
if (configFile) {
    configPath = path.resolve(cwd, configFile);
    if (!fs.existsSync(configPath)) {
        console.log(`Missing config file. Did you move the file without updating the --config flag?`);
        process.exit(1);
    }
} else {
    configPath = path.join(cwd, "dragoman.js");
    if (!fs.existsSync(configPath)) {
        configPath = path.join(cwd, "dragoman.config.js");
        if (!fs.existsSync(configPath)) {
            configPath = null;
        }
    }
}

const config = require(configPath) || null;
if (!config) {
    console.log("Missing config file. Learn more at https://github.com/codewithkyle/dragomanjs#configuration");
    process.exit(1);
}

/** Validate required config values */
if (typeof config.project === "undefined") {
    console.log("Invalid config. The project value is missing.");
    process.exit(1);
}
if (typeof config.content === "undefined") {
    console.log("Invalid config. The content value is missing.");
    process.exit(1);
} else {
    if (!Array.isArray(config.content) && typeof config.content === "string") {
        config.content = [config.content];
    } else {
        console.log("Invalid config. The content value must be a string or an array of strings.");
        process.exit(1);
    }
}
if (typeof config.locals === "undefined") {
    console.log("Invalid config. The locals array is missing.");
    process.exit(1);
} else {
    if (!Array.isArray(config.locals)) {
        console.log("Invalid config. The locals value must be an array of strings");
        process.exit(1);
    }
}

class Generator {
    constructor() {
        this.run();
        this.translations = {};
    }

    parseValues(file, handle) {
        return new Promise((resolve, reject) => {
            fs.readFile(file, (error, buffer) => {
                if (error) {
                    reject(error);
                }
                const data = buffer
                    .toString()
                    .replace(/\<\?php\s+/g, "")
                    .replace(/return\s+\[/g, "")
                    .replace(/\s+\]\;/g, "")
                    .trim();
                const pairs = data.replace(/(,\n)|(,\s+\n)|([,])$/g, "customSplitterValue").split("customSplitterValue");
                for (let i = 0; i < pairs.length; i++) {
                    const pair = pairs[i].split(/\=\>/);
                    const key = pair[0]
                        .trim()
                        .replace(/^[\"\']|[\"\']$/g, "")
                        .trim();
                    const value = pair[1]
                        .trim()
                        .replace(/^[\"\']|[\"\']$/g, "")
                        .trim();
                    this.translations[handle][key] = value;
                }
                resolve();
            });
        });
    }

    constructInitialObject() {
        return new Promise((resolve, reject) => {
            const tempDir = path.join(__dirname, "temp");
            if (!fs.existsSync(tempDir)) {
                reject("Temporary directory wasn't generated.");
            }
            glob(`${tempDir}/*.php`, (error, files) => {
                if (error) {
                    reject(error);
                } else if (!files.length) {
                    resolve();
                }
                let parsed = 0;
                for (let i = 0; i < files.length; i++) {
                    const localHandle = files[i].replace(/.*[\\\/]/, "").replace(/\.php/, "");
                    this.translations[localHandle] = {};
                    this.parseValues(files[i], localHandle)
                        .then(() => {
                            parsed++;
                            if (parsed === files.length) {
                                resolve();
                            }
                        })
                        .catch(error => {
                            reject(error);
                        });
                }
            });
        });
    }

    populateKeys(uniqueKeys) {
        return new Promise(resolve => {
            for (let local in this.translations) {
                for (let i = 0; i < uniqueKeys.length; i++) {
                    this.translations[local][uniqueKeys[i]] = this.translations[local][uniqueKeys[i]] || "";
                }
            }
            resolve();
        });
    }

    addNewLocals() {
        return new Promise(resolve => {
            for (let i = 0; i < config.locals.length; i++) {
                if (typeof this.translations[config.locals[i]] === "undefined") {
                    this.translations[config.locals[i]] = {};
                }
            }
            resolve();
        });
    }

    generateCSV() {
        return new Promise((resolve, reject) => {
            const output = path.join(cwd, "translations.csv");
            if (fs.existsSync(output)) {
                fs.unlinkSync(output);
            }

            let data = "";
            data += '"base",';
            const numberOfLocals = Object.keys(this.translations).length;
            let currentLocal = 0;
            for (const local of Object.keys(this.translations)) {
                currentLocal++;
                data += `"${local}"`;
                if (currentLocal < numberOfLocals) {
                    data += ",";
                } else {
                    data += "\n";
                }
            }

            const allKeys = [];
            for (const local of Object.keys(this.translations)) {
                for (const key of Object.keys(this.translations[local])) {
                    let escapedKey = key.replace(/\"/g, '""');
                    if (!allKeys.includes(escapedKey)) {
                        allKeys.push(escapedKey);
                    }
                }
            }

            for (let i = 0; i < allKeys.length; i++) {
                data += `"${allKeys[i]}",`;
                let currentLocal = 0;
                for (const local of Object.keys(this.translations)) {
                    currentLocal++;
                    let key = this.translations[local][allKeys[i]];
                    if (key !== undefined && key !== "") {
                        key = key.replace(/\"/g, '""');
                        data += `"${key}"`;
                    }
                    if (currentLocal < numberOfLocals) {
                        data += ",";
                    } else {
                        data += "\n";
                    }
                }
            }
            fs.writeFile(output, data, error => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }

    cleanup() {
        return new Promise((resolve, reject) => {
            const tempDir = path.join(__dirname, "temp");
            fs.rmdir(tempDir, { recursive: true }, error => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }

    async run() {
        try {
            let collector;
            switch (config.project.toLowerCase().trim()) {
                case "craft":
                    const Tool = require(path.resolve(__dirname, "./lib/craft.js"));
                    collector = new Tool(config);
                    break;
                default:
                    throw `Invalid config project value: ${config.project}. Learn more at https://github.com/codewithkyle/dragomanjs#configuration`;
            }
            const collectedKeys = await collector.run();
            await this.constructInitialObject();
            await this.addNewLocals();
            await this.populateKeys(collectedKeys);
            await this.generateCSV();
            await this.cleanup();
            process.exit(0);
        } catch (error) {
            console.log(error);
            console.log("\n");
            process.exit(1);
        }
    }
}
module.exports = Generator;
