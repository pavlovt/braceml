import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const pkg = (name: string) => fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@braceml/core': pkg('core'),
      '@braceml/html': pkg('html'),
      '@braceml/svelte': pkg('svelte'),
    },
  },
  test: { include: ['tests/**/*.test.ts', 'packages/*/test/**/*.test.ts'] },
});
