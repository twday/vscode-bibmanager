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
    MarkupKind,
    InsertTextFormat,
    CodeAction,
    TextEdit,
    CodeActionKind,
    FormattingOptions,
    WorkspaceEdit,
    Position,
} from 'vscode-languageserver';

import citeDefinitions from './definitions.json';
import { ClientRequest } from 'http';

let connection = createConnection(ProposedFeatures.all);
let documents: TextDocuments = new TextDocuments();
let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDocumentOnTypeFormattingCapability: boolean = false;
let hasDiagnosticsRelatedInformationCapability: boolean = false;

let citeTypes: any = citeDefinitions;

let codeActions: CodeAction[] = [];

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

    hasDocumentOnTypeFormattingCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.formatting
    );

    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                resolveProvider: true,
            },
            codeActionProvider: true,
            documentOnTypeFormattingProvider: {
                firstTriggerCharacter: ",",
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

const defaultSettings: BibManagerSettings = {maxNumberOfProblems: 100};
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

connection.onDocumentOnTypeFormatting((params) => {
    let document = documents.get(params.textDocument.uri);
    let options: FormattingOptions = {
        tabSize: 1,
        insertSpaces: true,
        insertFinalNewline: true,
        trimTrailingWhitespace: false,
    };
    return [

    ];
});


function getDocumentSettings(resource: string): Thenable<BibManagerSettings>{
    if (!hasConfigurationCapability){
        return Promise.resolve(globalSettings);
    }
    
    let result = documentSettings.get(resource);
    if (!result){
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'bibtexManager'
        });
        documentSettings.set(resource, result);
    }
    
    return result;
}

documents.onDidClose((e: { document: { uri: string; }; }) => {
    documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent((change: { document: TextDocument; }) => {
    validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    let settings = await getDocumentSettings(textDocument.uri);

    let text = textDocument.getText();
    let citePattern = /(?:@(\w*){(\w*),\s*(?:(?:\s*\w*)(?:\s?=\s?)?(?:(?:"|{)?\w*(?:"|})?),?)*\s}?)/g;
    let citeQuery: RegExpExecArray | null;

    let problems = 0;
    let diagnostics: Diagnostic[] = [];
    while ((citeQuery = citePattern.exec(text)) && problems < settings.maxNumberOfProblems){
        let citeType = citeTypes.hasOwnProperty(citeQuery[1]);
        let citation = citeTypes[citeQuery[1]];
        if (!citeType){
            problems++;
            let citeDiagnostic : Diagnostic = {
                severity: DiagnosticSeverity.Error,
                range: {
                    start: textDocument.positionAt(citeQuery.index + 1),
                    end: textDocument.positionAt((citeQuery.index + 1)+ citeQuery[1].length),
                },
                message: citeQuery[1] + ' is not recognised',
                source: 'BibTeX'
            };
            if (hasDiagnosticsRelatedInformationCapability){
                citeDiagnostic.relatedInformation = [
                    {
                        location: {
                            uri: textDocument.uri,
                            range: Object.assign({}, citeDiagnostic.range)
                        },
                        message: 'This citation type is not supported'
                    }
                ];
            }
            diagnostics.push(citeDiagnostic);
        } else if (citeQuery[2].length === 0){
            let keyDiagnostic : Diagnostic = {
                severity: DiagnosticSeverity.Error,
                range: {
                    start: textDocument.positionAt(citeQuery.index + citeQuery[1].length + 1),
                    end: textDocument.positionAt((citeQuery.index + citeQuery[1].length + 1) + citeQuery[2].length),
                },
                message: 'Key is missing',
                source: 'BibTeX'
            };
            if (hasDiagnosticsRelatedInformationCapability){
                keyDiagnostic.relatedInformation = [
                    {
                        location: {
                            uri: textDocument.uri,
                            range: Object.assign({}, keyDiagnostic.range)
                        },
                        message: 'Key is missing from "' + citeQuery[1] + '"',
                    }
                ];
            }
            diagnostics.push(keyDiagnostic);
        }
        
        let fieldPattern = /(?:(\w*)\s+?=\s?(?:"|{|)(\w*)(?:"|}|))+/g;
        let fieldQuery: RegExpExecArray | null;
        while ((fieldQuery = fieldPattern.exec(citeQuery[0])) && problems < settings.maxNumberOfProblems){
            let fieldInEntry = citation.hasOwnProperty(fieldQuery[1]);
            if (!fieldInEntry){
                let fieldDiagnostic: Diagnostic = {
                    severity: DiagnosticSeverity.Information,
                    range: {
                        start: textDocument.positionAt(citeQuery.index + fieldQuery.index),
                        end: textDocument.positionAt(citeQuery.index + fieldQuery.index + fieldQuery[1].length),
                    },
                    message: fieldQuery[1] + ' not in Entry Type: @' + citeQuery[1] + '',
                    source: 'BibTeX'
                };
                if (hasDiagnosticsRelatedInformationCapability){
                    fieldDiagnostic.relatedInformation = [
                        {
                            location: {
                                uri: textDocument.uri,
                                range: Object.assign({}, fieldDiagnostic.range)
                            },
                            message: fieldQuery[1] + " is not a required or optional field for this type of citation"
                        }
                    ];
                }
                let fieldEdit : TextEdit[] = [
                    {
                        range: {
                            start: textDocument.positionAt(citeQuery.index + fieldQuery.index),
                            end: textDocument.positionAt(Number.MAX_VALUE)
                        },
                        newText: 'Test'
                    }
                ];
                diagnostics.push(fieldDiagnostic);
                let fieldAction: CodeAction = {
                    title: 'Remove Unnecessary Field',
                    kind: CodeActionKind.QuickFix,
                    diagnostics: [fieldDiagnostic],
                    edit: {
                        changes: {
                            textEdit: fieldEdit
                        }
                    }
                };
                codeActions.push(fieldAction);
            }
            if (fieldQuery[2].length === 0){
                let fieldValueDiagnostic: Diagnostic = {
                    severity: DiagnosticSeverity.Information,
                    range: {
                        start: textDocument.positionAt(citeQuery.index + fieldQuery.index),
                        end: textDocument.positionAt(Number.MAX_VALUE),
                    },
                    message: fieldQuery[1] + ' is empty',
                    source: 'BibTeX'
                };
                if (hasDiagnosticsRelatedInformationCapability){
                    fieldValueDiagnostic.relatedInformation = [
                        {
                            location: {
                                uri: textDocument.uri,
                                range: Object.assign({}, fieldValueDiagnostic.range)
                            },
                            message: fieldQuery[1] + " has no value."
                        }
                    ];
                }
                diagnostics.push(fieldValueDiagnostic);
                let fieldValueEdit : TextEdit[] = [
                    {
                        range: {
                            start: textDocument.positionAt(citeQuery.index + fieldQuery.index),
                            end: textDocument.positionAt(citeQuery.index + fieldQuery.index + fieldQuery[0].length)
                        },
                        newText: ''
                    }
                ];
                diagnostics.push(fieldValueDiagnostic);
                let fieldValueAction: CodeAction = {
                    title: 'Remove Empty Field',
                    kind: CodeActionKind.QuickFix,
                    diagnostics: [fieldValueDiagnostic],
                };
                codeActions.push(fieldValueAction);
            }
        }
    }
    
    connection.sendDiagnostics({
        uri: textDocument.uri,
        diagnostics
    });

}

connection.onCodeAction((params) => {
    //return codeActions;
	return [];
});

// Monitored files changed in VSCode
connection.onDidChangeWatchedFiles(_change => {
    connection.console.log('We received a file changed event');
});

// Provides initial list of completion items
connection.onCompletion(
    (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {

        let textDocument = documents.get(_textDocumentPosition.textDocument.uri);

        return getCompletionItems(textDocument, _textDocumentPosition.position);
    }
);

function getCompletionItems(textDocument : TextDocument | undefined, position : Position) : CompletionItem[]{
    let items : CompletionItem[] = [];
    let pattern = /(?:@(\w*){(\w*),\s*(?:(?:\s*\w*)(?:\s?=\s?)?(?:(?:"|{)?\w*(?:"|})?),?)*\s}?)/g;
    let query : RegExpExecArray | null;

    if (textDocument === undefined){
        return [];
    }

    while(query = pattern.exec(textDocument?.getText())){
        let validEntry = citeTypes.hasOwnProperty(query[1]);
        
        if (validEntry){
            let inRelevantBlock = (
                position.line > textDocument.positionAt(query.index).line &&
                position.line < textDocument.positionAt(query.index + query[0].length).line
            );
            if (inRelevantBlock){
                let entryName = query[1];
                let entryDef = citeTypes[query[1]];
                let fields = Object.getOwnPropertyNames(entryDef);
                fields.forEach((value, index) => {
                    let item : CompletionItem = {
                        label: value,
                        kind: CompletionItemKind.Snippet,
                        insertText: value + ' = {${1:' + value + '}}',
                        insertTextFormat: InsertTextFormat.Snippet,
                        data: {
                            'entry': entryName,
                            'field': value
                        }
                    };
                    items.push(item);
                });
            }
        }
    }

    return items;
}

// Handles additional information for item selected in completion list
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        
        let entry = citeTypes[item.data.entry];
        let field = entry[item.data.field];

        item.detail = item.data.value;

        let alternatives : string[] = [];

        if (field.alternatives.length > 0){
            field.alternatives.forEach((value : string) => {
                alternatives.push('+ ' + value);
            });
        } else {
            alternatives.push('N/A');
        }

        item.documentation = {
            kind: MarkupKind.Markdown,
            value: [
                'Required Field: ' + ((field.required) ? 'Yes' : 'No'),
                '\nAlternatives: ',
                ...alternatives,
            ].join('\n')
        };
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
