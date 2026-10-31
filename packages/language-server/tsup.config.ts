import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    target: 'node18',
  },
  {
    // a single CommonJS file: vscode-languageserver is CommonJS
    entry: ['src/bin.ts'],
    format: ['cjs'],
    outExtension: () => ({ js: '.cjs' }),
    noExternal: [/.*/],
    target: 'node18',
  },
]);
