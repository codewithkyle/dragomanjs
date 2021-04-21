#!/usr/bin/env node

const path = require("path");
const semver = require("semver");
const yargs = require("yargs").argv;
const fs = require("fs");

const cwd = process.cwd();

/** Verify Nodejs version */
const packageJson = require(path.join(__dirname, "package.json"));
const version = packageJson.engines.node;
if (!semver.satisfies(process.version, version)) {
    const rawVersion = version.replace(/[^\d\.]*/, "");
    console.log(`Dragoman requires at least Node v${rawVersion} and you're using Node ${process.version}`);
    process.exit(1);
}

/** Manage config file */
let config = {
    syntax: null,
    lang: [],
    content: "./templates",
    output: "./translations"
};
let customConfigPath = yargs.config || "dragoman.config.js";
customConfigPath = path.join(cwd, customConfigPath);
if (!fs.existsSync(customConfigPath)){
    console.log(`Failed to find config file at ${customConfigPath}`);
    process.exit(1);
}
const customConfig = require(customConfigPath);
config = Object.assign(config, customConfig);
if (!Array.isArray(config.content)){
    config.content = [config.content];
}
for (let i = 0; i < config.content.length; i++){
    config.content[i] = path.resolve(cwd, config.content[i]);
}
config.output = path.resolve(cwd, config.output);
if (!Array.isArray(config.lang)){
    console.log(`Invalid config setting. 'lang' must be an array of strings.`);
    process.exit(1);
} else if (!config.lang.length){
    console.log(`Invalid config setting. 'lang' array cannot be empty.`);
    process.exit(1);
}

const Generator = require("./generator");
new Generator(config);
