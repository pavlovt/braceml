import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { braceml } from '@braceml/svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  // braceml() must run before vitePreprocess so <script lang="ts"> keeps working
  preprocess: [braceml(), vitePreprocess()],
  kit: { adapter: adapter() },
};
