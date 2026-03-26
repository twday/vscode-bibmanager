import {
	TreeDataProvider,
	EventEmitter,
	Event,
	TreeItem,
	window,
	TreeItemCollapsibleState
} from 'vscode';
import BibEntry from './BibEntry';
import { BibEntryTreeItem, BibEntryType } from './BibEntryTreeItem';
import { BibManager } from './BibManager';


export class BibTexEntriesProvider implements TreeDataProvider<BibEntryTreeItem>{
	private _onDidChangeTreeData: EventEmitter<BibEntryTreeItem> = new EventEmitter<BibEntryTreeItem>();
	readonly onDidChangeTreeData?: Event<BibEntryTreeItem> = this._onDidChangeTreeData.event;

	private bibManager: BibManager = BibManager.Instance;
	private searchTerm: string | undefined = undefined;

	constructor(private workspaceRoot: string) { }

	setSearchTerm(term: string | undefined) {
		this.searchTerm = term ? term.trim().toLowerCase() : undefined;
		this._onDidChangeTreeData.fire(undefined);
	}
	clearSearch() {
		this.searchTerm = undefined;
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: BibEntryTreeItem): TreeItem {
		return element;
	}

	getChildren(element?: BibEntryTreeItem): Thenable<BibEntryTreeItem[]> {
		if (!this.workspaceRoot) {
			window.showInformationMessage('No BibTex entries');
			return Promise.resolve([]);
		}

		if (element) {
			if (element.type === BibEntryType.file) {
				let entries = element.entries;
				if (this.searchTerm) {
					entries = entries.filter(e =>
						(e.key && e.key.toLowerCase().includes(this.searchTerm!)) ||
						(e.title && e.title.toLowerCase().includes(this.searchTerm!)) ||
						(e.author && e.author.toLowerCase().includes(this.searchTerm!))
					);
				}
				return Promise.resolve(this.getEntriesInFile(entries));
			}
		} else {
			if (this.bibManager.Entries.size > 0) {
				let files = this.getEntryFilesInManager(this.bibManager.Entries);
				if (this.searchTerm) {
					// Only show files that have at least one matching entry
					files = files.filter(fileItem => {
						const entries = fileItem.entries;
						return entries.some(e =>
							(e.key && e.key.toLowerCase().includes(this.searchTerm!)) ||
							(e.title && e.title.toLowerCase().includes(this.searchTerm!)) ||
							(e.author && e.author.toLowerCase().includes(this.searchTerm!))
						);
					});
				}
				return Promise.resolve(files);
			} else {
				window.showInformationMessage('Workspace has no BibTex Files');
				return Promise.resolve([]);
			}
		}
		return Promise.resolve([]);
	}

	refresh(): void {
		this.bibManager.UpdateBibList().then(() => {
			this._onDidChangeTreeData.fire;
		});
	}

	private getEntriesInFile(entries: BibEntry[]): BibEntryTreeItem[] {
		let treeItems: BibEntryTreeItem[] = [];

		entries.forEach((entry, index) => {
			treeItems.push(new BibEntryTreeItem(
				entry.title || entry.key,
				index,
				BibEntryType.entries,
				entries,
				TreeItemCollapsibleState.None,
				entry.filePath,
				entry.lineNumber
			));
		});

		return treeItems;
	}

	private getEntryFilesInManager(bibDictionary: Map<string, BibEntry[]>,): BibEntryTreeItem[] {
		let treeItems: BibEntryTreeItem[] = [];

		bibDictionary.forEach((entries, key) => {
			treeItems.push(new BibEntryTreeItem(key, 0, BibEntryType.file, entries, TreeItemCollapsibleState.Collapsed));
		});

		return treeItems;
	}
}