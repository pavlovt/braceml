# @braceml/prettier-plugin

Formats `.braceml` files with [Prettier](https://prettier.io).

```sh
npm i -D prettier @braceml/prettier-plugin
```

```json
{
  "plugins": ["@braceml/prettier-plugin"]
}
```

It uses Prettier's `tabWidth`, `useTabs` and `printWidth` options. To format templates in
`.svelte`, `.jsx` and `.tsx` files, run `npx @braceml/cli fmt`.
