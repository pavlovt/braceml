# BraceML

**HTML templates without the boilerplate.** BraceML is a brace-based template language.
`{ }` wraps an element's children, the way SCSS wraps CSS rules. It compiles to plain
HTML and to Svelte 5, and a React target is planned.

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
| [`braceml`](packages/cli) | Command-line compiler |
| [VS Code extension](editors/vscode) | Highlighting and snippets, including inside `.svelte` files |

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

## Command line

```sh
npx braceml page.braceml                # HTML to stdout
npx braceml page.braceml -t svelte -o page.svelte
```

## Documentation

- [Language specification](spec/SPEC.md)
- [Using BraceML with Svelte](docs/svelte.md)
- [Guide for AI assistants](docs/llms.txt)

## Roadmap

- [x] Language spec and conformance fixtures
- [x] Parser with line/column errors
- [x] HTML target
- [x] Svelte target and preprocessor
- [x] VS Code highlighting and snippets
- [ ] Formatter (`braceml fmt`) and HTML → BraceML converter
- [ ] Source maps
- [ ] Language server (autocomplete and diagnostics while typing)
- [ ] Prettier plugin
- [ ] Online playground
- [ ] React target

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
