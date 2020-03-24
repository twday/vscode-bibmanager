import{
    createConnection,
    TextDocument,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
} from 'vscode-languageserver';
import { connect } from 'http2';


let connection = createConnection(ProposedFeatures.all);
let documents: TextDocuments = new TextDocuments();
let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticsRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;

    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );

    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    hasDiagnosticsRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                resolveProvider: true
            }
        }
    };
});

connection.onInitialized(() => {
    if (hasConfigurationCapability){
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability){
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received');
        });
    }
});

interface BibManagerSettings {
    maxNumberOfProblems: number;
}

const defaultSettings: BibManagerSettings = {maxNumberOfProblems: 1000};
let globalSettings: BibManagerSettings = defaultSettings;

let documentSettings: Map<string, Thenable<BibManagerSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability){
        documentSettings.clear();
    } else {
        globalSettings = <BibManagerSettings>(
            (change.settings.bibManagerServer || defaultSettings)
        );
    }

    documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<BibManagerSettings>{
    if (!hasConfigurationCapability){
        return Promise.resolve(globalSettings);
    }
    
    let result = documentSettings.get(resource);
    if (!result){
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'bibManagerServer'
        });
        documentSettings.set(resource, result);
    }

    return result;
}

documents.onDidClose((e: { document: { uri: string; }; }) => {
    documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent((change: { document: TextDocument; }) => {
    connection.console.log("onDidChangeContent-Fired");
    validateTextDocument(change.document);
    connection.console.log("onDidChangeContent-End");
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    connection.console.log("Getting Settings");
    let settings = await getDocumentSettings(textDocument.uri);
    connection.console.log("Settings Retreived");

    let text = textDocument.getText();
    connection.console.log(text);
    let pattern = /@\w*{\w*,\n?(\t\w*(=|:)("|{)\w*("|}),\n?)*}/gmi;
    let m: RegExpExecArray | null;

    let problems = 0;
    let diagnostics: Diagnostic[] = [];
    connection.console.log(pattern.test(text)+"");
    while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems){
        problems++;
        let diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Warning,
            range: {
                start: textDocument.positionAt(m.index),
                end: textDocument.positionAt(m.index + m[0].length)
            },
            message: '${m[0]} is all uppercase',
            source: 'ex'
        };
        if (hasDiagnosticsRelatedInformationCapability){
            diagnostic.relatedInformation = [
                {
                    location: {
                        uri: textDocument.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: 'Spelling matters'
                },
                {
                    location: {
                        uri: textDocument.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: 'Particularly for names'
                }
            ];
        }
        diagnostics.push(diagnostic);
    }

    connection.sendDiagnostics({
        uri: textDocument.uri,
        diagnostics
    });
}

// Monitored files changed in VSCode
connection.onDidChangeWatchedFiles(_change => {
    connection.console.log('We received a file changed event');
});

// Provides initial list of completion items
connection.onCompletion(
    (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
        return [
            {
                label: 'entry',
                kind: CompletionItemKind.Snippet,
                data: 0
            },
            {
                label: 'author',
                kind: CompletionItemKind.Snippet,
                data: 1
            },
            {
                label: 'journal',
                kind: CompletionItemKind.Snippet,
                data: 2
            },
            {
                label: 'year',
                kind: CompletionItemKind.Snippet,
                data: 3
            },
            {
                label: 'title',
                kind: CompletionItemKind.Snippet,
                data: 4
            },
            {
                label: 'booktitle',
                kind: CompletionItemKind.Snippet,
                data: 5
            },
            {
                label: 'pages',
                kind: CompletionItemKind.Snippet,
                data: 6
            },
            {
                label: 'number',
                kind: CompletionItemKind.Snippet,
                data: 7
            },
            {
                label: 'volume',
                kind: CompletionItemKind.Snippet,
                data: 8
            },
            {
                label: 'url',
                kind: CompletionItemKind.Snippet,
                data: 9
            },
            {
                label: 'publisher',
                kind: CompletionItemKind.Snippet,
                data: 10
            },
            {
                label: 'organization',
                kind: CompletionItemKind.Snippet,
                data: 11
            }
        ];
    }
);

// Handles additional information for item selected in completion list
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        switch (item.data){
            case 0:
                item.detail = 'BibTeX Entry';
                item.documentation = 'An entry in a BibTex file';
                break;
            case 1:
                item.detail = 'Author';
                item.documentation = 'The Author of the citation';
                break;
            case 2:
                item.detail = 'Journal';
                item.documentation = 'Journal that the citation is from';
                break;
            case 3:
                item.detail = 'Year';
                item.documentation = 'Year of the citation';
                break;
            case 4:
                item.detail = 'Title';
                item.documentation = 'Title of the citation';
                break;
            case 5:
                item.detail = 'Book Title';
                item.documentation = 'Title of the book the citation is from';
                break;
            case 6:
                item.detail = 'Pages';
                item.documentation = 'Page number(s) of the citation';
                break;
            case 7:
                item.detail = 'Number';
                item.documentation = '';
                break;
            case 8:
                item.detail = 'Volume';
                item.documentation = 'Volume of the journal/book';
                break;
            case 9:
                item.detail = 'URL';
                item.documentation = 'URL of the citation';
                break;
            case 10:
                item.detail = 'Publisher';
                item.documentation = 'Citation Publisher';
                break;
            case 11:
                item.detail = 'Organization';
                item.documentation = 'Organization that runs the Conference/Journal';
                break;
        }

        return item;
    }
);


/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.textDocument.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.textDocument.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/


documents.listen(connection);

connection.listen();