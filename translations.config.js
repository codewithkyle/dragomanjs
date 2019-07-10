const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const glob = require("glob");
const spinner = ora();


/** Matches anything between double curly brackets */
const aggressiveMatcher = /(\{\{|\{\{\s).*?(\}\}|\s\}\})/g;

/** Matches anything between single or double quotes that end with a |t */
const passiveMatcher = /(["'].*?["']\|t)/g;

const baseDirectory = 'templates';
const fileType = 'twig';
const compressed = false;

class TranslationManager{
    constructor()
    {
        console.log(chalk.cyan('Starting the translation file generator'));
        spinner.start();
        spinner.text = 'Collecting files';

        this.templateFiles = glob.sync(`${ baseDirectory }/**/*.${ fileType }`);

        if(this.templateFiles.length)
        {
            this.init();
        }
        else
        {
            spinner.fail();
            spinner.text = 'Missing files';
        }
    }

    validate(){
        return new Promise((resolve, reject)=>{
            fs.exists('translations', (exists)=>{
                if(!exists)
                {
                    fs.mkdir('translations', (err)=>{
                        if(err)
                        {
                            reject(err);
                        }

                        resolve();
                    });
                }
                else
                {
                    resolve();
                }
            });
        });
    }

    removeDefault(){
        let removed = 0;
        const toBeRemoved = 2;
        return new Promise((resolve, reject)=>{
            fs.exists('translations/default.json', (exists)=>{
                if(exists)
                {
                    fs.unlink('translations/default.json', (err)=>{
                        if(err)
                        {
                            reject(err);
                        }

                        removed++;

                        if(removed === toBeRemoved)
                        {
                            resolve();
                        }
                    });
                }
                else
                {
                    removed++;
                }

                if(removed === toBeRemoved)
                {
                    resolve();
                }
            });
            fs.exists('translations/default.csv', (exists)=>{
                if(exists)
                {
                    fs.unlink('translations/default.csv', (err)=>{
                        if(err)
                        {
                            reject(err);
                        }

                        removed++;

                        if(removed === toBeRemoved)
                        {
                            resolve();
                        }
                    });
                }
                else
                {
                    removed++;
                }

                if(removed === toBeRemoved)
                {
                    resolve();
                }
            });
        });
    }

    async init()
    {        
        try{
            await this.validate();
            await this.removeDefault();
            const locals = await this.getLocals();
            const allStrings = await this.getStrings(this.templateFiles);
            const cleanStrings = await this.cleanStrings(allStrings);
            const uniqueStrings = await this.purgeDuplicates(cleanStrings); 
            const emptyDefaultJson = await this.createDefaultJson(locals, uniqueStrings);
            const prefilledDefaultJson = await this.fillDefaultJson(emptyDefaultJson, locals);
            await this.createFile(prefilledDefaultJson);
        }catch(error){
            spinner.fail();
            throw error;
        }
    }

    fillDefaultJson(emptyDefaultJson, locals)
    {
        let count = locals.length;
        let resolvedLocals = 0;
        return new Promise((resolve)=>{
            for(let i = 0; i < locals.length; i++)
            {
                fs.exists(`translations/${ locals[i] }/site.php`, (exists)=>{
                    if(exists)
                    {
                        fs.readFile(`translations/${ locals[i] }/site.php`, (err,file)=>{
                            if(err)
                            {
                                console.log(chalk.red('[File Read Error]'), err);
                                resolvedLocals++;
                                if(resolvedLocals === count)
                                {
                                    resolve(emptyDefaultJson);
                                }
                                return;
                            }

                            let cleanFile = file.toString();
                            cleanFile = cleanFile.replace(/\<\?php.*/g, '');
                            cleanFile = cleanFile.replace(/(return[\s]\[)/g, '');
                            cleanFile = cleanFile.replace(/.*\]\;/g, '');
                            cleanFile = cleanFile.trim();
                            cleanFile = cleanFile.replace(/(,\n)|(,\s\n)|([,]$)/g, 'customSplitMessage1234');
                            const strings = cleanFile.split(/customSplitMessage1234/g);
                            for(let k = 0; k < strings.length; k++)
                            {
                                let cleanString = strings[k].trim();
                                const slicedPairs = cleanString.split(/\s*\=\>\s*/g);
                                
                                if(slicedPairs[1].length > 2)
                                {
                                    let key = slicedPairs[0];
                                    key = key.replace(/^['"]/, '');
                                    key = key.replace(/['"]$/, '');
                                    key = JSON.stringify(key);

                                    let value = slicedPairs[1];
                                    value = value.replace(/^['"]/, '');
                                    value = value.replace(/['"]$/, '');
                                    value = JSON.stringify(value);

                                    emptyDefaultJson[locals[i]][`${ key }`] = value;
                                }
                            }

                            resolvedLocals++;
                            if(resolvedLocals === count)
                            {
                                resolve(emptyDefaultJson);
                            }
                        });
                    }
                    else
                    {
                        resolvedLocals++;
                        if(resolvedLocals === count)
                        {
                            resolve(emptyDefaultJson);
                        }
                    }
                });
            }
        });
    }

    createDefaultJson(locals, strings)
    {
        let emptyDefaultJson = {};
        return new Promise((resolve)=>{
            for(let k = 0; k < locals.length; k++)
            {
                let newLocal = {};
                for(let i = 0; i < strings.length; i++)
                {
                    const key =  JSON.stringify(strings[i]);
                    newLocal[key] = "";
                }

                emptyDefaultJson[locals[k]] = newLocal;
            }
            resolve(emptyDefaultJson);
        });
    }

    purgeDuplicates(strings)
    {
        const uniqueStrings = [];
        return new Promise((resolve)=>{
            for(let i = 0; i < strings.length; i++)
            {
                let isUnique = true;
                for(let k = 0; k <= uniqueStrings.length; k++)
                {
                    if(strings[i] === uniqueStrings[k])
                    {
                        isUnique = false;
                        break;
                    }
                }

                if(isUnique)
                {
                    uniqueStrings.push(strings[i]);
                }
            }

            resolve(uniqueStrings);
        });
    }

    getLocals()
    {
        const localDirectories = glob.sync('translations/*');
        const locals = [];

        for(let i = 0; i < localDirectories.length; i++)
        {
            const cleanedString = localDirectories[i].replace(/.*\//, '');
            locals.push(cleanedString);
        }

        return locals;
    }

    createJsonFile(defaultJson)
    {
        if(compressed)
        {
            fs.writeFile('translations/default.json', defaultJson, (err)=>{
                if(err)
                {
                    console.log(err);
                    spinner.text = 'Failed to write new file';
                    spinner.fail();
                    return;
                }
    
                spinner.text = 'New JSON translation file was generated';
                spinner.succeed();
            });
        }
        else
        {
            let content = '{\n';
            const numberOfLocals = Object.keys(defaultJson).length;
            let currentLocal = 0;
            for(const local of Object.keys(defaultJson))
            {
                currentLocal++;
                content += `\t"${ local }": {\n`;

                const numberOfKeys = Object.entries(defaultJson[local]).length;
                let currentKey = 0;
                for(const [key, value] of Object.entries(defaultJson[local]))
                {
                    currentKey++;
                    if(value.length > 0)
                    {
                        content += `\t\t${ key }: ${ value }`;
                    }
                    else
                    {
                        content += `\t\t${ key }: ""`;
                    }

                    if(currentKey < numberOfKeys)
                    {
                        content += ',\n';
                    }
                    else
                    {
                        content += '\n';
                    }
                }

                if(currentLocal < numberOfLocals)
                {
                    content += `\t},\n`;
                }
                else
                {
                    content += `\t}\n`;
                }
            }

            content += '}\n';

            fs.writeFile('translations/default.json', content, (err)=>{
                if(err)
                {
                    console.log(err);
                    spinner.text = 'Failed to write new file';
                    spinner.fail();
                    return;
                }
    
                spinner.text = 'New JSON translation file was generated';
                spinner.succeed();
            });
        }
    }

    createCsvFile(defaultJson)
    {
        let content = '';
        content += '"en-US",';

        const numberOfLocals = Object.keys(defaultJson).length;
        let currentLocal = 0;
        for(const local of Object.keys(defaultJson))
        {
            currentLocal++;
            content += `"${ local }"`;
            if(currentLocal < numberOfLocals)
            {
                content += ',';
            }
            else
            {
                content += '\n';
            }
        }
        
        const allKeys = [];
        for(const local of Object.keys(defaultJson))
        {
            for(const key of Object.keys(defaultJson[local]))
            {
                let escapedKey = key.replace(/\\"/g, '""');
                if(!allKeys.includes(escapedKey))
                {
                    allKeys.push(escapedKey);
                }
            }
        }

        for(let i = 0; i < allKeys.length; i++)
        {
            content += `${ allKeys[i] },`;

            let currentLocal = 0;
            for(const local of Object.keys(defaultJson))
            {
                currentLocal++;

                let key = defaultJson[local][allKeys[i]];

                if(key !== undefined && key !== '')
                {
                    key = key.replace(/\\"/g, '""');
                    content += `${ key }`;
                }

                if(currentLocal < numberOfLocals)
                {
                    content += ',';
                }
                else
                {
                    content += '\n';
                }
            }
            
        }

        fs.writeFile('translations/default.csv', content, (err)=>{
            if(err)
            {
                console.log(err);
                spinner.text = 'Failed to write new file';
                spinner.fail();
                return;
            }

            spinner.text = 'New CSV translation file was generated';
            spinner.succeed();
        });
    }

    createFile(defaultJson)
    {
        this.createJsonFile(defaultJson);
        this.createCsvFile(defaultJson);
    }

    cleanStrings(strings){
        const cleanedStrings = [];
        const reviewedStrings = [];
        return new Promise((resolve)=>{
            for(let i = 0; i < strings.length; i++)
            {
                const translationString = strings[i].match(passiveMatcher);
                if(translationString)
                {
                    let cleanString = translationString[0].replace(/(\|t)/g, '');
                    cleanString = cleanString.replace(/^["']/gm, '');
                    cleanString = cleanString.replace(/["']$/gm, '');
                    cleanedStrings.push(cleanString);
                }

                reviewedStrings.push(strings[i]);
                if(reviewedStrings.length === strings.length)
                {
                    resolve(cleanedStrings);
                }
            }
        });
    }

    getStrings(files)
    {
        const foundStrings = [];
        const checkedFiles = [];
        return new Promise((resolve) => {
            for(let i = 0; i < files.length; i++)
            {
                fs.readFile(files[i], 'utf-8', (err, file)=>{
                    if(err)
                    {
                        console.log(chalk.red('[File Open Error]'), chalk.white(files[i]));
                    }
                    else
                    {
                        const newStrings = file.match(aggressiveMatcher);
                        if(newStrings)
                        {
                            for(let k = 0; k < newStrings.length; k++)
                            {
                                foundStrings.push(newStrings[k]);
                            }
                        }
                    }

                    checkedFiles.push(files[i]);
                    if(checkedFiles.length === files.length)
                    {
                        resolve(foundStrings);
                    }
                });
            }
        });
    }
}

new TranslationManager();