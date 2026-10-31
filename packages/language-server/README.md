# @braceml/language-server

A [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) server for
[BraceML](https://github.com/pavlovt/braceml). It works in `.braceml` files and in
`<template lang="braceml">` blocks inside `.svelte` files.

The [VS Code extension](https://github.com/pavlovt/braceml/tree/main/editors/vscode) includes it,
so VS Code users don't need to install anything else.

## Features

- **Diagnostics while typing:** the compiler's own errors, plus warnings for code that compiles
  but doesn't do what it looks like, such as `Card {title}` and `.w-1.5`. The compiler stops at the
  first error, so each template shows one error at a time.
- **Completion:** elements, blocks, `@` tags, attributes and their values, events, Svelte
  directives, imported components, and snippet names after `@render`.
- **Hover:** syntax and the Svelte equivalent for block keywords and `@` tags.

JS expressions get no completion or diagnostics.

## Other editors

```sh
npm i -g @braceml/language-server
braceml-language-server --stdio
```

Use `braceml` as the language ID for `.braceml` files and `svelte` for `.svelte` files.

Pass `{ "allowUnknownTags": true }` as `initializationOptions` to accept any lower-case tag name,
matching the option of the same name in the compiler.

## Use from code

```js
import { getDiagnostics } from '@braceml/language-server';
```

`getDiagnostics`, `getCompletions` and `getHover` take a `TextDocument` from
`vscode-languageserver-textdocument`.
