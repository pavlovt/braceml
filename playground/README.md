# BraceML playground

The BraceML website: a live playground, the HTML to BraceML converter and the language
guide. Every page template is written in BraceML, so the site doubles as a test of
BraceML in a real SvelteKit app. Issues it turns up are listed in [BUGS.md](BUGS.md).

- `/`: write BraceML and see the HTML, Svelte 5 and React output and an HTML preview.
  **Copy link** puts the source in the URL.
- `/convert`: paste HTML and get BraceML (`@braceml/convert`).
- `/docs`: [docs/language.md](../docs/language.md), rendered at build time.

Stack: SvelteKit 3 with adapter-static, Tailwind CSS 4, shadcn-svelte, and Paraglide JS
for English and Bulgarian (`messages/*.json`). It uses the workspace `@braceml/*`
packages, so build them first.

## Develop

From the repo root:

```sh
pnpm install
pnpm build
pnpm --filter braceml-playground dev
```

`pnpm --filter braceml-playground check` runs svelte-check, which can't read BraceML
templates yet (BUGS.md #4).

## Deploy

`.github/workflows/playground.yml` builds the site with `BASE_PATH=/braceml` and deploys
it to GitHub Pages at https://pavlovt.github.io/braceml/ on every push to `main` that
touches the playground, the docs or the packages. In the repo settings, set
**Pages → Source** to **GitHub Actions**.
