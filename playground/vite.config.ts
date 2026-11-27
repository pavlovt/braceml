import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { braceml } from '@braceml/svelte';
import { defineConfig } from 'vite';

// GitHub Pages serves the site from /braceml/; locally it runs at the root
const base = (process.env.BASE_PATH ?? '') as '' | `/${string}`;
const origin = ':protocol://:domain(.*)::port?';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			// braceml() must run before vitePreprocess so <script lang="ts"> keeps working
			preprocess: [braceml(), vitePreprocess()],
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
			},
			adapter: adapter({ fallback: '404.html' }),
			// absolute paths, because localizeHref() can't localize the relative ones resolve() returns
			paths: { base, relative: false },
		}),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// a static site can only pick the language from the URL
			strategy: ['url', 'baseLocale'],
			trailingSlash: 'always',
			// the locale segment comes after the base path: /braceml/bg/docs
			urlPatterns: [
				{
					pattern: `${origin}${base}/:path(.*)?`,
					localized: [
						['bg', `${origin}${base}/bg/:path(.*)?`],
						['en', `${origin}${base}/:path(.*)?`],
					],
				},
			],
		}),
	],
	// the docs page reads docs/language.md from the repo root
	server: { fs: { allow: ['..'] } },
});
