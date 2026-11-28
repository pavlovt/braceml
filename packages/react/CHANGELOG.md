# @braceml/react

## 0.5.0

### Minor Changes

- f0b7d21: Support Svelte attachments: `div {@attach tooltip(text)}` in an element head, several per element and inside `tag(` … `)`. The html and react targets report them as Svelte-only. The language server offers `{@attach}` as an attribute.

### Patch Changes

- Updated dependencies [f0b7d21]
  - @braceml/core@0.5.0

## 0.4.0

### Patch Changes

- @braceml/core@0.4.0

## 0.3.0

### Minor Changes

- f74fa82: Add the React target: `` braceml`…` `` templates in `.jsx` and `.tsx` files, a Vite plugin, and `-t react` in the CLI.
- 6e5f91f: Add a formatter (`braceml fmt`), an HTML converter (`braceml convert`), a Prettier plugin and source maps for the Svelte preprocessor and the React Vite plugin. The language server now works in `.jsx` and `.tsx` templates and can format documents. Multi-line text in `pre` and `textarea` no longer gains indentation.

### Patch Changes

- Updated dependencies [6e5f91f]
  - @braceml/core@0.3.0
