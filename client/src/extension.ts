import * as path from 'path';

import {
	window,
	commands,
	workspace,
	ExtensionContext,
	CodeAction,
	ProviderResult,
	Diagnostic,
	CodeActionContext
} from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	Command,
} from 'vscode-languageclient';

import {
	BibManager,
	SortType
} from './BibManager';
import { BibTexEntriesProvider } from './BibTexEntriesProvider';

let client: LanguageClient;


export function activate(context: ExtensionContext) {
	let bibManager: BibManager = BibManager.Instance;

	bibManager.UpdateBibList().then(() => {
		const rootPath = workspace.workspaceFolders && workspace.workspaceFolders.length > 0 ? workspace.workspaceFolders[0].uri.fsPath : undefined;
		const bibTexEntriesProvider = new BibTexEntriesProvider(rootPath);
		window.registerTreeDataProvider('bibTexEntries', bibTexEntriesProvider);
		commands.registerCommand('bibTexEntries.refreshEntry', () => bibTexEntriesProvider.refresh());
	});

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
			configurationSection: 'bibtexManager',
			fileEvents: workspace.createFileSystemWatcher('**/*.bib')
		},
		diagnosticCollectionName: 'BibTeX',
		initializationFailedHandler: (error) => {
			client.error('Server Initialization Failed.', error);
			client.outputChannel.show(true);
			return false;
		},
		middleware: {
			/*provideCodeActions: (document, range, context, token, next): ProviderResult<(Command | CodeAction)[]> => {
				if (!context.diagnostics || context.diagnostics.length === 0) {
					return [];
				}
				let bibTeXDiagnostics: Diagnostic[] = [];
				for (let diagnostic of context.diagnostics) {
					if (diagnostic.source === 'BibTeX') {
						bibTeXDiagnostics.push(diagnostic);
					}
				}
				if (bibTeXDiagnostics.length === 0) {
					return [];
				}
				let newContext: CodeActionContext = Object.assign({}, context, { diagnostics: bibTeXDiagnostics } as CodeActionContext);
				return next(document, range, newContext, token);
			}*/
		}
	};

	client = new LanguageClient(
		'bibManagerServer',
		'BibTeX Language Server',
		serverOptions,
		clientOptions
	);

	client.registerProposedFeatures();
	client.onReady().then(() => {

	});

	let sortKeyAscending = commands.registerTextEditorCommand('extension.sortKeyAsc', () => {
		bibManager.SortEntries(SortType.KeyAsc);
		window.showInformationMessage('Sorting By Key in Ascending Order');
	});
	let sortKeyDescending = commands.registerTextEditorCommand('extension.sortKeyDsc', () => {
		bibManager.SortEntries(SortType.KeyDsc);
		window.showInformationMessage('Sorting By Key in Descending Order');
	});

	let sortTitleAscending = commands.registerTextEditorCommand('extension.sortTitleAsc', () => {
		bibManager.SortEntries(SortType.TitleAsc);
		window.showInformationMessage('Sorting By Key in Ascending Order');
	});
	let sortTitleDescending = commands.registerTextEditorCommand('extension.sortTitleDsc', () => {
		bibManager.SortEntries(SortType.TitleDsc);
		window.showInformationMessage('Sorting By Key in Descending Order');
	});

	context.subscriptions.push(
		client.start(),
		sortKeyAscending,
		sortKeyDescending,
		sortTitleAscending,
		sortTitleDescending
	);
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}

	return client.stop();
}