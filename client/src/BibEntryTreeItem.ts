import {
	ThemeIcon,
	TreeItem,
	TreeItemCollapsibleState,
	Command
} from "vscode";
import BibEntry from "./BibEntry";
import * as path from "path";

export enum BibEntryType {
	file,
	entries
}

export class BibEntryTreeItem extends TreeItem {
	public readonly key?: string;

	constructor(
		public readonly label: string,
		public readonly index: number,
		public readonly type: BibEntryType,
		public readonly entries: BibEntry[],
		public readonly collapsibleState: TreeItemCollapsibleState,
		public readonly filePath?: string,
		public readonly lineNumber?: number
	) {
		super(label, collapsibleState);
		this.tooltip = this.generateTooltip();
		this.description = this.generateDescription();

		// Store the key for context menu operations
		if (type === BibEntryType.entries && entries && entries[index]) {
			this.key = entries[index].key;
			this.contextValue = 'bibEntry';
		} else if (type === BibEntryType.file) {
			this.contextValue = 'bibFile';
		}

		// Add click command for entry items
		if (type === BibEntryType.entries && filePath && lineNumber !== undefined) {
			this.command = {
				title: 'Go to Entry',
				command: 'bibTexEntries.goToEntry',
				arguments: [filePath, lineNumber]
			} as Command;
		}
	}

	private generateTooltip(): string {
		if (this.type === BibEntryType.entries && this.entries && this.entries[this.index]) {
			const entry = this.entries[this.index];
			const lines: string[] = [];

			lines.push(`Type: ${entry.type}`);
			lines.push(`Key: ${entry.key}`);
			if (entry.title) lines.push(`Title: ${entry.title}`);
			if (entry.author) lines.push(`Author: ${entry.author}`);
			if (entry.year) lines.push(`Year: ${entry.year}`);
			if (entry.journal) lines.push(`Journal: ${entry.journal}`);
			if (entry.booktitle) lines.push(`Booktitle: ${entry.booktitle}`);
			if (entry.publisher) lines.push(`Publisher: ${entry.publisher}`);
			if (entry.volume) lines.push(`Volume: ${entry.volume}`);
			if (entry.number) lines.push(`Number: ${entry.number}`);
			if (entry.pages) lines.push(`Pages: ${entry.pages}`);
			if (entry.url) lines.push(`URL: ${entry.url}`);

			return lines.join('\n');
		}
		return this.label;
	}

	private generateDescription(): string {
		if (this.type === BibEntryType.entries && this.entries && this.entries[this.index]) {
			const entry = this.entries[this.index];
			const parts: string[] = [];

			if (entry.author) parts.push(entry.author);
			if (entry.year) parts.push(`(${entry.year})`);

			return parts.join(' ');
		}
		return "";
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'book.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'book.svg')
	};
}