const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const glob = require("glob");
const rimraf = require("rimraf");

console.log(chalk.cyan('Starting the translation fetcher file generator'));
const spinner = ora();
spinner.start();
spinner.text = 'Collecting files';

/** Matches anything between double curly brackets */
const aggressiveMatcher = /(\{\{|\{\{\s).*?(\}\}|\s\}\})/g;

/** Matches anything between single or double quotes that end with a |t */
const passiveMatcher = /(["'].*?["']\|t)/g;

const baseDirectory = 'templates';
const fileType = 'twig';

class TranslationManager{
    constructor()
    {
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
            const allStrings = await this.getStrings(this.templateFiles);
            const cleanStrings = await this.cleanStrings(allStrings);
            await this.createFile(cleanStrings);
        }catch(error){
            spinner.fail();
            throw error;
        }
    }

    createFile(strings)
    {
        let content = '{\n';

        for(let i = 0; i < strings.length; i++)
        {
            content += `\t"${ strings[i] }": ""`;
            if(i < strings.length - 1)
            {
                content += ',\n';
            }
            else
            {
                content += '\n';
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
        let stringId = 0;
        return new Promise((resolve)=>{
            for(let i = 0; i < strings.length; i++)
            {
                stringId++;
                const currentStringId = stringId;
                const translationString = strings[i].match(passiveMatcher);
                if(translationString)
                {
                    let cleanString = translationString[0].replace(/(\|t)/g, '');
                    cleanString = cleanString.replace(/^["']/gm, '');
                    cleanString = cleanString.replace(/["']$/gm, '');
                    cleanString = cleanString.replace(/\"/g, '\\"'); 
                    cleanedStrings.push(cleanString);

                    if(stringId === currentStringId)
                    {
                        resolve(cleanedStrings);
                    }
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