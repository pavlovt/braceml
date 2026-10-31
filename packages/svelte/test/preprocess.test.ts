import { describe, expect, it } from 'vitest';
import { compile, preprocess } from 'svelte/compiler';
import { braceml } from '../src/index.js';

const component = `<script lang="ts">
  let count = $state(0);
</script>

<template lang="braceml">
  button onclick={() => count++} 'Clicked {count} times'
</template>

<style>
  button { color: red; }
</style>
`;

describe('svelte preprocessor', () => {
  it('replaces the braceml template and keeps script and style', async () => {
    const { code } = await preprocess(component, [braceml()], { filename: 'Counter.svelte' });
    expect(code).toContain('<button onclick={() => count++}>Clicked {count} times</button>');
    expect(code).toContain('<script lang="ts">');
    expect(code).toContain('button { color: red; }');
    expect(code).not.toContain('<template');
  });

  it('produces a component the Svelte compiler accepts', async () => {
    const { code } = await preprocess(component.replace(' lang="ts"', ''), [braceml()], { filename: 'Counter.svelte' });
    expect(() => compile(code, { filename: 'Counter.svelte' })).not.toThrow();
  });

  it('leaves files without a braceml template untouched', async () => {
    const plain = '<p>hello</p>';
    const { code } = await preprocess(plain, [braceml()], { filename: 'Plain.svelte' });
    expect(code).toBe(plain);
  });

  it('reports errors with line numbers of the .svelte file', async () => {
    const broken = '<script></script>\n\n<template lang="braceml">\n  div {\n</template>\n';
    await expect(preprocess(broken, [braceml()], { filename: 'Broken.svelte' })).rejects.toThrow('Broken.svelte:4:');
  });
});
