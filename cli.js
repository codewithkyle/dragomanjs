#!/usr/bin/env node

const path = require("path");
const semver = require("semver");
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

const input = yargs.input || null;
if (input) {
    const Generator = require("./php-generator");
    new Generator(input);
} else {
    const Generator = require("./csv-generator");
    new Generator();
}
