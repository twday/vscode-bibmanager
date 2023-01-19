import {
	ThemeIcon,
	TreeItem,
	TreeItemCollapsibleState,
} from "vscode";
import BibEntry from "./BibEntry";
import * as path from "path";

export enum BibEntryType {
	file,
	entries,
	entry
}

export class BibEntryTreeItem extends TreeItem {
	constructor(
		public readonly label: string,
		public readonly index: number,
		public readonly type: BibEntryType,
		public readonly entries: BibEntry[],
		public readonly collapsibleState: TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.tooltip = `${this.label}`;

		switch (type) {
			case BibEntryType.entry:
			case BibEntryType.file:
				this.description = "";
				break;
			case BibEntryType.entries:
				this.description = entries[index].author;
				break;
		}
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'book.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'book.svg')
	};
}