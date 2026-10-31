/**
 * Regenerates expected.* files from the current compiler output.
 * Review the git diff carefully before committing!
 *   pnpm fixtures:update
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileHtml } from '../packages/html/src/index.ts';
import { compileReact } from '../packages/react/src/compiler.ts';
import { compileSvelte } from '../packages/svelte/src/index.ts';

const root = fileURLToPath(new URL('../spec/fixtures/', import.meta.url));
const targets = { html: compileHtml, svelte: compileSvelte, react: compileReact };

for (const name of readdirSync(root)) {
  const dir = join(root, name);
  const input = readFileSync(join(dir, 'input.braceml'), 'utf8');
  for (const [target, compile] of Object.entries(targets)) {
    const out = join(dir, `expected.${target}`);
    const err = join(dir, `error.${target}.txt`);
    try {
      writeFileSync(out, compile(input, { filename: 'input.braceml' }));
      if (existsSync(err)) unlinkSync(err);
    } catch (e) {
      writeFileSync(err, (e as Error).message.split(' (input.braceml')[0] + '\n');
      if (existsSync(out)) unlinkSync(out);
    }
  }
}
console.log('fixtures updated');
