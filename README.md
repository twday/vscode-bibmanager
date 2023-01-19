#

[![BibTex Manager](https://raw.githubusercontent.com/twday/vscode-bibmanager/master/images/bibmanager-icon.png)](https://github.com/twday/vscode-bibmanager)

[!["Version"](https://vsmarketplacebadge.apphb.com/version-short/twday.bibmanager.svg)](https://marketplace.visualstudio.com/items?itemName=twday.bibmanager)

[!["Installs"](https://vsmarketplacebadge.apphb.com/installs-short/twday.bibmanager.svg)](https://marketplace.visualstudio.com/items?itemName=twday.bibmanager)

[!["Rating"](https://vsmarketplacebadge.apphb.com/rating-short/twday.bibmanager.svg)](https://marketplace.visualstudio.com/items?itemName=twday.bibmanager)

-------------------------------------------------------------
[BibManager](https://github.com/twday/vscode-bibmanager) is an Open-Source extension for Visual Studio Code. It provides code snippets to make creating BibTeX entries faster, and allows you to sort bibliographies.

## Features

### Code Snippets

![Code Snippets](images/features/codesnippets.gif)

<!--
### Sorting Bibliography
Sorting by Key in ascending order:

![Sorting by Key (Ascending order)](images/features/sortKeyAsc.gif)

Sorting by key in descending order:

![Sorting by Key (Descending order)](images/features/sortKeyDsc.gif)

Sorting by title in ascending order:

![Sorting by Title (Ascending order)](images/features/sortTitleAsc.gif)

Sorting by title in descending order:

![Sorting by Title (Descending order)](images/features/sortTitleDsc.gif)
-->

## Requirements

This extension does not require any additional extensions to be installed.

## Extension Settings

This extension does not currently include any settings.

## Known Issues

+ Code snippets only activate when inside a reference declaration, i.e. inside @article{}
+ Sorting places comma at start of each line (Known issue with typescript String literals)

## Release Notes

### 2.1.0

Added Tree View to Explorer panel

### 2.0.0

Added Intellisense and Linting

### 1.0.3

Disabled Sorting temporarily

### 1.0.2

Updated code snippets

### 1.0.1

Updated extension name
Removed unnecessary information messages

### 1.0.0

Initial release of BibManager
Features

+ Code Snippets
+ Sorting references by Key
  + Ascending order
  + Descending Order
+ Sorting references by Title
  + Ascending Order
  + Descending Order
