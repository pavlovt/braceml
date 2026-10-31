#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { BraceMLError } from '@braceml/core';
import { compileHtml } from '@braceml/html';
import { compileReact } from '@braceml/react/compiler';
import { compileSvelte } from '@braceml/svelte';

const HELP = `Usage: braceml <file.braceml> [options]

Options:
  -t, --target <html|svelte|react>   Output target (default: html)
  -o, --out <file>                   Write to a file instead of stdout
  -h, --help                         Show this help
  -v, --version                      Show the version
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    target: { type: 'string', short: 't', default: 'html' },
    out: { type: 'string', short: 'o' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
  },
});

if (values.version) {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}
if (values.help || positionals.length !== 1) {
  process.stdout.write(HELP);
  process.exit(values.help ? 0 : 1);
}

const file = positionals[0];
const compilers = { html: compileHtml, svelte: compileSvelte, react: compileReact } as const;
const target = values.target as keyof typeof compilers;
if (!(target in compilers)) {
  console.error(`Unknown target '${values.target}'. Use html, svelte or react.`);
  process.exit(1);
}

try {
  const output = compilers[target](readFileSync(file, 'utf8'), { filename: file });
  if (values.out) writeFileSync(values.out, output);
  else process.stdout.write(output);
} catch (err) {
  if (err instanceof BraceMLError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}
