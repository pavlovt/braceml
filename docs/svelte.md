# Using BraceML with Svelte

This guide shows how to write Svelte 5 and SvelteKit components in BraceML. You keep
your `.svelte` files, with `<script>` and `<style>` exactly as they are, and only the
markup changes:

```svelte
<script lang="ts">
  let { items } = $props();
</script>

<template lang="braceml">
  ul {
    each items as item (item.id) {
      li '{item.name}'
    }
  }
</template>

<style>
  li { list-style: square; }
</style>
```

A preprocessor from `@braceml/svelte` turns the `<template lang="braceml">` block into
Svelte markup before the Svelte compiler runs.

## Setup

You need Svelte 5. These steps are the same for SvelteKit and for plain Svelte with Vite.

### 1. Install the preprocessor

```sh
npm i -D @braceml/svelte
```

> **Not on npm yet.** BraceML 0.1 hasn't been published, so the command above doesn't
> work yet. Until it does, build the packages from this repo and install the tarballs:
>
> ```sh
> git clone https://github.com/pavlovt/braceml.git
> cd braceml
> pnpm install
> pnpm build
> pnpm --filter @braceml/core --filter @braceml/svelte exec pnpm pack
> ```
>
> Then, in your project, install both tarballs:
>
> ```sh
> npm i -D ../braceml/packages/core/braceml-core-0.1.0.tgz ../braceml/packages/svelte/braceml-svelte-0.1.0.tgz
> ```

### 2. Add it to `svelte.config.js`

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { braceml } from '@braceml/svelte';

export default {
  // braceml() must run before vitePreprocess so <script lang="ts"> keeps working
  preprocess: [braceml(), vitePreprocess()],
};
```

In SvelteKit, keep your existing `kit` options next to `preprocess`.

### 3. Use it in a component

```svelte
<script lang="ts">
  let count = $state(0);
</script>

<template lang="braceml">
  button onclick={() => count++} 'Clicked {count} times'
</template>
```

Restart the dev server after changing `svelte.config.js`.

BraceML only applies inside the template block, so you can convert a project one
component at a time. Files without a block are left untouched.

### 4. Optional: editor support

The [VS Code extension](../editors/vscode) highlights `<template lang="braceml">` blocks
and works alongside the official Svelte extension. The `template-braceml` snippet inserts
an empty block.

## Writing components

The [language specification](../spec/SPEC.md) covers the full syntax. This section covers
what you'll use most in Svelte.

### Elements, text and expressions

Text is always quoted, and expressions in text go inside the quotes:

```braceml
h1.title 'Hello {user.name}'
a.button href="/users/{user.id}" 'Profile'
img src={user.avatar} alt="{user.name}'s avatar"
```

`{` opens an expression only right after `=`, so it is fine to pass objects and functions:

```braceml
Chart options={{ legend: false, axis: { x: 'time' } }}
```

Use `tag(` with no space before the `(` to spread attributes over several lines:

```braceml
button.btn(
  type=button
  disabled={!ready}
  onclick={save}
) 'Save'
```

### Text next to inline elements

For a sentence with inline elements, put the markup in the string:

```braceml
p 'Hello <strong>{name}</strong>, welcome.'
```

You can also put each piece on its own line, but the line breaks become spaces in the
page. This renders a space before the comma:

```braceml
p {
  'Hello '
  strong '{name}'
  ', welcome.'
}
```

### Props, state and events

Runes stay in `<script>`. The template refers to them by name:

```svelte
<script lang="ts">
  let { label, onsave }: { label: string; onsave: (value: string) => void } = $props();
  let value = $state('');
  let empty = $derived(value.trim() === '');
</script>

<template lang="braceml">
  form onsubmit={(e) => { e.preventDefault(); onsave(value); }} {
    label.field {
      '{label}'
      input bind:value={value}
    }
    button type=submit disabled={empty} 'Save'
  }
</template>
```

### Directives

Directives pass through to Svelte as written:

```braceml
input.search(
  bind:value={query}
  bind:this={field}
  class:active={open}
  style:width="{width}px"
  use:tooltip={hint}
  onkeydown={onKey}
)
```

### Components and children

A tag that starts with an upper-case letter is a component. Import it in `<script>` as
usual. Children become the component's `children` snippet:

```svelte
<script lang="ts">
  let { title, children } = $props();
</script>

<template lang="braceml">
  section.card {
    h2 '{title}'
    @render children?.()
  }
</template>
```

```svelte
<script lang="ts">
  import Card from '$lib/Card.svelte';
</script>

<template lang="braceml">
  Card title="Welcome" {
    p 'Glad you are here.'
  }
</template>
```

Spread props with `{...props}`:

```braceml
Card {...props}
```

### Blocks

| Svelte                                     | BraceML                          |
|--------------------------------------------|----------------------------------|
| `{#if a}…{:else if b}…{:else}…{/if}`       | `if a { … } else if b { … } else { … }` |
| `{#each xs as x, i (x.id)}…{/each}`        | `each xs as x, i (x.id) { … }`   |
| `{#each xs as x}…{:else}…{/each}`          | `each xs as x { … } else { … }`  |
| `{#await p}…{:then v}…{:catch e}…{/await}` | `await p { … } then v { … } catch e { … }` |
| `{#key v}…{/key}`                          | `key v { … }`                    |
| `{#snippet row(x)}…{/snippet}`             | `snippet row(x) { … }`           |
| `{@render row(x)}`                         | `@render row(x)`                 |
| `{@html raw}`                              | `@html raw`                      |
| `{@const y = x * 2}`                       | `@const y = x * 2`               |
| `{@debug x}`                               | `@debug x`                       |

```braceml
each orders as order (order.id) {
  @const total = order.price * order.quantity
  p '{order.name}: {total}'
} else {
  p.muted 'No orders yet'
}
```

Tags starting with `@` run to the end of the line.

Snippets can be passed to a component by nesting them, as in Svelte:

```braceml
Table rows={users} {
  snippet row(user) {
    td '{user.name}'
  }
}
```

### Special elements

`svelte:` elements work like any other tag:

```braceml
svelte:head > title 'Dashboard'
svelte:window onkeydown={onKey}

svelte:boundary {
  Dashboard
  snippet failed(error) {
    p.error '{error.message}'
  }
}
```

### Styles

`<style>` is untouched, so scoped CSS and `lang="scss"` keep working. Classes from
selectors count as used:

```svelte
<template lang="braceml">
  p.muted 'Nothing here yet'
</template>

<style>
  .muted { color: #888; }
</style>
```

## Preprocessor options

| Option             | Default     | Meaning                                       |
|--------------------|-------------|-----------------------------------------------|
| `lang`             | `'braceml'` | The `lang` value that marks a template block. |
| `indent`           | two spaces  | Indentation of the generated markup.          |
| `allowUnknownTags` | `false`     | Accept any lower-case tag name.               |

```js
braceml({ allowUnknownTags: true });
```

Leave `allowUnknownTags` off if you can. The check is what catches `p {name}`. Custom
elements don't need it, because names with a hyphen are always accepted.

## Compiling without the preprocessor

The `braceml` CLI converts a standalone template file to Svelte markup. The output is
markup only, so this suits one-off conversion rather than a build step:

```sh
npx braceml page.braceml -t svelte -o page.svelte
```

From code, use `compileSvelte`, which takes the same `indent` and `allowUnknownTags`
options plus `filename`:

```js
import { compileSvelte } from '@braceml/svelte';

const markup = compileSvelte("p 'Hello {name}'"); // <p>Hello {name}</p>
```

`.braceml` files can't be imported as components. Components are always `.svelte` files
with a template block.

## Troubleshooting

**The component renders nothing and shows no error.** The preprocessor isn't running.
Without it, the block is an ordinary HTML `<template>`, which browsers don't display.
Check `svelte.config.js`, restart the dev server, and make sure `lang="braceml"` is
spelled correctly.

**`Unknown element 'name'`.** You most likely wrote an expression without quotes:
`p {name}`. Write `p '{name}'`. Tag names with typos give the same error.

**A prop turned into a child element.** Svelte's `{title}` shorthand doesn't work on an
element head, because `{` opens the children block there. `Card {title}` compiles without
an error to a `Card` containing an empty `<title>`. Write `Card title={title}`. The spread
`{...props}` is the one exception.

**`input ' Name'` is an error.** Void elements can't have a body. Put the text on its own
line:

```braceml
label {
  input type=checkbox
  ' Name'
}
```

**A class with a dot has no effect.** `.w-1.5` compiles without an error to two classes,
`w-1` and `5`. Use `class="w-1.5"`, which merges with selector classes. Other Tailwind
classes such as `md:flex` and `w-1/2` work in the selector.

**A multi-line head fails.** Remove any space before the `(`: `input(`, not `input (`.

**An error points at the wrong place.** BraceML errors use the line numbers of your
`.svelte` file. Errors from the Svelte compiler itself refer to the generated markup,
because source maps aren't implemented yet.

## Limitations

These are on the [roadmap](../README.md#roadmap):

- No source maps.
- No language server, so templates get highlighting but no autocomplete or diagnostics
  while typing.
- No formatter or Prettier plugin.

## A complete app

[examples/sveltekit](../examples/sveltekit) is a small SvelteKit app written in BraceML.
