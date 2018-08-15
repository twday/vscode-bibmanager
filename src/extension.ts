'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, commands, ExtensionContext, Disposable, TextDocument, StatusBarItem, StatusBarAlignment, DocumentHighlight} from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "BibtexSorter" is now active!');

    let bibSorter = new BibSorter();
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let initialise = commands.registerCommand('extension.initialise', () => {
        bibSorter.Init();
        window.showInformationMessage('BibTex Sorter Initialising');
    });
    let disposable = commands.registerCommand('extension.sortEntries', () => {
        // The code you place here will be executed every time your command is executed

        bibSorter.SortEntries();

        // Display a message box to the user
        window.showInformationMessage('Sorting BibTex Entries!');
    });

    context.subscriptions.push(bibSorter);
    context.subscriptions.push(initialise);
    context.subscriptions.push(disposable);
}

class BibSorter{

    private _statusBarItem : StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
    public Init() {
        if (!window.activeTextEditor){
            this._statusBarItem.hide();
            return;
        }

        this._statusBarItem.text = "Sort";
        this._statusBarItem.command = "";

        if (window.activeTextEditor.document.languageId === "bibtex"){
            this._statusBarItem.show();
        }
    }
    
    public SortEntries() {
        let doc = window.activeTextEditor.document;
        var entries : BibEntry[];

        if (doc.languageId === "bibtex"){
            this._statusBarItem.show();
            let docContent = doc.getText();

            let entries = docContent.split("@");

            entries.forEach(entry => {
                var bibEntry : BibEntry;
                entry.split("\n").forEach(line => {
                    console.log(line);
                    bibEntry.type = line.split("{")[0];
                    bibEntry.key = line.split("{")[1];
                });

                //console.log(bibEntry.key);
            });
        }
    }

    dispose(){
        this._statusBarItem.dispose();
    }
}

class BibEntry{
    key : String;
    type : String;
    title : String;
    author : String;
    year : number;

    public BibEntry(key : String, type : String, title : String, author : String, year : number){
        this.title = title;
        this.author = author;
        this.year = year;
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}