import * as path from 'path';
import {
    Range,
    window, 
    commands, 
    workspace, 
    WorkspaceEdit,
    ExtensionContext
} from 'vscode';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from 'vscode-languageclient';

var types = ['electronic', 'article', 'inproceedings', 'misc'];
enum SortType {
    KeyAsc,
    KeyDsc,
    TitleAsc,
    TitleDsc,
    AuthorAsc,
    AuthorDsc
}

let client: LanguageClient;

export function activate(context: ExtensionContext){
    let serverModule = context.asAbsolutePath(
        path.join('server', 'out', 'server.js')
    );

    let debugOptions = {
        execArgv: ['--nolazy', '--inspect=6009']
    };

    let serverOptions: ServerOptions = {
        run: {
            module: serverModule,
            transport: TransportKind.ipc
        },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    let clientOptions: LanguageClientOptions = {
        documentSelector: [
            {
                scheme: 'file',
                language: 'bibtex'
            }
        ],
        synchronize: {
            fileEvents: workspace.createFileSystemWatcher('**/*.bib')
        }
    };

    client = new LanguageClient(
        'bibManagerServer',
        'BibTeX Language Server',
        serverOptions,
        clientOptions
    );

    client.start();

    let bibManager = new BibManager();

    let sortKeyAscending = commands.registerTextEditorCommand('extension.sortKeyAsc',()=>{
        bibManager.SortEntries(SortType.KeyAsc);
        window.showInformationMessage('Sorting By Key in Ascending Order');
    });
    let sortKeyDescending = commands.registerTextEditorCommand('extension.sortKeyDsc',()=> {
        bibManager.SortEntries(SortType.KeyDsc);
        window.showInformationMessage('Sorting By Key in Descending Order');
    });

    let sortTitleAscending = commands.registerTextEditorCommand('extension.sortTitleAsc',()=>{
        bibManager.SortEntries(SortType.TitleAsc);
        window.showInformationMessage('Sorting By Key in Ascending Order');
    });
    let sortTitleDescending = commands.registerTextEditorCommand('extension.sortTitleDsc',()=> {
        bibManager.SortEntries(SortType.TitleDsc);
        window.showInformationMessage('Sorting By Key in Descending Order');
    });

    context.subscriptions.push(
        sortKeyAscending,
        sortKeyDescending,
        sortTitleAscending,
        sortTitleDescending
    );
}

export function deactivate(): Thenable<void> | undefined {
    if(!client){
        return undefined;
    }

    return client.stop();
}

class BibManager{

    bibEntries: BibEntry[] = [];

    constructor(){
        this.UpdateBibList();
    }

    ResetBibList(){
        this.bibEntries = [];
    }

    UpdateBibList(){
        this.ResetBibList();
        let doc = window.activeTextEditor.document;

        var regex = /[\t{},]*/g;
        var whitespace = /[\s]*/g;
        
        if (doc.languageId === "bibtex"){
            //this._statusBarItem.show();
            let docContent = doc.getText();
    
            let entries = docContent.split("@");
    
            entries.forEach(entry => {
                var bibEntry = new BibEntry();
                entry.split("\n").forEach(line => {
                    line = line.replace("=","");
                    line = line.replace("{","=");
                    line = line.replace(regex, "");
                    //console.log(line);
                    var kv = line.split("=").filter(String);
                    //console.log(kv);
                    if (types.indexOf(kv[0]) > -1){
                        bibEntry.type = kv[0];
                        bibEntry.key = kv[1];
                    } else {
                        if (kv[0] !== undefined){
                            var key = kv[0].replace(whitespace, "");
                            switch(key){
                                case "title":
                                    bibEntry.title = kv[1];
                                    break;
                                case "author":
                                    bibEntry.author = kv[1];
                                    break;
                                case "journal":
                                    bibEntry.journal = kv[1];
                                    break;
                                case "booktitle":
                                    bibEntry.booktitle = kv[1];
                                    break;
                                case "publisher":
                                    bibEntry.publisher = kv[1];
                                    break;
                                case "number": 
                                    bibEntry.number = kv[1];
                                    break;
                                case "volume":
                                    bibEntry.volume = parseInt(kv[1], 10);
                                    break;
                                case "url":
                                    bibEntry.url = kv[1];
                                    break;
                                case "year":
                                    bibEntry.year = parseInt(kv[1], 10);
                                    break;
                                case "organization":
                                    bibEntry.organization = kv[1];
                                    break;
                            }
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
        this.UpdateBibList();

        let doc = window.activeTextEditor.document;
            
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
            case SortType.TitleAsc:
                this.bibEntries.sort(function(a,b){
                    var x = a.title.toLowerCase();
                    var y = b.title.toLowerCase();
                    if (x < y) { return -1; }
                    if (x > y) { return 1; }
                    return 0;
                });
                break;
            case SortType.TitleDsc:
                this.bibEntries.sort(function (a, b) {
                    var x = a.title.toLowerCase();
                    var y = b.title.toLowerCase();
                    if (x > y) { return -1; }
                    if (x < y) { return 1; }
                    return 0;
                });
                break;
        }

        this.UpdateBibFile();
    }
    
    UpdateBibFile(){
        var out = this.bibEntries.map(bibEntry=>{
        var {type, key, ...rest} = bibEntry;

        return `@${type}{${key},\n${Object.keys(rest).map((el)=>{return `\t${el}={${bibEntry[el]}}\n`;})}}\n`;});
        
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
    type : String;
    title : String;
    author : String;
    journal : String;
    booktitle : String;
    pages : String;
    number : String;
    volume : number;
    year : number;
    url : String;
    publisher : String;
    organization : String;
}