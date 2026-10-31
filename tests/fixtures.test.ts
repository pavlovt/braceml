import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { transformSync } from 'esbuild';
import { compile as svelteCompile } from 'svelte/compiler';
import { compileHtml } from '@braceml/html';
import { compileReact } from '@braceml/react/compiler';
import { compileSvelte } from '@braceml/svelte';

const root = fileURLToPath(new URL('../spec/fixtures/', import.meta.url));
const targets = { html: compileHtml, svelte: compileSvelte, react: compileReact };

describe.each(readdirSync(root))('fixture %s', (name) => {
  const dir = join(root, name);
  const input = readFileSync(join(dir, 'input.braceml'), 'utf8');

  for (const [target, compile] of Object.entries(targets)) {
    const expectedFile = join(dir, `expected.${target}`);
    const errorFile = join(dir, `error.${target}.txt`);

    if (existsSync(expectedFile)) {
      it(`${target}: matches expected output`, () => {
        expect(compile(input, { filename: 'input.braceml' })).toBe(readFileSync(expectedFile, 'utf8'));
      });
    }
    if (existsSync(errorFile)) {
      it(`${target}: fails with the expected error`, () => {
        const message = readFileSync(errorFile, 'utf8').trim();
        expect(() => compile(input, { filename: 'input.braceml' })).toThrow(message);
      });
    }
  }

  const svelteOut = join(dir, 'expected.svelte');
  if (existsSync(svelteOut) && !existsSync(join(dir, 'svelte.no-compile'))) {
    it('svelte: output is accepted by the Svelte 5 compiler', () => {
      const markup = readFileSync(svelteOut, 'utf8');
      // optional script.svelte.js declares the identifiers a fixture uses
      const scriptFile = join(dir, 'script.svelte.js');
      const script = existsSync(scriptFile) ? readFileSync(scriptFile, 'utf8') : '';
      const component = `<script>${script}</script>\n${markup}`;
      expect(() => svelteCompile(component, { filename: `${name}.svelte` })).not.toThrow();
    });
  }

  const reactOut = join(dir, 'expected.react');
  if (existsSync(reactOut)) {
    it('react: output is valid JSX', () => {
      expect(() => transformSync(readFileSync(reactOut, 'utf8'), { loader: 'jsx' })).not.toThrow();
    });
  }
});
