# BraceML

**HTML templates without the boilerplate.** BraceML is a brace-based template language.
`{ }` wraps an element's children, the way SCSS wraps CSS rules. It compiles to plain
HTML, Svelte 5 and React.

```braceml
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

BraceML grew out of [easy-html](https://github.com/pavlovt/easy-html), and easy-html
templates are valid BraceML. It adds:

- short bodies (`label 'Text'`, `li > a 'Link'`)
- `#id` selectors
- void elements without `{}`
- components
- framework blocks (`if`, `each`, `await`, `key`, `snippet`)
- clear error messages with line and column

## Why braces instead of indentation?

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
| [`@braceml/cli`](packages/cli) | Command-line compiler |
| [`@braceml/language-server`](packages/language-server) | Diagnostics, completion and hover for any LSP editor |
| [VS Code extension](editors/vscode) | Highlighting, snippets and the language server, including inside `.svelte` files |

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

See the [Svelte guide](docs/svelte.md) for setup, syntax and troubleshooting, and
[examples/sveltekit](examples/sveltekit) for a complete app.

For a larger example, [brace-store](https://github.com/pavlovt/brace-store) is a SvelteKit
storefront built twice, in BraceML and in HTML, so you can compare the two side by side.

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

See the [React guide](docs/react.md) and [examples/react](examples/react).

## Command line

```sh
npx @braceml/cli page.braceml                # HTML to stdout
npx @braceml/cli page.braceml -t svelte -o page.svelte
```

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
- [x] VS Code highlighting and snippets
- [x] Language server (autocomplete and diagnostics while typing)
- [ ] Formatter (`braceml fmt`) and HTML → BraceML converter
- [ ] Source maps
- [ ] Prettier plugin
- [ ] Online playground
- [x] React target
- [ ] Editor support in `.jsx` and `.tsx` templates

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
