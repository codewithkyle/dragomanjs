const fs = require("fs");
const path = require("path");

const cwd = process.cwd();

class Generator {
    constructor(input) {
        this.csv = path.resolve(cwd, input);
        if (!fs.existsSync(this.csv)) {
            console.log(`No CSV filed found at ${input}`);
            process.exit(1);
        }
        this.tempDir = path.resolve(__dirname, "temp");
        this.deliveryDir = path.resolve(cwd, "dragoman");
        this.translations = {};
        this.run();
    }

    createTempDirectory() {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(this.tempDir)) {
                fs.rmdirSync(this.tempDir, { recursive: true });
            }
            fs.mkdir(this.tempDir, error => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }

    convertFromCSV() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.csv, (error, buffer) => {
                if (error) {
                    reject(error);
                }
                const csv = buffer.toString();
                const rows = csv.split(/\n/g);

                const locals = rows[0].split(/,(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/g);
                for (let i = 0; i < locals.length; i++) {
                    let cleanName = locals[i]
                        .replace(/^[\"]|[\"]$/g, "")
                        .replace(/\"\"/g, '"')
                        .trim();
                    locals[i] = cleanName;
                    this.translations[cleanName] = {};
                }

                if (rows) {
                    for (let i = 1; i < rows.length; i++) {
                        const values = rows[i].split(/,(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/g);
                        if (values) {
                            if (values.length === locals.length) {
                                for (let k = 0; k < locals.length; k++) {
                                    let cleanName = values[k];
                                    if (values[k].length) {
                                        cleanName = cleanName
                                            .replace(/^[\"]|[\"]$/g, "")
                                            .replace(/\"\"/g, '"')
                                            .trim();
                                        cleanName = cleanName;
                                        values[k] = cleanName;
                                    }

                                    this.translations[locals[k]][values[0]] = cleanName;
                                }
                            }
                        } else {
                            reject("Failed to parse CSV values.");
                        }
                    }
                    resolve();
                } else {
                    reject("Failed to parse CSV rows.");
                }
            });
        });
    }

    createLocals() {
        return new Promise((resolve, reject) => {
            const numberOfLocals = Object.keys(this.translations).length;
            let generated = 0;
            for (const local in this.translations) {
                fs.mkdir(`${this.tempDir}/${local}`, error => {
                    if (error) {
                        reject(error);
                    }
                    generated++;
                    if (generated === numberOfLocals) {
                        resolve();
                    }
                });
            }
        });
    }

    generatePHPFiles() {
        return new Promise((resolve, reject) => {
            const numberOfLocals = Object.keys(this.translations).length;
            let generated = 0;
            for (const local in this.translations) {
                let data = "<?php\n\nreturn [\n";
                let count = 0;
                const numberOfKeys = Object.keys(this.translations[local]).length;
                for (const [key, value] of Object.entries(this.translations[local])) {
                    count++;
                    data += "\t";
                    if (new RegExp(/\"/, "g").test(key)) {
                        data += `'${key}'`;
                    } else {
                        data += `"${key}"`;
                    }
                    data += " => ";
                    if (new RegExp(/\"/, "g").test(value)) {
                        data += `'${value}'`;
                    } else {
                        data += `"${value}"`;
                    }
                    if (count < numberOfKeys) {
                        data += ",\n";
                    } else {
                        data += "\n";
                    }
                }
                data += "];\n";
                fs.writeFile(`${this.tempDir}/${local}/site.php`, data, error => {
                    if (error) {
                        reject(error);
                    }
                    generated++;
                    if (generated === numberOfLocals) {
                        resolve();
                    }
                });
            }
        });
    }

    generateJSONFiles() {
        return new Promise((resolve, reject) => {
            const numberOfLocals = Object.keys(this.translations).length;
            let generated = 0;
            for (const local in this.translations) {
                let data = "{\n";
                let count = 0;
                const numberOfKeys = Object.keys(this.translations[local]).length;
                for (const [key, value] of Object.entries(this.translations[local])) {
                    count++;
                    data += `\t"${key.replace(/\"/g, '\\"')}": "${value.replace(/\"/g, '\\"')}"`;
                    if (count < numberOfKeys) {
                        data += ",\n";
                    } else {
                        data += "\n";
                    }
                }
                data += "}\n";
                fs.writeFile(`${this.tempDir}/${local}/site.json`, data, error => {
                    if (error) {
                        reject(error);
                    }
                    generated++;
                    if (generated === numberOfLocals) {
                        resolve();
                    }
                });
            }
        });
    }

    generateDeliveryDirectory() {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(this.deliveryDir)) {
                fs.rmdirSync(this.deliveryDir);
            }
            fs.mkdir(this.deliveryDir, error => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }

    deliverFiles() {
        return new Promise((resolve, reject) => {
            let copied = 0;
            const numberOfLocals = Object.keys(this.translations).length;
            for (const local in this.translations) {
                fs.mkdir(`${this.deliveryDir}/${local}`, error => {
                    if (error) {
                        reject(error);
                    }

                    fs.copyFile(`${this.tempDir}/${local}/site.php`, `${this.deliveryDir}/${local}/site.php`, error => {
                        if (error) {
                            reject(error);
                        }
                        fs.copyFile(`${this.tempDir}/${local}/site.json`, `${this.deliveryDir}/${local}/site.json`, error => {
                            if (error) {
                                reject(error);
                            }
                            copied++;
                            if (copied === numberOfLocals) {
                                resolve();
                            }
                        });
                    });
                });
            }
        });
    }

    cleanup() {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(this.tempDir)) {
                fs.rmdir(this.tempDir, { recursive: true }, error => {
                    if (error) {
                        reject(error);
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async run() {
        try {
            await this.createTempDirectory();
            await this.convertFromCSV();
            delete this.translations["base"];
            await this.createLocals();
            await this.generatePHPFiles();
            await this.generateJSONFiles();
            await this.generateDeliveryDirectory();
            await this.deliverFiles();
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
