<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import { ResizableHandle, ResizablePane, ResizablePaneGroup } from '#lib/components/ui/resizable/index.js';
	import { SelectContent, SelectItem, Select, SelectTrigger } from '#lib/components/ui/select/index.js';
	import { TabsContent, TabsList, Tabs, TabsTrigger } from '#lib/components/ui/tabs/index.js';
	import { compile, decodeSource, encodeSource, formatSource, type Target } from '#lib/compile.js';
	import { examples } from '#lib/examples.js';
	import { m } from '#lib/paraglide/messages.js';

	const titles: Record<string, () => string> = {
		hello: m.example_hello,
		form: m.example_form,
		tailwind: m.example_tailwind,
		blocks: m.example_blocks,
		snippets: m.example_snippets,
	};
	const targets: { id: Target; label: string }[] = [
		{ id: 'html', label: 'HTML' },
		{ id: 'svelte', label: 'Svelte' },
		{ id: 'react', label: 'React' },
	];

	let source = $state(examples[0].source);
	let exampleId = $state(examples[0].id);
	let tab = $state('preview');
	const wide = new MediaQuery('min-width: 768px');

	let results = $derived({
		html: compile(source, 'html'),
		svelte: compile(source, 'svelte'),
		react: compile(source, 'react'),
	});
	// the Svelte target accepts every construct, so its error is the one to show under the editor
	let sourceError = $derived(results.svelte.ok ? null : results.svelte.error);
	let previewDoc = $derived(
		results.html.ok
			? // no <style> tag here: Svelte's style preprocessing would match it inside this string
				`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;margin:1rem;line-height:1.5">${results.html.code}`
			: '',
	);

	function loadFromHash() {
		const code = new URLSearchParams(location.hash.slice(1)).get('code');
		const decoded = code ? decodeSource(code) : null;
		if (decoded !== null && decoded !== source) {
			source = decoded;
			exampleId = '';
		}
	}

	onMount(() => {
		loadFromHash();
		addEventListener('hashchange', loadFromHash);
		return () => removeEventListener('hashchange', loadFromHash);
	});

	function loadExample(id: string) {
		const example = examples.find((e) => e.id === id);
		if (!example) return;
		exampleId = id;
		source = example.source;
	}

	function formatCode() {
		const result = formatSource(source);
		if (result.ok) source = result.code;
		else toast.error(result.error.message);
	}

	async function share() {
		history.replaceState(history.state, '', `#code=${encodeSource(source)}`);
		try {
			await navigator.clipboard.writeText(location.href);
			toast.success(m.link_copied());
		} catch {
			toast.error(m.copy_failed());
		}
	}
</script>

<template lang="braceml">
	svelte:head > title '{m.playground_title()} · BraceML'

	h1 class="sr-only" '{m.playground_title()}'

	div class="flex flex-wrap items-center gap-2 border-b px-4 py-2" {
		Select type=single value={exampleId} onValueChange={loadExample} {
			SelectTrigger class="w-44" aria-label={m.examples()} '{titles[exampleId]?.() ?? m.examples()}'
			SelectContent {
				each examples as example (example.id) {
					SelectItem value={example.id} label={titles[example.id]()} '{titles[example.id]()}'
				}
			}
		}
		Button variant=outline onclick={formatCode} '{m.format()}'
		Button variant=outline onclick={share} '{m.share()}'
	}

	ResizablePaneGroup direction={wide.current ? 'horizontal' : 'vertical'} class="min-h-[36rem] flex-1" {
		ResizablePane defaultSize={50} minSize={20} class="flex flex-col" {
			label for=source class="sr-only" '{m.editor_label()}'
			textarea#source(
				bind:value={source}
				spellcheck="false"
				autocomplete="off"
				wrap="off"
				class="min-h-0 w-full flex-1 resize-none bg-background p-4 font-mono text-sm leading-6 outline-none"
			)
			div class="border-t px-4 py-2 text-sm" role=status aria-live=polite {
				if sourceError {
					p class="text-destructive" {
						if sourceError.line {
							'{m.error_at({ line: sourceError.line, column: sourceError.column ?? 1, message: sourceError.message })}'
						} else {
							'{sourceError.message}'
						}
					}
				} else {
					p class="text-muted-foreground" '{m.compiled_ok()}'
				}
			}
		}

		ResizableHandle withHandle

		ResizablePane defaultSize={50} minSize={20} {
			Tabs bind:value={tab} class="flex h-full flex-col gap-0" {
				TabsList class="m-2" {
					TabsTrigger value=preview '{m.tab_preview()}'
					each targets as target (target.id) {
						TabsTrigger value={target.id} '{target.label}'
					}
				}

				TabsContent value=preview class="min-h-0 flex-1 border-t" {
					if results.html.ok {
						iframe title={m.preview_title()} sandbox="" srcdoc={previewDoc} class="h-full min-h-80 w-full bg-white"
					} else {
						p class="p-4 text-sm text-muted-foreground" '{m.preview_unavailable()}'
					}
				}

				each targets as target (target.id) {
					TabsContent value={target.id} class="min-h-0 flex-1 overflow-auto border-t" {
						@const result = results[target.id]
						if result.ok {
							pre class="p-4 font-mono text-sm leading-6" > code '{result.code}'
						} else {
							pre class="p-4 font-mono text-sm leading-6 whitespace-pre-wrap text-destructive" > code "{result.error.message}{result.error.frame ? `\n\n${result.error.frame}` : ''}"
						}
					}
				}
			}
		}
	}
</template>
