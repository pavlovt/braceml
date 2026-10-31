import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/compiler.ts', 'src/vite.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node18',
  external: ['react'],
});
