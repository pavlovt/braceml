# Using BraceML with React

This guide shows how to write React components with BraceML. Your components stay ordinary
functions in `.jsx` or `.tsx` files, and only the markup changes:

```tsx
import { braceml } from '@braceml/react';

export function Users({ users }) {
  return braceml`
    ul {
      each users as user (user.id) {
        li '{user.name}'
      }
    }
  `;
}
```

A Vite plugin turns each `` braceml`…` `` template into JSX before the React plugin runs.
Nothing is parsed in the browser. Hooks, props and local variables are in scope as usual.

## Setup

You need React 18 or later and Vite.

```sh
npm i @braceml/react
```

```js
// vite.config.js
import react from '@vitejs/plugin-react';
import { braceml } from '@braceml/react/vite';

export default {
  // braceml() must run before react()
  plugins: [braceml(), react()],
};
```

Templates work in `.jsx` and `.tsx` files. Without the plugin, a template throws an error
when it runs.

## Writing templates

The syntax is the same as in every other target. See the
[language reference](language.md).

Write `{expression}`, not `${expression}`. A template has no JavaScript holes, because the
compiler reads it as source code. To use a backtick inside a template, write `` \` ``.

### Attributes

You can write HTML names, and the compiler converts them for React. You can also write the
React names directly.

| BraceML                       | JSX                                      |
|-------------------------------|------------------------------------------|
| `.a.b` or `class="a b"`       | `className="a b"`                        |
| `.a class={x}`                | `className={['a', x].filter(Boolean).join(' ')}` |
| `class:on={b}`                | added to `className` when `b` is truthy  |
| `for=email`                   | `htmlFor="email"`                        |
| `tabindex=1`, `readonly`      | `tabIndex="1"`, `readOnly`               |
| `onclick={f}`, `onkeydown={f}`| `onClick={f}`, `onKeyDown={f}`           |
| `stroke-width=2`              | `strokeWidth="2"`                        |
| `href="/users/{id}"`          | ``href={`/users/${id}`}``                |
| `style="color: red"`          | `style={{ color: 'red' }}`               |
| `style:width="{w}px"`         | added to the `style` object              |
| `bind:this={ref}`             | `ref={ref}`                              |

On a component, only `class` is renamed. Other props are passed exactly as you write them,
so write `onClick={f}`, not `onclick={f}`.

### Forms

React has no two-way binding, so `bind:value` is an error. Pass a value and a handler:

```braceml
input value={text} onchange={(e) => setText(e.target.value)}
```

### Blocks

| BraceML                          | JSX                                   |
|----------------------------------|---------------------------------------|
| `if a { … } else { … }`          | `{a ? (…) : (…)}`                     |
| `each xs as x (x.id) { … }`      | `{xs.map((x) => (…))}`, with the key on the root element |
| `each xs as x { … } else { … }`  | `{xs.length > 0 ? xs.map(…) : (…)}`   |
| `key v { … }`                    | `<Fragment key={v}>…</Fragment>`      |
| `await p { … } then v { … } catch e { … }` | `<Await promise={p} … />`   |
| `snippet row(x) { … }`           | `const row = (x) => (…);`             |
| `@render row(x)`                 | `{row(x)}`                            |
| `@render children?.()`           | `{children}`                          |
| `@html raw`                      | `dangerouslySetInnerHTML` on the parent |
| `@const y = x * 2`               | `const y = x * 2;`                    |
| `@debug x`                       | `{console.log({ x })}`                |

An `each` block without a key is keyed by position, like in Svelte. With an `else` branch,
the collection expression runs twice, so don't put an expensive call there.

A snippet inside a component becomes a prop:

```braceml
Table rows={users} {
  snippet row(user) {
    td '{user.name}'
  }
}
```

`await` uses the small `Await` component from `@braceml/react`. It waits in an effect, so it
shows the pending state during server rendering. Create the promise outside the render, for
example with `useMemo`, or it starts again on every render.

### Whitespace

Unlike HTML, JSX removes line breaks between elements, and the compiler keeps only the
spaces you write in the quotes. This renders `Hello <strong>you</strong> there`:

```braceml
p {
  'Hello '
  strong 'you'
  ' there'
}
```

## Compiling without the plugin

The CLI prints the JSX for a template, which is useful for moving code out of BraceML. The
expressions refer to variables in the code you paste it into.

```sh
npx @braceml/cli page.braceml -t react
```

From code, use `compileReact` from `@braceml/react/compiler`.

## Troubleshooting

**`BraceML template wasn't compiled`.** The plugin isn't running. Check `vite.config.js`,
and restart the dev server.

**`'bind:value' is not supported`.** See [Forms](#forms). Other Svelte directives, such as
`use:` and `transition:`, have no JSX equivalent and give a similar error.

**`'@click' is not a valid attribute`.** Vue and Angular attribute syntax isn't valid JSX.

**`'@html' must be the only child`.** React sets raw HTML on an element, so the element
can't have other children. Put `@html` in its own element.

**An `Unexpected token` error points at text.** Text is JSX text, so a `>` needs writing as
`&gt;`.

## Limitations

- Vite only. There is no webpack or Next.js integration yet.
- Inline HTML in text is JSX, so use `className` there: `p 'See <a className="x">this</a>'`.
- An unused-variable check can't see the names a template uses, because it runs on the
  source. `tsc` with `noUnusedLocals`, and ESLint, may report them.
- Template expressions aren't type-checked, and they get no completion.
- The VS Code extension and the language server don't read templates in `.jsx` or `.tsx`
  files yet, so they have no highlighting or diagnostics there.
- `each xs as { id, name }` isn't supported, in any target, because `{` ends the header. Use
  `each xs as item` and read `item.id`.

## A complete app

[examples/react](../examples/react) is a small Vite app written in BraceML.
