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

const files = glob.sync(`${ baseDirectory }/**/*.${ fileType }`);

class TranslationManager{
    constructor()
    {
        if(files.length)
        {
            if(fs.existsSync('translations'))
            {
                rimraf('translations', (err)=>{
                    if(err){
                        spinner.text = 'Failed to remove the old file';
                        spinner.fail();
                        throw err;
                    }
                });
            }
            else
            {
                this.init();
            }
        }
        else
        {
            spinner.fail();
            spinner.text = 'Missing files';
        }

        this.collectedStrings = [];
    }

    init()
    {
        spinner.text = 'Getting translation strings';
        this.getStrings().then(strings => {
            this.cleanStrings(strings).then(strings => {
                this.createFile(strings);
            });
        })
        .catch(e => {
            console.log(e);
        });
    }

    createFile(strings)
    {
        let content = '<?php\n\n';
        content += 'return [\n';

        for(let i = 0; i < strings.length; i++)
        {
            content += `\t'${ strings[i] }' => '',\n`;
        }

        content += '];\n';

        fs.writeFile('test.php', content, (err)=>{
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
                    cleanString = cleanString.replace(/\'/g, "\\'");
                    cleanedStrings.push(cleanString);

                    if(stringId === currentStringId)
                    {
                        resolve(cleanedStrings);
                    }
                }
            }
        });
    }

    getStrings()
    {
        let foundStrings = [];
        let globalFileId = 0;
        return new Promise((resolve) => {
            for(let i = 0; i < files.length; i++)
            {
                globalFileId++;
                const currentFileId = globalFileId;
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
                            foundStrings = [...foundStrings, ...newStrings];
                            
                            if(globalFileId === currentFileId)
                            {
                                resolve(foundStrings);
                            }
                        }
                    }
                });
            }
        });
    }
}

new TranslationManager();