# BraceML

**HTML templates without the boilerplate.** BraceML is a brace-based template language.
`{ }` wraps an element's children, the way SCSS wraps CSS rules. It compiles to plain
HTML, Svelte 5 and React.

**See it in a real app:** [brace-store](https://github.com/pavlovt/brace-store) is a
SvelteKit storefront built twice, in BraceML and in HTML, so you can compare them side by
side.

```svelte braceml
form onsubmit={save} {
  label for=email 'Email address'
  input#email.form-control type=email bind:value={email}

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

## What is BraceML?

BraceML is a different way to write the same markup. A compiler turns your template into
ordinary HTML, Svelte markup or JSX at build time, so browsers and frameworks never see
BraceML. You keep your components, CSS and JavaScript, and you can convert one component
at a time.

BraceML grew out of [easy-html](https://github.com/pavlovt/easy-html), and easy-html
templates are valid BraceML.

## Why not just HTML?

### No closing tags

In HTML, every element is written twice. In BraceML, selectors do the naming and braces do
the nesting.

**HTML**

```html
<nav class="menu">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/shop">Shop</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
```

**BraceML**

```svelte braceml
nav.menu > ul {
  li > a href=/ 'Home'
  li > a href=/shop 'Shop'
  li > a href=/about 'About'
}
```

### Selectors instead of attributes

You already write `#id.class` in your CSS, and the same selector works here. A tag with no
name is a `div`.

**HTML**

```html
<form class="signup" action="/join" method="post">
  <label for="email">Email</label>
  <input id="email" class="field" type="email" name="email" required>
  <button class="primary" type="submit">Join</button>
</form>
```

**BraceML**

```svelte braceml
form.signup action=/join method=post {
  label for=email 'Email'
  input#email.field type=email name=email required
  button.primary type=submit 'Join'
}
```

### One syntax for control flow

The same template compiles for both frameworks.

**Svelte**

```svelte
{#if users.length == 0}
  <p class="muted">No users yet</p>
{:else}
  <ul>
    {#each users as user (user.id)}
      <li><a href="/users/{user.id}">{user.name}</a></li>
    {/each}
  </ul>
{/if}
```

**React**

```jsx
users.length == 0 ? (
  <p className="muted">No users yet</p>
) : (
  <ul>
    {users.map((user) => (
      <li key={user.id}>
        <a href={`/users/${user.id}`}>{user.name}</a>
      </li>
    ))}
  </ul>
)
```

**BraceML, for both.** The React target adds `className`, `key` and the rest for you.

```svelte braceml
if users.length == 0 {
  p.muted 'No users yet'
} else {
  ul {
    each users as user (user.id) {
      li > a href="/users/{user.id}" '{user.name}'
    }
  }
}
```

### Mistakes are errors

Browsers accept broken HTML and guess what you meant, so a missing `</div>` or a misspelled
tag still renders something. BraceML stops the build and shows you where the problem is.

```
Unclosed '{' (page.braceml:1:6)

> 1 | main {
    |      ^
  2 |   section {
```

```
Unknown element 'lli'. Text and expressions must be quoted, e.g. '{lli}'. (Custom elements need a hyphen; disable this check with allowUnknownTags.) (page.braceml:3:3)

  1 | ul {
  2 |   li 'One'
> 3 |   lli 'Two'
    |   ^
  4 | }
```

### How much does it save?

| Measured on                                                | Compared with        | Fewer characters |
|------------------------------------------------------------|----------------------|------------------|
| [Todo app, React](examples/todo-react/src/App.jsx)         | Generated JSX        | 34%              |
| [Todo app, Svelte](examples/todo-svelte/src/App.svelte)    | Generated Svelte     | 21%              |
| [brace-store](https://github.com/pavlovt/brace-store)      | Hand-written Svelte  | 8%               |

The last row is the most realistic, because it compares two hand-written versions of a
whole storefront. BraceML used 8% fewer characters there but 13 more lines (292 against
279), because each element goes on its own line.

### Trade-offs

BraceML isn't better at everything:

- Text must be quoted, so a sentence with inline tags is written as a string:
  `p 'Hello <strong>{name}</strong>'`.
- Template expressions aren't type-checked, and they get no completion.
- `svelte-check` doesn't work on files with BraceML blocks.
- Tailwind classes belong in a `class` attribute, because Tailwind can't detect selector
  classes.

## Features

- **Short bodies:** `label 'Text'`, `li > a 'Link'`, and void elements without `{}`.
- **Selectors:** `tag#id.class.class`, with `div` as the default tag.
- **Attributes:** static, quoted with interpolation, boolean, `{expression}` and spread.
  Spread them over several lines with `tag(` ... `)`.
- **Components:** a tag that starts with an upper-case letter, such as `Card title="Hi"`.
- **Blocks:** `if`, `else if`, `else`, `each` with an index, key and empty state, `await`,
  `key` and `snippet`.
- **Special tags:** `@render`, `@html`, `@const` and `@debug`.
- **Comments:** `// dropped from the output` and `/* kept in the output */`.
- **Svelte directives:** `bind:value={v}`, `class:on={b}`, `use:action` and more.
- **Framework attributes:** Vue and Angular syntax such as `@click`, `:title` and `(click)`
  passes through the HTML target unchanged.
- **Tag checking:** unknown lower-case tags are errors, which catches typos.
- **Editor support:** highlighting, snippets, live errors, completion, hover and formatting,
  in `.braceml`, `.svelte`, `.jsx` and `.tsx` files.
- **Formatter:** `braceml fmt` and a Prettier plugin.
- **HTML converter:** `braceml convert page.html` turns existing pages into BraceML.
- **Source maps:** Svelte and React errors and debuggers point at your template.

### Why braces instead of indentation?

Pug and Slim use indentation. In BraceML you can always see where a block ends, so
copy-paste and reformatting don't silently change the structure. Pug is to BraceML
roughly what Sass is to SCSS.

## Packages

| Package | What it does |
|---------|--------------|
| [`@braceml/core`](packages/core) | Parser, AST and error reporting |
| [`@braceml/html`](packages/html) | Compile to plain HTML (also works for Vue/Angular templates) |
| [`@braceml/svelte`](packages/svelte) | Svelte 5 / SvelteKit preprocessor |
| [`@braceml/react`](packages/react) | React templates, compiled to JSX by a Vite plugin |
| [`@braceml/cli`](packages/cli) | Command-line compiler, formatter and converter |
| [`@braceml/convert`](packages/convert) | Convert HTML to BraceML |
| [`@braceml/prettier-plugin`](packages/prettier-plugin) | Format `.braceml` files with Prettier |
| [`@braceml/language-server`](packages/language-server) | Diagnostics, completion and hover for any LSP editor |
| [VS Code extension](editors/vscode) | Highlighting, snippets and the language server |

## Use with SvelteKit

```sh
npm i -D @braceml/svelte
```

```js
// svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { braceml } from '@braceml/svelte';

export default {
  preprocess: [braceml(), vitePreprocess()],
};
```

```svelte
<script lang="ts">
  let count = $state(0);
</script>

<template lang="braceml">
  button onclick={() => count++} 'Clicked {count} times'
</template>
```

See the [Svelte guide](docs/svelte.md) for setup, syntax and troubleshooting.

## Use with React

```sh
npm i @braceml/react
```

```js
// vite.config.js
import react from '@vitejs/plugin-react';
import { braceml } from '@braceml/react/vite';

export default {
  plugins: [braceml(), react()],
};
```

```tsx
import { useState } from 'react';
import { braceml } from '@braceml/react';

export function Counter() {
  const [count, setCount] = useState(0);
  return braceml`
    button onclick={() => setCount(count + 1)} 'Clicked {count} times'
  `;
}
```

See the [React guide](docs/react.md) for setup, syntax and troubleshooting.

## Command line

```sh
npx @braceml/cli page.braceml                     # HTML to stdout
npx @braceml/cli page.braceml -t svelte -o page.svelte
npx @braceml/cli page.braceml -t react
npx @braceml/cli fmt src/App.svelte src/page.braceml   # format in place
npx @braceml/cli fmt --check src/App.tsx               # for CI
npx @braceml/cli convert page.html -o page.braceml
```

`fmt` formats `.braceml` files and the templates in `.svelte`, `.jsx` and `.tsx` files. For
Tailwind projects, add `--class-attribute` to `convert`.

## Examples

| Example | What it shows |
|---------|---------------|
| [brace-store](https://github.com/pavlovt/brace-store) | A SvelteKit storefront built twice, in BraceML and in HTML |
| [todo-react](examples/todo-react) | A todo app in React |
| [todo-svelte](examples/todo-svelte) | The same todo app in Svelte |
| [sveltekit](examples/sveltekit) | A small SvelteKit app |

## Documentation

- [Language guide and reference](docs/language.md)
- [Using BraceML with Svelte](docs/svelte.md)
- [Using BraceML with React](docs/react.md)
- [Guide for AI assistants](docs/llms.txt)

## Roadmap

- [x] Language spec and conformance fixtures
- [x] Parser with line/column errors
- [x] HTML target
- [x] Svelte target and preprocessor
- [x] React target
- [x] VS Code highlighting and snippets
- [x] Language server (autocomplete and diagnostics while typing)
- [x] Highlighting and language server in `.jsx` and `.tsx` templates
- [x] Formatter (`braceml fmt`) and HTML → BraceML converter
- [x] Source maps
- [x] Prettier plugin
- [ ] Online playground

## Development

```sh
pnpm install
pnpm test        # fixtures, parser, preprocessor and grammar tests
pnpm build
pnpm --filter braceml-example-sveltekit dev
```

Changing the compiler output? Run `pnpm fixtures:update`, then review the diff in
`spec/fixtures/`.

## License

MIT
