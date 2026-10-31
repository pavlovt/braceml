import { parse, printMarkup } from '@braceml/core';

export interface CompileSvelteOptions {
  filename?: string;
  /** indentation unit, default two spaces */
  indent?: string;
  /** accept any lower-case tag name (default false) */
  allowUnknownTags?: boolean;
}

/** Compiles BraceML template source to Svelte 5 markup. */
export function compileSvelte(source: string, options: CompileSvelteOptions = {}): string {
  const ast = parse(source, { filename: options.filename, allowUnknownTags: options.allowUnknownTags });
  return printMarkup(ast, { target: 'svelte', source, filename: options.filename, indent: options.indent });
}

export interface BraceMLPreprocessorOptions {
  /** value of the `lang` attribute to look for, default `braceml` */
  lang?: string;
  indent?: string;
  allowUnknownTags?: boolean;
}

interface MarkupInput {
  content: string;
  filename?: string;
}

/**
 * Svelte preprocessor. Replaces `<template lang="braceml">…</template>` in a
 * .svelte file with compiled Svelte markup. `<script>` and `<style>` are left
 * untouched, so `lang="ts"` / `lang="scss"` keep working.
 *
 * ```js
 * // svelte.config.js
 * import { braceml } from '@braceml/svelte';
 * export default { preprocess: [braceml()] };
 * ```
 */
export function braceml(options: BraceMLPreprocessorOptions = {}) {
  const lang = options.lang ?? 'braceml';
  const pattern = new RegExp(
    `<template\\b[^>]*\\blang=["']${escapeRegExp(lang)}["'][^>]*>([\\s\\S]*?)<\\/template>`,
    'g',
  );

  return {
    name: 'braceml',
    markup({ content, filename }: MarkupInput) {
      if (!content.includes('<template')) return;
      let changed = false;
      const code = content.replace(pattern, (match: string, inner: string, offset: number) => {
        changed = true;
        const innerStart = offset + match.indexOf('>') + 1;
        // keep line numbers in error messages pointing at the .svelte file
        const padded = content.slice(0, innerStart).replace(/[^\n]/g, ' ') + inner;
        return compileSvelte(padded, { filename, indent: options.indent, allowUnknownTags: options.allowUnknownTags }).trim();
      });
      return changed ? { code } : undefined;
    },
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
