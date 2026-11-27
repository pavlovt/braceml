# BraceML issues found by the playground

Each bug becomes a fixture in `spec/fixtures` before it is fixed (see AGENTS.md).

## Open

### 1. Dotted component names compile to a class

`Tabs.Root value="a" { }` compiles, with no error, to `<Tabs class="Root" value="a" />`.
shadcn-svelte and Bits UI document their components this way (`Tabs.Root`, `Select.Item`),
so this is the first thing a shadcn user writes. The playground imports `Tabs`, `TabsList`
and so on instead.

Expected: either support member components (an upper-case tag followed by `.Upper`) or
report an error. The spec (2.1 Selector) doesn't mention them.

### 2. A quote inside a text expression ends the text silently

```
code '{a ? `x` : ''}'
```

The `'` inside `{…}` closes the text, as the spec (3. Text) says, but BraceML reports no
error. Svelte then fails on the generated markup with "Unterminated regular expression",
pointing at code the user never wrote. The playground uses double-quoted text there.

Expected: the lexer skips quotes inside `{…}` in text, or reports an unbalanced `{` in
the text at the BraceML position.

### 3. Text next to an inline element gets an extra space

```
p {
  'No closing tags, and '
  strong 'text is always quoted'
  '.'
}
```

The HTML and Svelte output put each child on its own line, so the browser shows
"text is always quoted ." with a space before the period. Text written as `'.'` should
not gain whitespace. This affects every sentence that mixes text and inline elements,
including translated messages next to links.

Expected: no whitespace is added between text and inline siblings.

### 4. No type-checking for BraceML templates

`svelte-check` parses `<template lang="braceml">` as Svelte and reports
`Expected token }` in every file, instead of type-checking it (docs/svelte.md documents
this). An app written in BraceML gets no template type errors at all, so the playground
has no `check` step in CI.

Expected: a `braceml check` (or a svelte-check integration) that preprocesses each file
and maps errors back to the template.

## Not BraceML

- Svelte's style preprocessing matches a `<style>` tag inside a JavaScript string in
  `<script>` and rewrites it. The preview builds its document without a `<style>` tag.
