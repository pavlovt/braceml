# @braceml/core

## 0.5.0

### Minor Changes

- f0b7d21: Support Svelte attachments: `div {@attach tooltip(text)}` in an element head, several per element and inside `tag(` … `)`. The html and react targets report them as Svelte-only. The language server offers `{@attach}` as an attribute.

## 0.4.0

No changes in this release.

## 0.3.0

### Minor Changes

- 6e5f91f: Add a formatter (`braceml fmt`), an HTML converter (`braceml convert`), a Prettier plugin and source maps for the Svelte preprocessor and the React Vite plugin. The language server now works in `.jsx` and `.tsx` templates and can format documents. Multi-line text in `pre` and `textarea` no longer gains indentation.

## 0.2.0

### Minor Changes

- 0bb847b: Add a language server with diagnostics, completion and hover. `BraceMLError` now has a `reason` property that holds the message without the position and code frame.
