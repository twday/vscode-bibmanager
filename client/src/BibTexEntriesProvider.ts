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

	constructor(private workspaceRoot: string) { }

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
				return Promise.resolve(
					this.getEntriesInFile(element.entries)
				);
			} else if (element.type === BibEntryType.entries) {
				return Promise.resolve(
					this.getInformationInEntry(element.entries[element.index])
				);
			}
		} else {
			if (this.bibManager.Entries.size > 0) {
				return Promise.resolve(this.getEntryFilesInManager(this.bibManager.Entries));
			} else {
				window.showInformationMessage('Workspace has no BibTex Files');
				return Promise.resolve([]);
			}
		}
	}

	refresh(): void {
		this.bibManager.UpdateBibList().then(() => {
			this._onDidChangeTreeData.fire;
		});
	}

	private getInformationInEntry(entry: BibEntry): BibEntryTreeItem[] {
		let treeItems: BibEntryTreeItem[] = [];

		for (var prop in entry) {
			if (entry[prop] !== undefined) {
				treeItems.push(new BibEntryTreeItem(`${prop}: ${entry[prop]}`, 0, BibEntryType.entry, undefined, TreeItemCollapsibleState.None));
			}
		}

		return treeItems;
	}

	private getEntriesInFile(entries: BibEntry[]): BibEntryTreeItem[] {
		let treeItems: BibEntryTreeItem[] = [];

		entries.forEach((entry, index) => {
			treeItems.push(new BibEntryTreeItem(entry.title, index, BibEntryType.entries, entries, TreeItemCollapsibleState.Collapsed));
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