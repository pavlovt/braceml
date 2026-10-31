# @braceml/language-server

## 0.3.0

### Minor Changes

- 6e5f91f: Add a formatter (`braceml fmt`), an HTML converter (`braceml convert`), a Prettier plugin and source maps for the Svelte preprocessor and the React Vite plugin. The language server now works in `.jsx` and `.tsx` templates and can format documents. Multi-line text in `pre` and `textarea` no longer gains indentation.

### Patch Changes

- Updated dependencies [f74fa82]
- Updated dependencies [6e5f91f]
  - @braceml/react@0.3.0
  - @braceml/core@0.3.0

## 0.2.0

### Minor Changes

- 0bb847b: Add a language server with diagnostics, completion and hover. `BraceMLError` now has a `reason` property that holds the message without the position and code frame.

### Patch Changes

- Updated dependencies [0bb847b]
  - @braceml/core@0.2.0
