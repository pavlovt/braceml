# BraceML for VS Code

Language support for [BraceML](https://github.com/pavlovt/braceml) in VS Code 1.91 or later.

- Works in `.braceml` files and `<template lang="braceml">` blocks inside `.svelte` files
- Syntax highlighting
- Errors while you type, plus warnings for code that compiles but doesn't do what it looks like
- Completion for elements, blocks, `@` tags, attributes, directives and imported components
- Hover help for block keywords and `@` tags
- Snippets: `if`, `ife`, `each`, `await`, `snippet`, `el`, `template-braceml`

## Settings

- `braceml.allowUnknownTags`: accept any lower-case tag name. Match the `allowUnknownTags` option of your compiler.

## With the Svelte extension

The Svelte extension can't parse BraceML, so it shows a false `Expected token }` error in each file with a
BraceML block. See [Editor support](https://github.com/pavlovt/braceml/blob/main/docs/svelte.md#4-optional-editor-support)
for the setting that turns it off.

## Develop

Run `pnpm build` in this folder, then open it in VS Code and press <kbd>F5</kbd> to start an Extension
Development Host.

## Package / publish

```sh
npx @vscode/vsce package --no-dependencies     # creates braceml-vscode-0.1.0.vsix
npx @vscode/vsce publish     # needs a Marketplace publisher "pavlovt" and a token
```
