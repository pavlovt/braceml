# Svelte and SvelteKit support roadmap

This lists the Svelte 5 and SvelteKit features that BraceML doesn't support yet, the syntax
proposed for each one, what it touches and the order to do them in. It was written against
Svelte 5.57.3 and `@braceml/core` 0.4 by compiling one BraceML snippet per feature to
Svelte and then compiling that with `svelte/compiler`.

Each item follows AGENTS.md: spec in `docs/language.md`, a fixture in `spec/fixtures/`, then
the parser, with `docs/llms.txt` kept in sync.

Columns: **svelte**, **html** and **react** are the targets. **fmt** is the formatter
(`format.ts`, also used by the Prettier plugin), **LS** the language server, **grammar** the
VS Code TextMate grammar. The HTML → BraceML converter reads plain HTML only, so none of
these change it.

## Already supported

No work is needed for these:

- Blocks: `if` / `else if` / `else`, `each` with index, key, `else` and array patterns
  (`as [k, v] (k)`), `each xs` without `as` when the collection is a name, `await` with
  `then` / `catch` and their shorthands, `key`, `snippet` (also typed parameters such as
  `row(a: string, b?: number)`, and snippets as component children).
- Special tags: `@render` (also `x?.()`), `@html`, `@const` (also `@const Icon = t.icon`
  for dynamic components), `@debug`.
- Attributes: expressions, spreads (`{...props}`, `...props`), `bind:` including
  `bind:this`, `bind:group`, `bind:files` and function bindings `bind:value={get, set}`,
  `class:`, `class` as an object or array, `style:` and `style:--var`, `--css-var` props on
  components, `use:`, `transition:` / `in:` / `out:` with parameters and `|global` /
  `|local`, `animate:`, event attributes, and legacy `on:` with modifiers.
- Special elements: `svelte:head`, `svelte:window`, `svelte:document`, `svelte:body`,
  `svelte:element`, `svelte:boundary` (with `failed` and `pending` snippets),
  `svelte:options`, and legacy `svelte:component`, `svelte:fragment`, `slot`, `slot=` and
  `let:`.
- Dotted component names such as `Table.Row` (with `allowUnknownTags`).
- `/* svelte-ignore … */` comments.
- Async Svelte (5.36): `await` in text (`p '{await load()}'`), in an `if` test and in an
  `each` collection; `$effect.pending()`.
- SvelteKit: `data-sveltekit-*` attributes, `use:enhance`, remote form functions spread with
  braces (`form {...createPost}`, `input {...createPost.fields.title.as('text')}`), and
  `<script module>` / `<style>`, which the preprocessor leaves untouched.

## 1. Attachments and small fixes (next minor release)

### 1.1 `{@attach}` (Svelte 5.29). Done, in the next release

```braceml
div {@attach tooltip(text)} 'Hover me'
canvas(
  width=320
  {@attach draw}
  {@attach resize(opts)}
)
```

`{@attach expr}` goes in the element head, like the Svelte-style spread `{...props}`. A
children block can never start with `@attach`, so `{` followed by `@attach` is read as an
attachment. An element may have several, and they may go inside `tag(` … `)`. On a
component, Svelte passes the attachment on as a prop, and BraceML prints it the same way.

| svelte | html | react | fmt | LS | grammar |
|---|---|---|---|---|---|
| prints `{@attach expr}` | error: Svelte only | error for now (see 4.3) | reprints the source slice; needs a test | `@attach` completion and hover after `{` in a head | scope it like a spread |

AST: a new attribute kind `{ kind: 'attach'; expression; loc }` in `ast.ts`.

### 1.2 A bare spread that calls a function

`input ...form.fields.title.as('text')` compiles, with no error, to
`<input {...form.fields.title.as} ('text')>`, which Svelte rejects. SvelteKit's remote form
functions are written this way. The bare form `...name` stops at `(`.

Fix: let the bare form continue through balanced `(…)` and `[…]`, so it reads
`a.b(c).d[e]`. Or, if that is too loose, report "wrap the expression in braces:
`{...a.b('x')}`". Parser only; a fixture covers both targets.

### 1.3 `>` followed by `@render`

```braceml
header.flex > @render languages()
```

`>` takes one child, and a snippet render is one child. Today it reports "Expected an
element or text after '>'". Allow `@render` (and `@html`) after `>`. Parser only; fmt keeps
the chain.

### 1.4 A better hint for `{name}` after attributes

`FieldInput {field} value={v}` reports "Text and expressions must be quoted, e.g.
'{field}'", which is the wrong fix for a Svelte user. When a children block holds only one
bare lower-case identifier, the hint suggests `field={field}` as well. Errors only.

## 2. `each` and `snippet` headers

### 2.1 Object patterns in `each`

```braceml
each items as { id, name } (id) {
  li '{name}'
}
each items as { id, tags: [first] }, i {
  li '{i}: {first}'
}
```

Today the header ends at the first `{`, so `as {` fails, and the spec says object patterns
aren't accepted. Proposed rule: a `{` directly after `as` starts the pattern, which runs to
its matching `}`. The children block is the next `{` after the pattern, index and key.

| svelte | html | react | fmt | LS | grammar |
|---|---|---|---|---|---|
| passes the header through | error (as now) | `.map(({ id, name }) => …)`; needs a test | header slice; test | none | the `each` header rule must not end at the pattern's `{` |

### 2.2 `each` without `as` over an expression in braces (Svelte 5.x)

```braceml
each { length: 3 }, i {
  Skeleton
}
```

`each xs { }` and `each xs, i { }` already work. A collection that starts with `{` doesn't:
"'each' requires an expression". Rule: when the header is empty and the next character is
`{`, read a balanced expression; it is the collection if another `{` (or `, i {`) follows.

The react target prints `collection.map(…)`, which fails at runtime for `{ length: 3 }`.
Without `as`, it should print `Array.from(collection, (_, i) => …)`.

### 2.3 Generic snippets

```braceml
snippet row<T>(item: T) {
  li '{item}'
}
```

Svelte accepts `{#snippet row<T>(item: T)}`. BraceML reports "'snippet' requires a signature
like name(args)". Accept `<…>` between the name and `(`. The react target prints snippets as
functions; in a `.tsx` file a generic arrow function needs `<T,>`.

## 3. Attribute shorthand `{name}`

Svelte writes `<img {src}>` for `src={src}`. In BraceML, `img {src}` means "img with a child
element `src`", and that rule (a `{` not after `=` opens the children) is the core of the
language, so the shorthand can't be accepted everywhere.

Proposal: accept `{name}` as a shorthand only inside `tag(` … `)`, where a `{` can't open
children and is an error today.

```braceml
img({src} {alt} loading=lazy)
```

Outside a group, keep the error and the hint from 1.4. This is a language decision, so it
comes after the items above and needs agreement first. The svelte target prints `{src}`;
html reports it like other expressions; react prints `src={src}`. LS and grammar need the
group rule.

## 4. Tooling

### 4.1 Type-checking templates

`svelte-check` doesn't run preprocessors, so it reports one parse error per file with a
`<template lang="braceml">` block, and templates get no type errors (playground bug 4,
brace-cms). Proposal: `braceml check`, which compiles each `.svelte` file's BraceML block to
a mirror directory, runs `svelte-check` on the mirror and maps each diagnostic back through
the existing source maps. Every new construct above needs source map coverage for this to
point at the right place.

### 4.2 Expressions in the language server

Expressions in templates get no completion or hover. Once 4.1 exists, the language server
can ask the Svelte language tools about the compiled file and map positions back.

### 4.3 `{@attach}` in the react target

React 19 ref callbacks have the same shape as an attachment (they get the element and may
return a cleanup), so `div {@attach fn}` could print `ref={fn}`. An element has one ref, so
several attachments, or an attachment with `bind:this`, would need a merged callback.

## Not planned

- `@const` directly inside an element: Svelte only allows it inside blocks, snippets and
  components, and BraceML passes Svelte's error through.
- Legacy Svelte 4 syntax beyond what already passes through. `$:`, `export let` and
  stores live in `<script>`, which BraceML doesn't touch.

## Order

1. 1.1 `{@attach}`, with 1.2–1.4 in the same minor release.
2. 2.1–2.3, one fixture each.
3. 3, after the syntax is agreed.
4. 4.1, then 4.2 and 4.3.
