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
    console.log('Congratulations, your extension "BibtexSorter" is now active!');

    let bibManager = new BibManager();

    let sortKeyAscending = commands.registerTextEditorCommand('extension.sortKeyAsc',()=>{
        bibManager.SortEntries(SortType.KeyAsc);
        window.showInformationMessage('Sorting By Key in Ascending Order');
    });
    let sortKeyDescending = commands.registerTextEditorCommand('extension.sortKeyDsc',()=> {
        bibManager.SortEntries(SortType.KeyDsc);
        window.showInformationMessage('Sorting By Key in Descending Order');
    });

    context.subscriptions.push(
        sortKeyAscending,
        sortKeyDescending
    );
}

class BibManager{

    bibEntries: BibEntry[] = [];

    constructor(){
        this.updateBibList();
    }

    updateBibList(){
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

    public SortEntries(sortType : SortType) {
        this.updateBibList();

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