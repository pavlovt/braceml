# BraceML Language Specification

**Version:** 0.1 (draft)

BraceML is a brace-based alternative syntax for HTML templates. It is derived from
[easy-html](https://github.com/pavlovt/easy-html): it keeps easy-html's core rule that
`{ }` wraps an element's children, the way SCSS wraps CSS rules. On top of that it adds
the control-flow blocks that component frameworks need.

A BraceML template is parsed once into a framework-neutral AST. **Targets** then print
the AST:

| Target   | Package           | Status       |
|----------|-------------------|--------------|
| `html`   | `@braceml/html`   | available    |
| `svelte` | `@braceml/svelte` | available    |
| `react`  | `@braceml/react`  | planned      |

---

## 1. Overview

```braceml
form onsubmit={save} {
  .form-group {
    label for=email 'Email address'
    input#email.form-control type=email bind:value={email}
  }

  if users.length == 0 {
    p.muted 'No users yet'
  } else {
    ul {
      each users as user (user.id) {
        li > a href="/users/{user.id}" '{user.name}'
      }
    }
  }

  button.btn.btn-primary type=submit 'Save'
}
```

## 2. Lexical rules

- Source is UTF-8. Line endings `\n` or `\r\n`.
- Whitespace and newlines between nodes are insignificant.
- **Inside an element head (section 3.1) a newline ends the head**, unless the
  attributes are wrapped in parentheses (section 3.3).
- Indentation has no meaning.

### 2.1 Comments

| Form          | Output                                      |
|---------------|---------------------------------------------|
| `// text`     | Removed. It is a source-only comment.       |
| `/* text */`  | Emitted as `<!-- text -->` (HTML/Svelte).   |

## 3. Elements

```
element  = head [ body ]
head     = selector [ attributes ]
body     = children | text | chain
children = "{" node* "}"
text     = string
chain    = ">" element
```

### 3.1 Selector

The selector is written like a CSS selector:

| Source                 | Meaning                                              |
|------------------------|------------------------------------------------------|
| `div`                  | `<div>`                                              |
| `.row`                 | `<div class="row">` (the tag defaults to `div`)      |
| `#main`                | `<div id="main">`                                    |
| `input#email.a.b`      | `<input id="email" class="a b">`                     |
| `svelte:head`          | Tag names may contain `:` and `-`.                   |
| `Card`, `UserList`     | A name starting with an upper-case letter is a component. |

Lower-case tag names must be known HTML, SVG or MathML elements, or custom elements
(names containing `-`). An unknown tag is an error. This catches the most common
mistake, `p {name}`, which would otherwise be a `<p>` with a `<name>` child. The
parser option `allowUnknownTags` turns the check off.

A class name in the selector may contain any character except whitespace and
`. # { } ' " ( ) = >`. This means Tailwind classes such as `md:flex`, `w-1/2` and
`hover:bg-red-500` work. A class that contains a dot (`w-1.5`) must go in a `class`
attribute instead.

### 3.2 Attributes

Attributes follow the selector and are separated by whitespace.

| Source                  | Kind                                               |
|-------------------------|----------------------------------------------------|
| `type=email`            | Unquoted value. It may not contain whitespace or `{ } ' " ( ) >`. |
| `placeholder="Enter email"` | Quoted value. Both `"` and `'` work.           |
| `href="/u/{user.id}"`   | Quoted value with interpolation (target-specific). |
| `disabled`              | Boolean attribute.                                 |
| `onclick={save}`        | Expression. The braces are balanced and JS strings are respected. |
| `...props`, `...{a}`, `{...props}` | Spread. The Svelte form `{...props}` is accepted because a children block can never start with `...`. |
| `bind:value={x}`, `class:active={on}`, `use:tooltip` | Directives are passed to the target as written. |
| `@click="go"`, `:title="t"`, `[value]="v"`, `(click)="go()"` | Framework attributes (Vue/Angular) are passed through unchanged. |

The rule that removes ambiguity: **`{` opens an expression only directly after `=`
(or after `...`). Anywhere else in a head, `{` opens the children block.**

The class attribute is merged with the selector classes, so `.a class="b"` becomes
`class="a b"`.

### 3.3 Multi-line heads

Wrap attributes in parentheses to spread them over several lines. The `(` must
directly follow the selector, with no whitespace in between:

```braceml
input.form-control(
  type=email
  placeholder="Enter email"
  bind:value={email}
)
```

`button (click)="go()"`, with a space before `(`, is an Angular attribute and not a
group.

### 3.4 Bodies

| Form                         | Meaning                       |
|------------------------------|-------------------------------|
| `div { ... }`                | Element with child nodes.     |
| `label 'Email'`              | A single text child.          |
| `li > a href=/ 'Home'`       | A single element child (chain). Chains may nest: `ul > li > a 'x'`. |
| `input type=text`            | No body: void or empty element. |
| `div {}`                     | Explicit empty element (easy-html style). |

## 4. Text

Text is always quoted: `'...'` or `"..."`. To use the same quote inside a string,
escape it (`'Don\'t'`), or switch quotes (`"Don't"`). `\\` is a backslash.

Text is emitted **as is**, so it may contain entities (`&nbsp;`) and inline markup.
In the Svelte target, `{expr}` inside text is a Svelte expression:

```braceml
p 'Hello, {user.name}!'
```

## 5. Control flow

A keyword starts a block only at the start of a node and only when it is followed by
whitespace. A block's header expression runs up to the first `{` that is not nested
in `()`, `[]` or a string.

### 5.1 if

```braceml
if loading {
  Spinner
} else if error {
  p.error '{error.message}'
} else {
  Results items={items}
}
```

### 5.2 each

The header uses Svelte's syntax: `collection as pattern[, index] [(key)]`.

```braceml
each users as user, i (user.id) {
  li '{i + 1}. {user.name}'
} else {
  li 'No users'
}
```

### 5.3 await

```braceml
await promise {
  p 'Loading…'
} then value {
  p '{value}'
} catch err {
  p.error '{err.message}'
}
```

The short forms are also accepted: `await promise then value { ... }` and
`await promise catch err { ... }`.

### 5.4 key

```braceml
key value {
  Fancy
}
```

### 5.5 snippet

```braceml
snippet row(user) {
  td '{user.name}'
}
```

### 5.6 Special tags

A special tag starts with `@` and runs to the end of the line:

| Source                 | Svelte output          |
|------------------------|------------------------|
| `@render row(user)`    | `{@render row(user)}`  |
| `@html post.body`      | `{@html post.body}`    |
| `@const total = a + b` | `{@const total = a + b}` |
| `@debug user`          | `{@debug user}`        |

## 6. Targets

### 6.1 html

This target is plain HTML, compatible with easy-html. It is meant for static pages
and for frameworks that use attribute syntax, such as Vue and Angular.

- Control-flow blocks, special tags and `{expr}` attribute values are errors.
- Void elements are printed without a closing tag (`<input type="email">`).

### 6.2 svelte

This target produces Svelte 5 markup.

- Blocks map to `{#if}`, `{#each}`, `{#await}`, `{#key}` and `{#snippet}`.
- Components without children are self-closing (`<Spinner />`).
- In `.svelte` files, put the markup in `<template lang="braceml">` and use the
  preprocessor from `@braceml/svelte`.

### 6.3 react (planned)

This target produces JSX. Its integration model is not decided yet:

- single-file `.braceml` components, or
- inline tagged templates.

## 7. Errors

Every error reports the line and column, and shows a code frame. Examples:
unclosed `{`, unexpected `}`, `else` without `if`, an unterminated string, and a
construct the selected target does not support.

## 8. Conformance

`spec/fixtures/<case>/` contains `input.braceml` plus one `expected.<target>` file per
target that supports the case. Every target package must pass all fixtures that have
an expected file for it. If a fixture has an `error.<target>.txt` file, compiling it
for that target must fail with an error message that contains the file's text.
