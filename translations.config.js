const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const glob = require("glob");
const rimraf = require("rimraf");
const spinner = ora();


/** Matches anything between double curly brackets */
const aggressiveMatcher = /(\{\{|\{\{\s).*?(\}\}|\s\}\})/g;

/** Matches anything between single or double quotes that end with a |t */
const passiveMatcher = /(["'].*?["']\|t)/g;

const baseDirectory = 'templates';
const fileType = 'twig';

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
        return new Promise((resolve, reject)=>{
            fs.exists('translations/default.json', (exists)=>{
                if(exists)
                {
                    fs.unlink('translations/default.json', (err)=>{
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
            console.log(prefilledDefaultJson);
            await this.createFile(locals, uniqueStrings);
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
                            cleanFile = cleanFile.replace(/.*\[/g, '');
                            cleanFile = cleanFile.replace(/.*\]\;/g, '');
                            
                            const strings = cleanFile.split(/,/g);
                            for(let k = 0; k < strings.length; k++)
                            {
                                let cleanString = strings[k].trim();
                                const slicedPairs = cleanString.split(/\s*\=\>\s*/g);
                                
                                if(slicedPairs[1].length > 2)
                                {
                                    emptyDefaultJson[locals[i]][slicedPairs[0]] = slicedPairs[1];
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
                    newLocal[strings[i]] = '';
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

    createFile(locals, strings)
    {
        let content = '{\n';

        for(let k = 0; k < locals.length; k++)
        {
            content += `\t"${ locals[k] }": {\n`;

            for(let i = 0; i < strings.length; i++)
            {
                content += `\t\t"${ strings[i] }": ""`;
                if(i < strings.length - 1)
                {
                    content += ',\n';
                }
                else
                {
                    content += '\n';
                }
            }
            
            if(k < locals.length - 1)
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

            spinner.text = 'New translation file was generated';
            spinner.succeed();
        });
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
                    cleanString = cleanString.replace(/\"/g, '\\"'); 
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