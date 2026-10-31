# BraceML for VS Code

Syntax highlighting and snippets for [BraceML](https://github.com/pavlovt/braceml).

- `.braceml` files
- `<template lang="braceml">` blocks inside `.svelte` files (works together with the official Svelte extension)
- Snippets: `if`, `ife`, `each`, `await`, `snippet`, `el`, `template-braceml`

## Develop

Open this folder in VS Code and press <kbd>F5</kbd> to start an Extension Development Host.

## Package / publish

```sh
npx @vscode/vsce package     # creates braceml-vscode-0.1.0.vsix
npx @vscode/vsce publish     # needs a Marketplace publisher "pavlovt" and a token
```
