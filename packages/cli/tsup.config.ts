import { copyFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node18',
  // `braceml agents` writes this reference into a project's AGENTS.md.
  onSuccess: async () => copyFileSync('../../docs/llms.txt', 'dist/llms.txt'),
});
