<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { ModeWatcher, toggleMode } from 'mode-watcher';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { deLocalizeHref, getLocale, locales, localizeHref } from '#lib/paraglide/runtime.js';
	import favicon from '#lib/assets/favicon.svg';
	import './layout.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const nav = [
		{ href: resolve('/'), label: m.nav_playground },
		{ href: resolve('/convert'), label: m.nav_convert },
		{ href: resolve('/docs'), label: m.nav_docs },
	];

	const languageNames: Record<string, string> = { en: 'English', bg: 'Български' };

	const trim = (path: string) => path.replace(/\/$/, '');
	let current = $derived(trim(deLocalizeHref(page.url.pathname)));
</script>

<template lang="braceml">
	svelte:head {
		link rel=icon href={favicon}
		meta name=description content={m.site_description()}
	}

	ModeWatcher
	Toaster

	div class="flex min-h-dvh flex-col bg-background text-foreground" {
		header class="border-b" {
			nav class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3" {
				a href={localizeHref(resolve('/'))} class="font-semibold tracking-tight" 'BraceML'
				each nav as item (item.href) {
					a(
						href={localizeHref(item.href)}
						class="text-sm text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:font-medium"
						aria-current={current === trim(item.href) ? 'page' : undefined}
					) '{item.label()}'
				}
				a href=https://github.com/pavlovt/braceml class="text-sm text-muted-foreground hover:text-foreground" '{m.nav_github()}'

				div class="ms-auto flex items-center gap-1" {
					nav aria-label={m.language()} class="flex gap-1 text-sm" {
						each locales as locale (locale) {
							a(
								href={localizeHref(page.url.pathname, { locale })}
								hreflang={locale}
								lang={locale}
								class="rounded px-2 py-1 text-muted-foreground hover:text-foreground aria-[current=true]:bg-muted aria-[current=true]:text-foreground"
								aria-current={locale === getLocale()}
							) '{languageNames[locale]}'
						}
					}
					Button variant=ghost size=icon onclick={toggleMode} aria-label={m.toggle_theme()} {
						SunIcon class="size-4 dark:hidden"
						MoonIcon class="hidden size-4 dark:block"
					}
				}
			}
		}

		main class="flex min-h-0 flex-1 flex-col" {
			@render children()
		}
	}
</template>
