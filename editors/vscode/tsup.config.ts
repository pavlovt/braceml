import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    extension: 'src/extension.ts',
    server: '../../packages/language-server/src/bin.ts',
  },
  format: ['cjs'],
  outExtension: () => ({ js: '.cjs' }),
  external: ['vscode'],
  noExternal: [/^(?!vscode$)/],
  clean: true,
  target: 'node18',
});
