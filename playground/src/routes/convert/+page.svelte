<script lang="ts">
	import { htmlToBraceml } from '@braceml/convert';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { encodeSource } from '#lib/compile.js';
	import { m } from '#lib/paraglide/messages.js';
	import { localizeHref } from '#lib/paraglide/runtime.js';

	// the example the converter on pavlovt.github.io used to load
	const example = `<nav class="menu">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/shop">Shop</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
<form id="signup" class="card">
  <label for="email">Email</label>
  <input id="email" type="email" required>
  <button type="submit" class="btn primary">Sign up</button>
</form>`;

	let html = $state('');
	let classAttribute = $state(false);

	let result = $derived.by(() => {
		if (!html.trim()) return { code: '', error: '' };
		try {
			return { code: htmlToBraceml(html, { classAttribute }), error: '' };
		} catch (error) {
			return { code: '', error: error instanceof Error ? error.message : String(error) };
		}
	});

	let playgroundHref = $derived(`${localizeHref(resolve('/'))}#code=${encodeSource(result.code)}`);

	async function copy() {
		if (!result.code) return toast(m.nothing_to_copy());
		try {
			await navigator.clipboard.writeText(result.code);
			toast.success(m.copied());
		} catch {
			toast.error(m.copy_failed());
		}
	}
</script>

<template lang="braceml">
	svelte:head > title '{m.convert_title()} · BraceML'

	section class="mx-auto w-full max-w-7xl px-4 py-8" {
		h1 class="text-2xl font-semibold tracking-tight" '{m.convert_title()}'
		p class="mt-2 max-w-3xl text-muted-foreground" '{m.convert_intro()}'

		div class="mt-6 grid gap-4 md:grid-cols-2" {
			div class="flex flex-col gap-2" {
				Label for=html-input '{m.convert_html()}'
				textarea#html-input(
					bind:value={html}
					spellcheck="false"
					wrap="off"
					placeholder={'<nav class="menu">…</nav>'}
					class="h-96 resize-y rounded-md border bg-background p-3 font-mono text-sm leading-6"
				)
			}
			div class="flex flex-col gap-2" {
				Label for=braceml-output '{m.convert_braceml()}'
				textarea#braceml-output(
					value={result.code}
					readonly
					spellcheck="false"
					wrap="off"
					class="h-96 resize-y rounded-md border bg-muted/40 p-3 font-mono text-sm leading-6"
				)
			}
		}

		if result.error {
			p class="mt-3 text-sm text-destructive" role=alert '{m.convert_failed({ message: result.error })}'
		}

		div class="mt-4 flex flex-wrap items-center gap-2" {
			Button variant=outline onclick={() => (html = example)} '{m.load_example()}'
			Button variant=outline onclick={copy} '{m.copy_braceml()}'
			Button href={playgroundHref} disabled={!result.code} '{m.open_in_playground()}'
			div class="ms-2 flex items-center gap-2" {
				Checkbox id=class-attribute bind:checked={classAttribute}
				Label for=class-attribute '{m.keep_class_attribute()}'
			}
		}
	}
</template>
