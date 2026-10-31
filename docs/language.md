# The BraceML language

BraceML is a brace-based template language. You write elements the way you write SCSS
rules: `{ }` wraps an element's children. It compiles to plain HTML, Svelte 5 and React.

This page teaches the language first and then gives the full reference. For framework
setup, see the [Svelte guide](svelte.md) and the [React guide](react.md).

**Version:** 0.1 (draft)

- [Quick start](#quick-start)
- [Concepts](#concepts)
- [Cookbook](#cookbook)
- [Common mistakes](#common-mistakes)
- [Tools](#tools)
- [Reference](#reference)

## Quick start

Install the command-line compiler, or run it with `npx`, and create `page.braceml`:

```braceml
main.page {
  h1 'Hello'
  p 'Templates without closing tags.'
  a.button href="/docs" 'Read more'
}
```

Compile it:

```sh
npx @braceml/cli page.braceml
```

```html
<main class="page">
  <h1>Hello</h1>
  <p>Templates without closing tags.</p>
  <a class="button" href="/docs">Read more</a>
</main>
```

To use BraceML in an app, follow the [Svelte guide](svelte.md) or the
[React guide](react.md).

## Concepts

### Elements

An element is a CSS-style selector, then attributes, then a body:

```braceml
input#email.field type=email required
button.primary type=submit 'Save'
```

The tag defaults to `div`, so `.row` is `<div class="row">`. A tag that starts with an
upper-case letter is a component.

### Four kinds of body

An element has one body at most:

```braceml
div { p 'Children go in braces' }    // any number of children
label 'One text child'               // quoted text
li > a href=/ 'One element child'    // a chain
input type=text                      // no body
```

Chains can nest, which is useful for wrappers: `ul > li > a href=/ 'Home'`.

### Text is always quoted

Quotes are how BraceML tells text from elements, so it never has to guess. Expressions in
text go inside the quotes:

```braceml
p 'Hello {user.name}'
```

Text is printed as written, so it can hold entities and inline markup:

```braceml
p 'Hello <strong>{name}</strong>,&nbsp;welcome.'
```

### Braces mean one thing

A `{` opens an expression only right after `=` or `...`. Anywhere else it opens children.

```braceml
button onclick={save} { 'Save' }
//             ^ expression  ^ children
```

### Newlines end a head

Whitespace doesn't matter between nodes, and indentation has no meaning. The one exception
is a newline in an element head, which ends the head. To spread attributes over several
lines, put parentheses straight after the selector, with no space:

```braceml
input.field(
  type=email
  placeholder="Enter email"
  required
)
```

### Blocks

Control flow uses keywords followed by braces:

```braceml
if loading {
  Spinner
} else if error {
  p.error '{error.message}'
} else {
  each users as user (user.id) {
    UserCard user={user}
  } else {
    p 'No users'
  }
}
```

The expressions are JavaScript. The `html` target has no expressions, so blocks work only
in the `svelte` and `react` targets.

## Cookbook

### Links in a list

```braceml
nav > ul {
  each links as link (link.href) {
    li > a href={link.href} class:active={link.href === path} '{link.label}'
  }
}
```

### A form field

```braceml
label.field {
  span 'Email'
  input type=email name=email required
}
```

### Text next to an element

Text on the same line as an element is that element's body, so give sibling text its own
line:

```braceml
label {
  input type=checkbox
  ' Remember me'
}
```

### Tailwind

Use the `class` attribute. Tailwind scans source files and doesn't detect classes written
as selectors, and a selector class can't contain a dot:

```braceml
.card class="w-1.5 rounded-lg md:flex" 'Hello'
```

### Reusable markup

```braceml
snippet row(user) {
  td '{user.name}'
  td '{user.email}'
}

table > tbody {
  each users as user (user.id) {
    tr { @render row(user) }
  }
}
```

### Loading states

```braceml
await load() {
  p 'Loading…'
} then data {
  p '{data.title}'
} catch err {
  p.error '{err.message}'
}
```

### Vue and Angular templates

The `html` target leaves framework attributes alone, so you can write Vue and Angular
templates and hand the output to their compilers:

```braceml
button @click="save()" :disabled="busy" 'Vue'
button (click)="save()" [disabled]="busy" 'Angular'
```

## Common mistakes

| You wrote             | Problem                                  | Write this                 |
|-----------------------|------------------------------------------|----------------------------|
| `p {name}`            | `{` opens children, so `name` is a tag.  | `p '{name}'`               |
| `Card {title}`        | Compiles to `Card` with a `<title>` child. | `Card title={title}`     |
| `p 'a' { }`           | Two bodies.                              | A children block with two text nodes |
| `.w-1.5`              | Compiles to classes `w-1` and `5`.       | `class="w-1.5"`            |
| `input (`             | The `(` is read as an attribute name.    | `input(`                   |
| `input ' Name'`       | Void elements can't have a body.         | Put the text on its own line |
| `each xs as { id }`   | `{` ends the header.                     | `each xs as x`, then `x.id` |

## Tools

| Tool | What it does |
|------|--------------|
| [`@braceml/cli`](../packages/cli) | `npx @braceml/cli page.braceml -t html\|svelte\|react -o out` |
| [`@braceml/html`](../packages/html) | `compileHtml(source)` |
| [`@braceml/svelte`](../packages/svelte) | `compileSvelte(source)` and a preprocessor |
| [`@braceml/react`](../packages/react) | `braceml` tag, `Await`, `compileReact(source)` and a Vite plugin |
| [`@braceml/core`](../packages/core) | `parse(source)`, the AST and `BraceMLError` |
| [`@braceml/language-server`](../packages/language-server) | Diagnostics, completion and hover |
| [VS Code extension](../editors/vscode) | Highlighting, snippets and the language server |

Every compiler takes `filename`, `indent` and `allowUnknownTags` options.

## Reference

A BraceML template is parsed once into a framework-neutral AST. **Targets** then print
the AST:

| Target   | Package           | Status    |
|----------|-------------------|-----------|
| `html`   | `@braceml/html`   | available |
| `svelte` | `@braceml/svelte` | available |
| `react`  | `@braceml/react`  | available |

### 1. Lexical rules

- Source is UTF-8. Line endings are `\n` or `\r\n`.
- Whitespace and newlines between nodes are insignificant.
- **Inside an element head a newline ends the head**, unless the attributes are wrapped in
  parentheses (section 2.3).
- Indentation has no meaning.

#### 1.1 Comments

| Form          | Output                                                       |
|---------------|--------------------------------------------------------------|
| `// text`     | Removed. It is a source-only comment.                        |
| `/* text */`  | `<!-- text -->` in HTML and Svelte, `{/* text */}` in React. |

### 2. Elements

```
element  = head [ body ]
head     = selector [ attributes ]
body     = children | text | chain
children = "{" node* "}"
text     = string
chain    = ">" element
```

#### 2.1 Selector

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
`. # { } ' " ( ) = >`. Classes such as `md:flex`, `w-1/2` and `hover:bg-red-500` parse
correctly. A class that contains a dot (`w-1.5`) must go in a `class` attribute.

#### 2.2 Attributes

Attributes follow the selector and are separated by whitespace.

| Source                  | Kind                                               |
|-------------------------|----------------------------------------------------|
| `type=email`            | Unquoted value. It may not contain whitespace or `{ } ' " ( ) >`. |
| `placeholder="Enter email"` | Quoted value. Both `"` and `'` work.           |
| `href="/u/{user.id}"`   | Quoted value with interpolation (target-specific). |
| `disabled`              | Boolean attribute.                                 |
| `onclick={save}`        | Expression. The braces are balanced and JS strings are respected. |
| `...props`, `...{a}`, `{...props}` | Spread. The Svelte form `{...props}` is accepted because a children block can never start with `...`. |
| `bind:value={x}`, `class:active={on}`, `use:tooltip` | Directives are passed to the target. |
| `@click="go"`, `:title="t"`, `[value]="v"`, `(click)="go()"` | Framework attributes (Vue/Angular) are passed through unchanged. |

The rule that removes ambiguity: **`{` opens an expression only directly after `=`
(or after `...`). Anywhere else in a head, `{` opens the children block.**

The class attribute is merged with the selector classes, so `.a class="b"` becomes
`class="a b"`.

#### 2.3 Multi-line heads

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

#### 2.4 Bodies

| Form                         | Meaning                       |
|------------------------------|-------------------------------|
| `div { ... }`                | Element with child nodes.     |
| `label 'Email'`              | A single text child.          |
| `li > a href=/ 'Home'`       | A single element child (chain). Chains may nest: `ul > li > a 'x'`. |
| `input type=text`            | No body: void or empty element. |
| `div {}`                     | Explicit empty element (easy-html style). |

### 3. Text

Text is always quoted: `'...'` or `"..."`. To use the same quote inside a string,
escape it (`'Don\'t'`), or switch quotes (`"Don't"`). `\\` is a backslash.

Text is emitted **as is**, so it may contain entities (`&nbsp;`) and inline markup. In the
`svelte` and `react` targets, `{expr}` inside text is an expression.

### 4. Control flow

A keyword starts a block only at the start of a node and only when it is followed by
whitespace. A block's header expression runs up to the first `{` that is not nested
in `()`, `[]` or a string.

#### 4.1 if

```braceml
if loading {
  Spinner
} else if error {
  p.error '{error.message}'
} else {
  Results items={items}
}
```

#### 4.2 each

The header uses Svelte's syntax: `collection as pattern[, index] [(key)]`. A pattern can be
a name or an array pattern (`[id, name]`). An object pattern isn't accepted, because `{`
ends the header.

```braceml
each users as user, i (user.id) {
  li '{i + 1}. {user.name}'
} else {
  li 'No users'
}
```

The `else` branch renders when the collection is empty.

#### 4.3 await

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

#### 4.4 key

Recreates its children when the value changes.

```braceml
key value {
  Fancy
}
```

#### 4.5 snippet

Declares reusable markup. A snippet that is a child of a component is passed to it.

```braceml
snippet row(user) {
  td '{user.name}'
}
```

#### 4.6 Special tags

A special tag starts with `@` and runs to the end of the line, or to the `}` that closes
the block it is in.

| Source                 | Svelte output            | React output                |
|------------------------|--------------------------|-----------------------------|
| `@render row(user)`    | `{@render row(user)}`    | `{row(user)}`               |
| `@html post.body`      | `{@html post.body}`      | `dangerouslySetInnerHTML`   |
| `@const total = a + b` | `{@const total = a + b}` | `const total = a + b;`      |
| `@debug user`          | `{@debug user}`          | `{console.log({ user })}`   |

### 5. Targets

#### 5.1 html

This target is plain HTML, compatible with easy-html. It is meant for static pages
and for frameworks that use attribute syntax, such as Vue and Angular.

- Control-flow blocks, special tags and `{expr}` attribute values are errors.
- Void elements are printed without a closing tag (`<input type="email">`).

#### 5.2 svelte

This target produces Svelte 5 markup.

- Blocks map to `{#if}`, `{#each}`, `{#await}`, `{#key}` and `{#snippet}`.
- Components without children are self-closing (`<Spinner />`).
- In `.svelte` files, put the markup in `<template lang="braceml">` and use the
  preprocessor from `@braceml/svelte`.

#### 5.3 react

This target produces a JSX expression.

- In `.jsx` and `.tsx` files, put the markup in a `` braceml`…` `` tagged template and use
  the Vite plugin from `@braceml/react/vite`. A template has no `${}` holes.
- HTML attribute names become React names (`class` to `className`, `for` to `htmlFor`,
  `onclick` to `onClick`). A `style` string becomes an object. On a component, only
  `class` is renamed.
- Quoted values with `{expr}` become template literals.
- `class:name` and `style:name` merge into `className` and `style`. `bind:this` becomes
  `ref`. Other Svelte directives are errors, and so are names that aren't valid in JSX.
- `if` becomes a conditional expression and `each` becomes `.map()`. An `each` without a
  key is keyed by position.
- `key` becomes a keyed `Fragment`. `await` becomes the `Await` component from
  `@braceml/react`.
- `snippet` and `@const` become `const` declarations in the enclosing function. A snippet
  that is a direct child of a component becomes a prop of that component.
- `@render children()` becomes `{children}`, because children are a value in React.
- `@html` becomes `dangerouslySetInnerHTML` on its parent. It must be the only child of
  an HTML element.
- Whitespace at the ends of a text node is kept. Line breaks between nodes are not, as
  in JSX.

### 6. Errors

Every error reports the line and column, and shows a code frame. Examples:
unclosed `{`, unexpected `}`, `else` without `if`, an unterminated string, and a
construct the selected target does not support.

### 7. Conformance

`spec/fixtures/<case>/` contains `input.braceml` plus one `expected.<target>` file per
target that supports the case. Expected `react` files hold the output of `compileReact`.
Every target package must pass all fixtures that have an expected file for it. If a
fixture has an `error.<target>.txt` file, compiling it for that target must fail with an
error message that contains the file's text.
