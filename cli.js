#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const semver = require("semver");
const yargs = require("yargs").argv;
const glob = require("glob");

const cwd = process.cwd();

/** Verify Nodejs version */
const packageJson = require(path.join(__dirname, "package.json"));
const version = packageJson.engines.node;
if (!semver.satisfies(process.version, version)) {
    const rawVersion = version.replace(/[^\d\.]*/, "");
    console.log(`Dragoman requires at least Node v${rawVersion} and you're using Node ${process.version}`);
    process.exit(1);
}

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

class Dragoman {
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
                const pairs = data.split(/(,\n)|(,\s+\n)|([,])$/g);
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

    async run() {
        try {
            let collector;
            switch (config.project) {
                case "craft":
                    const Tool = require(path.join(__dirname, "craft.js"));
                    collector = new Tool(config);
                    break;
                default:
                    throw `Invalid config project value: ${config.project}. Learn more at https://github.com/codewithkyle/dragomanjs#configuration`;
            }
            const collectedKeys = await collector.run();
            await this.constructInitialObject();
        } catch (error) {
            console.log(error);
            console.log("\n");
            process.exit(1);
        }
    }
}
new Dragoman();
