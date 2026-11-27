<script lang="ts">
	import { getLocale, baseLocale } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<template lang="braceml">
	svelte:head > title '{m.docs_title()} · BraceML'

	div class="mx-auto flex w-full max-w-7xl gap-10 px-4 py-8" {
		aside class="sticky top-4 hidden h-[calc(100dvh-6rem)] w-60 shrink-0 overflow-y-auto lg:block" {
			p class="mb-2 text-sm font-semibold" '{m.docs_contents()}'
			ul class="space-y-1 text-sm" {
				each data.toc as entry (entry.id) {
					li class:ps-4={entry.depth === 3} {
						a href="#{entry.id}" class="text-muted-foreground hover:text-foreground" '{entry.text}'
					}
				}
			}
		}

		article class="prose min-w-0 max-w-3xl flex-1 dark:prose-invert prose-pre:bg-muted prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none" {
			if getLocale() !== baseLocale {
				p class="not-prose mb-6 rounded-md border bg-muted/50 px-4 py-2 text-sm" lang=bg '{m.docs_english_only()}'
			}
			div lang=en {
				@html data.html
			}
			p class="not-prose mt-10 text-sm" {
				a href=https://github.com/pavlovt/braceml/edit/main/docs/language.md class="text-muted-foreground underline hover:text-foreground" '{m.edit_on_github()}'
			}
		}
	}
</template>
