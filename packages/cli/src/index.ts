#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { BraceMLError, fileKind, formatTemplates } from '@braceml/core';
import { htmlToBraceml } from '@braceml/convert';
import { compileHtml } from '@braceml/html';
import { compileReact } from '@braceml/react/compiler';
import { compileSvelte } from '@braceml/svelte';

const HELP = `Usage: braceml <file.braceml> [options]
       braceml fmt <files...> [--check]
       braceml convert <file.html> [options]

Compile options:
  -t, --target <html|svelte|react>   Output target (default: html)
  -o, --out <file>                   Write to a file instead of stdout

Format options:
  --check                            Report unformatted files and change nothing

Convert options:
  -o, --out <file>                   Write to a file instead of stdout
  --class-attribute                  Keep classes in a class attribute (for Tailwind)

  -h, --help                         Show this help
  -v, --version                      Show the version
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    target: { type: 'string', short: 't', default: 'html' },
    out: { type: 'string', short: 'o' },
    check: { type: 'boolean' },
    'class-attribute': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
  },
});

if (values.version) {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}

function output(text: string): void {
  if (values.out) writeFileSync(values.out, text);
  else process.stdout.write(text);
}

function formatFiles(files: string[]): number {
  let unformatted = 0;
  for (const file of files) {
    const kind = fileKind(file);
    if (!kind) {
      console.error(`Can't format '${file}'. Use a .braceml, .svelte, .jsx or .tsx file.`);
      return 1;
    }
    const text = readFileSync(file, 'utf8');
    const formatted = formatTemplates(text, kind, { filename: file });
    if (formatted === text) continue;
    if (values.check) {
      console.log(file);
      unformatted++;
    } else {
      writeFileSync(file, formatted);
      console.log(`Formatted ${file}`);
    }
  }
  return unformatted ? 1 : 0;
}

function compile(file: string): number {
  const compilers = { html: compileHtml, svelte: compileSvelte, react: compileReact } as const;
  const target = values.target as keyof typeof compilers;
  if (!(target in compilers)) {
    console.error(`Unknown target '${values.target}'. Use html, svelte or react.`);
    return 1;
  }
  output(compilers[target](readFileSync(file, 'utf8'), { filename: file }));
  return 0;
}

function main(): number {
  const [command, ...rest] = positionals;
  if (command === 'fmt' && rest.length > 0) return formatFiles(rest);
  if (command === 'convert' && rest.length === 1) {
    output(htmlToBraceml(readFileSync(rest[0], 'utf8'), { classAttribute: values['class-attribute'] }));
    return 0;
  }
  if (positionals.length === 1 && command !== 'fmt' && command !== 'convert') return compile(command);
  process.stdout.write(HELP);
  return values.help ? 0 : 1;
}

try {
  process.exitCode = values.help ? (process.stdout.write(HELP), 0) : main();
} catch (err) {
  if (!(err instanceof BraceMLError)) throw err;
  console.error(err.message);
  process.exitCode = 1;
}
