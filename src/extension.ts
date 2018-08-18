'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, commands, ExtensionContext, workspace, WorkspaceEdit, Range} from 'vscode';

var types = ['electronic', 'article', 'inproceedings', 'misc'];
enum SortType {
    KeyAsc,
    KeyDsc,
    TitleAsc,
    TitleDsc,
    AuthorAsc,
    AuthorDsc
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "BibtexSorter" is now active!');

    let bibManager = new BibManager();
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let createEntry = commands.registerTextEditorCommand('extension.createEntry', () => {
        bibManager.CreateEntry();
    });
    let deleteEntry = commands.registerTextEditorCommand('extension.deleteEntry', () => {
        bibManager.DeleteEntry();
    });
    let sortKeyAscending = commands.registerTextEditorCommand('extension.sortEntriesAsc', () => {
        bibManager.SortEntries(SortType.KeyAsc);

        // Display a message box to the user
        window.showInformationMessage('Sorting By Key in Ascending Order');
    });
    let sortKeyDescending = commands.registerTextEditorCommand('extension.sortEntriesDsc', () => {

        bibManager.SortEntries(SortType.KeyDsc);

        // Display a message box to the user
        window.showInformationMessage('Sorting By Key in Descending Order');
    });

    context.subscriptions.push(
        createEntry, 
        deleteEntry,
        sortKeyAscending,
        sortKeyDescending
    );
}

class BibManager{

    bibEntries: BibEntry[] = [];

    constructor(){
        let doc = window.activeTextEditor.document;

        var regex = /[\t{},]*/g;
        
        if (doc.languageId === "bibtex"){
            //this._statusBarItem.show();
            let docContent = doc.getText();
    
            let entries = docContent.split("@");
    
            entries.forEach(entry => {
                var bibEntry = new BibEntry();
                entry.split("\n").forEach(line => {
                    line = line.replace("{","=");
                    line = line.replace(regex, "");
                    //console.log(line);
                    var kv = line.split("=").filter(String);
                    //console.log(kv);
                    if (types.indexOf(kv[0]) > -1){
                        bibEntry.type = kv[0];
                        bibEntry.key = kv[1];
                    } else {
                        switch(kv[0]){
                            case "title":
                                bibEntry.title = kv[1];
                                break;
                            case "author":
                                bibEntry.author = kv[1];
                                break;
                            case "journal":
                                bibEntry.journal = kv[1];
                                break;
                            case "url":
                                bibEntry.url = kv[1];
                                break;
                            case "year":
                                bibEntry.year = parseInt(kv[1], 10);
                                break;
                        }
                    }
                });
                if (bibEntry.key !== undefined) {
                    this.bibEntries.push(bibEntry);
                }
            });
        }
    }

    public CreateEntry(){
        var entry = new BibEntry();

        window.showQuickPick(types).then((selection)=>{
            entry.type = selection;
            
            window.showInputBox({prompt:"Bib Key"}).then((key)=>{
                entry.key = key;

                window.showInputBox({prompt:"Title"}).then((title)=>{
                    entry.title = title;

                    window.showInputBox({prompt:"Author(s)"}).then((author)=>{
                        entry.author = author;

                        window.showInputBox({prompt:"Journal"}).then((journal)=>{
                            entry.journal = journal;

                            window.showInputBox({prompt:"year"}).then((year)=>{
                                entry.year = parseInt(year, 10);

                                this.bibEntries.push(entry);
                                this.updateBibFile();
                            });
                        });
                    });
                });
            });
        });
    }
    public DeleteEntry(){
        var keys = [];
        this.bibEntries.forEach(entry => {
            keys.push(entry.key);
        });

        window.showQuickPick(keys).then((selection)=>{
            console.log(this.bibEntries);

            if (selection !== undefined || selection !== ""){
                this.bibEntries.forEach((entry, i)=>{
                    if(selection === entry.key){
                    }
                });
            }

            console.log(this.bibEntries);
            //this.updateBibFile();
        });
    } 
    public SortEntries(sortType : SortType) {
        let doc = window.activeTextEditor.document;
        console.log("Sorting Entries");
            
        switch(sortType){
            case SortType.KeyAsc:
                this.bibEntries.sort(function(a,b){
                    var x = a.key.toLowerCase();
                    var y = b.key.toLowerCase();
                    if (x < y) { return -1; }
                    if (x > y) { return 1; }
                    return 0;
                });
                break;
            case SortType.KeyDsc:
                this.bibEntries.sort(function(a,b){
                    var x = a.key.toLowerCase();
                    var y = b.key.toLowerCase();
                    if (x > y) { return -1; }
                    if (x < y) { return 1; }
                    return 0;
                });
                break;
        }

        this.updateBibFile();
    }
    
    private sortByKeyAsc(a : BibEntry, b : BibEntry) : number{
        var x = a.key.toLowerCase();
        var y = b.key.toLowerCase();
        if (x < y) { return -1; }
        if (x > y) { return 1; }
        return 0;
    }
    private sortByKeyDsc(a :  BibEntry, b : BibEntry) : number {
        var x = a.key.toLowerCase();
        var y = b.key.toLowerCase();
        if (x > y) { return -1; }
        if (x < y) { return 1; }
        return 0;
    }
    
    updateBibFile(){
        var out = this.bibEntries.map(bibEntry=>{
        var {type, key, ...rest} = bibEntry;
        return `@${type}{${key},
        ${Object.keys(rest).map(
            (el)=>{return `${el}={${bibEntry[el]}}\n`;}
                )
            }
        }\n`;
        });
        
        var edit = new WorkspaceEdit();
        edit.replace(window.activeTextEditor.document.uri, new Range(0,0, window.activeTextEditor.document.lineCount, window.activeTextEditor.document.eol), out.toString());
        workspace.applyEdit(edit);
    }

    dispose(){
        //this._statusBarItem.dispose();
    }
}

class BibEntry{
    key : String;
    url : String;
    type : String;
    title : String;
    author : String;
    journal : String;
    year : number;
}

// this method is called when your extension is deactivated
export function deactivate() {
}