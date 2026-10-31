# @braceml/svelte

Use [BraceML](https://github.com/pavlovt/braceml) in Svelte 5 and SvelteKit.

```sh
npm i -D @braceml/svelte
```

```js
// svelte.config.js
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { braceml } from "@braceml/svelte";

export default { preprocess: [braceml(), vitePreprocess()] };
```

```svelte
<script lang="ts">
  let count = $state(0);
</script>

<template lang="braceml">
  button onclick={() => count++} 'Clicked {count} times'
</template>
```

`compileSvelte(source)` is also exported for direct use.
