const fs = require("fs");
const glob = require("glob");
const path = require("path");

const cwd = process.cwd();

class Generator {
    constructor(config) {
        this.config = config;
        this.tempDir = path.resolve(__dirname, "temp");
        this.translations = {};
        for (let i = 0; i < this.config.lang.length; i++){
            this.translations[this.config.lang[i]] = {};
        }
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

    createLangs() {
        return new Promise((resolve, reject) => {
            const numberOfLangs = Object.keys(this.translations).length;
            let generated = 0;
            for (const lang in this.translations) {
                fs.mkdir(path.join(this.tempDir, lang), error => {
                    if (error) {
                        reject(error);
                    }
                    generated++;
                    if (generated === numberOfLangs) {
                        resolve();
                    }
                });
            }
        });
    }

    generatePHPFiles() {
        return new Promise((resolve, reject) => {
            const numberOfLangs = Object.keys(this.translations).length;
            let generated = 0;
            for (const lang in this.translations) {
                let data = "<?php\n\nreturn [\n";
                let count = 0;
                const numberOfKeys = Object.keys(this.translations[lang]).length;
                for (const [key, value] of Object.entries(this.translations[lang])) {
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
                fs.writeFile(path.join(this.tempDir, lang, "site.php"), data, error => {
                    if (error) {
                        reject(error);
                    }
                    generated++;
                    if (generated === numberOfLangs) {
                        resolve();
                    }
                });
            }
        });
    }

    generateDeliveryDirectory() {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(this.config.output)) {
                fs.rmdirSync(this.config.output, {recursive: true});
            }
            fs.mkdir(this.config.output, error => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }

    deliverFiles() {
        return new Promise(async (resolve, reject) => {
            try{
                let copied = 0;
                const numberOfLangs = Object.keys(this.translations).length;
                for (const lang in this.translations) {
                    await fs.promises.mkdir(path.join(this.config.output, lang));
                    await fs.promises.copyFile(path.join(this.tempDir, lang, "site.php"), path.join(this.config.output, lang, "site.php"));
                    copied++;
                    if (copied === numberOfLangs) {
                        resolve();
                    }
                }
            } catch (e) {
                reject(e);
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

    prefillBaseStrings(strings) {
        for (const lang in this.translations){
            for (let i = 0; i < strings.length; i++){
                this.translations[lang][strings[i]] = "";
            }   
        }
    }

    getCurrentTranslationFiles(){
        return glob.sync(`${this.config.output}/**/*.php`);
    }

    retainTranslations(currentFiles){
        return new Promise( async (resolve) => {
            for (const file of currentFiles){
                const lang = file.replace(/.*(translations)[\\\/]/g, "").split(/[\\\/]/)[0];
                let data = await fs.promises.readFile(file, "utf-8");
                data = data.split(",");
                for (const line of data){
                    const values = line.split("=>");
                    const key = values[0].match(/[\"\'].*[\'\"]/g)[0].replace(/^[\'\"]|[\'\"]$/g, "");
                    const value = values[1].match(/[\"\'].*[\'\"]/g)[0].replace(/^[\'\"]|[\'\"]$/g, "");
                    this.translations[lang][key] = value;
                }
            }
            resolve();
        });
    }

    async run() {
        try {
            await this.createTempDirectory();
            await this.createLangs();
            const parser = require("./lib/craft");
            const baseStrings = await parser(this.config);
            this.prefillBaseStrings(baseStrings);
            const currentFiles = this.getCurrentTranslationFiles();
            await this.retainTranslations(currentFiles);
            await this.generatePHPFiles();
            await this.generateDeliveryDirectory();
            await this.deliverFiles();
            await this.cleanup();
            process.exit(0);
        } catch (error) {
            console.log(error);
            process.exit(1);
        }
    }
}
module.exports = Generator;
