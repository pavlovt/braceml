import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const pkg = (name: string) => fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@braceml/core': pkg('core'),
      '@braceml/html': pkg('html'),
      '@braceml/svelte': pkg('svelte'),
      '@braceml/react/compiler': fileURLToPath(new URL('./packages/react/src/compiler.ts', import.meta.url)),
      '@braceml/react/vite': fileURLToPath(new URL('./packages/react/src/vite.ts', import.meta.url)),
      '@braceml/react': pkg('react'),
    },
  },
  test: { include: ['tests/**/*.test.ts', 'packages/*/test/**/*.test.ts'] },
});
