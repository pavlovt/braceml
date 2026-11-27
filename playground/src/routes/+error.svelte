<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { localizeHref } from '#lib/paraglide/runtime.js';
</script>

<template lang="braceml">
	svelte:head > title '{page.status} · BraceML'

	section class="mx-auto max-w-xl px-4 py-16 text-center" {
		p class="text-5xl font-semibold" '{page.status}'
		h1 class="mt-4 text-xl" '{page.status === 404 ? m.not_found() : page.error?.message}'
		a href={localizeHref(resolve('/'))} class="mt-6 inline-block underline" '{m.back_home()}'
	}
</template>
