#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");
const semver = require("semver");
const ora = require("ora");
const yargs = require("yargs").argv;

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
