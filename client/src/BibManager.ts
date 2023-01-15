import {
	window,
	workspace,
	WorkspaceEdit,
	Range,
	TextDocument,
	commands
} from "vscode";
import BibEntry from "./BibEntry";
import * as path from "path";

export enum SortType {
	KeyAsc,
	KeyDsc,
	TitleAsc,
	TitleDsc,
	AuthorAsc,
	AuthorDsc
}

export class BibManager {
	private types = ['electronic', 'article', 'inproceedings', 'misc'];
	private bibDictionary: Map<string, BibEntry[]> = new Map<string, BibEntry[]>();

	private static instance: BibManager;

	private constructor() {
		this.UpdateBibList();
	}

	public get Entries(): Map<string, BibEntry[]> {
		return this.bibDictionary;
	}

	public static get Instance(): BibManager {
		if (!BibManager.instance) {
			BibManager.instance = new BibManager();
		}

		return BibManager.instance;
	}

	public async UpdateBibList() {
		var regex = /[\t{},]*/g;
		var whitespace = /[\s]*/g;

		var uris = await workspace.findFiles('**/*.bib');

		await Promise.all(uris.map(async (uri) => {
			var doc = await workspace.openTextDocument(uri);

			if (doc.languageId === "bibtex") {
				let docContent = doc.getText();
				let entries = docContent.split("@").filter((e) => e.trim() !== '' && e !== null);

				var bibEntries: BibEntry[] = [];
				await Promise.all(entries.map((entry) => {
					var bibEntry = new BibEntry();
					var lines = entry.split("\n");

					for (var line of lines) {
						line = line.replace("=", "");
						line = line.replace("{", "=");
						line = line.replace(regex, "");
						var kv = line.split("=").filter(String);
						if (this.types.indexOf(kv[0]) > -1) {
							bibEntry.type = kv[0];
							bibEntry.key = kv[1];
						} else {
							if (kv[0] !== undefined) {
								var key = kv[0].replace(whitespace, "");
								switch (key) {
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
					}

					if (bibEntry.key !== undefined) {
						bibEntries.push(bibEntry);
					}
				}));

				this.bibDictionary.set(path.basename(doc.fileName), bibEntries);
			}
		}));
	}

	public SortEntries(sortType: SortType) {
		var doc = window.activeTextEditor.document;

		if (doc.languageId === "bibtex") {
			this.UpdateBibList().then(() => {
				switch (sortType) {
					case SortType.KeyAsc:
						this.bibDictionary[doc.fileName].sort(function (a, b) {
							var x = a.key.toLowerCase();
							var y = b.key.toLowerCase();
							if (x < y) { return -1; }
							if (x > y) { return 1; }
							return 0;
						});
						break;
					case SortType.KeyDsc:
						this.bibDictionary[doc.fileName].sort(function (a, b) {
							var x = a.key.toLowerCase();
							var y = b.key.toLowerCase();
							if (x > y) { return -1; }
							if (x < y) { return 1; }
							return 0;
						});
						break;
					case SortType.TitleAsc:
						this.bibDictionary[doc.fileName].sort(function (a, b) {
							var x = a.title.toLowerCase();
							var y = b.title.toLowerCase();
							if (x < y) { return -1; }
							if (x > y) { return 1; }
							return 0;
						});
						break;
					case SortType.TitleDsc:
						this.bibDictionary[doc.fileName].sort(function (a, b) {
							var x = a.title.toLowerCase();
							var y = b.title.toLowerCase();
							if (x > y) { return -1; }
							if (x < y) { return 1; }
							return 0;
						});
						break;
				}

				this.UpdateBibFile(doc);
			});
		}
	}

	public UpdateBibFile(doc: TextDocument) {
		var out = this.bibDictionary[doc.fileName].map(bibEntry => {
			var { type, key, ...rest } = bibEntry;

			return `@${type}{${key},\n${Object.keys(rest).map((el) => { return `\t${el}={${bibEntry[el]}}\n`; })}}\n`;
		});

		var edit = new WorkspaceEdit();
		edit.replace(doc.uri, new Range(0, 0, window.activeTextEditor.document.lineCount, window.activeTextEditor.document.eol), out.toString());
		workspace.applyEdit(edit);
	}

	dispose() {
		//this._statusBarItem.dispose();
	}
}