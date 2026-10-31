import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as prettier from 'prettier';
import { format, formatTemplates, parse } from '@braceml/core';
import { htmlToBraceml } from '@braceml/convert';
import { compileHtml } from '@braceml/html';
import plugin from '@braceml/prettier-plugin';

const root = fileURLToPath(new URL('../spec/fixtures/', import.meta.url));
const parses = (name: string) => {
  try {
    parse(readFileSync(join(root, name, 'input.braceml'), 'utf8'), { allowUnknownTags: true });
    return true;
  } catch {
    return false;
  }
};

describe('format', () => {
  it.each(readdirSync(root).filter(parses))('is stable and keeps the meaning of %s', (name) => {
    const input = readFileSync(join(root, name, 'input.braceml'), 'utf8');
    const once = format(input);
    expect(format(once)).toBe(once);
  });

  it('fixes indentation and expands one-line blocks', () => {
    expect(format(`div {\n      p 'a'\n  tr { @render row(x) }\n}`)).toBe(
      `div {\n  p 'a'\n  tr {\n    @render row(x)\n  }\n}\n`,
    );
  });

  it('keeps comments, blank lines, quotes and short bodies', () => {
    const source = [
      '// top',
      '.a {',
      `  p "it's" // trailing`,
      '',
      '  /* kept */',
      `  li > a href=/ title='x' 'Home'`,
      '  div {}',
      '}',
      '',
    ].join('\n');
    expect(format(source)).toBe(source);
  });

  it('keeps comments in a group and before else', () => {
    const output = format(`input(\n  // why\n  type=text\n)\nif a {\n}\n// note\nelse {\n  p 'x'\n}`);
    expect(output).toContain('  // why\n  type=text');
    expect(output).toContain("} else {\n  // note\n  p 'x'");
  });

  it('moves long heads to a group and collapses nothing', () => {
    const long = `input ${Array.from({ length: 12 }, (_, i) => `data-attribute-${i}=value`).join(' ')}`;
    expect(format(long).split('\n')[0]).toBe('input(');
    expect(format(`a(\n  href=/\n) 'x'`)).toBe(`a(\n  href=/\n) 'x'\n`);
    expect(format(`a(href=/) 'x'`)).toBe(`a href=/ 'x'\n`);
  });

  it('formats every block form', () => {
    const source = [
      'await p then v {',
      "  p '{v}'",
      '} catch e {',
      "  p 'x'",
      '}',
      'await q catch e {',
      "  p 'y'",
      '}',
      'each xs as x, i (x.id) {',
      "  p 'a'",
      '} else {',
      "  p 'b'",
      '}',
      'key k {',
      '  Page',
      '}',
      'snippet row(a) {',
      "  td 'a'",
      '}',
      '@debug',
      '',
    ].join('\n');
    expect(format(source)).toBe(source);
  });

  it('leaves multi-line text alone', () => {
    const source = `pre 'a\n    b'\n`;
    expect(format(source)).toBe(source);
  });

  it('accepts tags the compiler would reject', () => {
    expect(format(`whatever 'x'`)).toBe(`whatever 'x'\n`);
  });

  it('reports syntax errors', () => {
    expect(() => format('div {')).toThrow("Unclosed '{'");
  });
});

describe('formatTemplates', () => {
  it('formats blocks in a Svelte file and nothing else', () => {
    const file = `<script>\n  let   a;\n</script>\n\n<template lang="braceml">\n p 'x'\n      p 'y'\n</template>\n`;
    expect(formatTemplates(file, 'svelte')).toBe(
      `<script>\n  let   a;\n</script>\n\n<template lang="braceml">\n  p 'x'\n  p 'y'\n</template>\n`,
    );
  });

  it('formats tagged templates in a JSX file', () => {
    const file = [`import { braceml } from '@braceml/react';`, 'function A() {', '  return braceml`', "  p 'x'", '  `;', '}', ''].join('\n');
    const expected = [`import { braceml } from '@braceml/react';`, 'function A() {', '  return braceml`', "    p 'x'", '  `;', '}', ''].join('\n');
    expect(formatTemplates(file, 'jsx')).toBe(expected);
    expect(formatTemplates(expected, 'jsx')).toBe(expected);
  });

  it('keeps CRLF line endings', () => {
    expect(formatTemplates(`div {\r\n p 'x'\r\n}\r\n`, 'braceml')).toBe(`div {\r\n  p 'x'\r\n}\r\n`);
  });
});

describe('prettier plugin', () => {
  it('formats with Prettier options', async () => {
    const output = await prettier.format(`div {\np 'x'\n}`, { parser: 'braceml', plugins: [plugin], tabWidth: 4 });
    expect(output).toBe(`div {\n    p 'x'\n}\n`);
  });

  it('finds the parser from the file name', async () => {
    const output = await prettier.format(`div {\n\tp 'x'\n}`, { filepath: 'a.braceml', plugins: [plugin] });
    expect(output).toBe(`div {\n  p 'x'\n}\n`);
  });
});

describe('htmlToBraceml', () => {
  const normal = (html: string) => html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
  const roundTrip = (html: string) => expect(normal(compileHtml(htmlToBraceml(html)))).toBe(normal(html));

  it('uses selectors, chains and short bodies', () => {
    expect(htmlToBraceml('<div id="a" class="b c"><ul><li><a href="/">Home</a></li></ul></div>')).toBe(
      `#a.b.c > ul > li > a href=/ 'Home'\n`,
    );
  });

  it('keeps classes in class on request', () => {
    expect(htmlToBraceml('<p class="w-1.5 a">x</p>')).toBe(`p.a class="w-1.5" 'x'\n`);
    expect(htmlToBraceml('<p class="a b">x</p>', { classAttribute: true })).toBe(`p class="a b" 'x'\n`);
  });

  it('keeps text with inline tags together', () => {
    expect(htmlToBraceml('<p>Hello <strong>you</strong>, welcome.</p>')).toBe(`p 'Hello <strong>you</strong>, welcome.'\n`);
  });

  it('quotes and escapes', () => {
    expect(htmlToBraceml(`<p title="a b">it's &amp; "x"</p>`)).toBe(`p title="a b" 'it\\'s &amp; "x"'\n`);
  });

  it('keeps doctype, comments, scripts and pre', () => {
    const output = htmlToBraceml('<!doctype html><html><head><script>if (a < b) {}</script></head><body><!-- hi --><pre>a\n  b</pre></body></html>');
    expect(output).toContain(`'<!doctype html>'`);
    expect(output).toContain(`/* hi */`);
    expect(compileHtml(output)).toContain('<pre>a\n  b</pre>');
    expect(compileHtml(output)).toContain('if (a < b) {}');
  });

  it.each([
    '<nav class="menu"><ul><li><a href="/">Home</a></li><li><a href="/x?a=1">X</a></li></ul></nav>',
    '<form action="/join" method="post"><label for="e">Email</label><input id="e" type="email" required><button class="p" type="submit">Join</button></form>',
    '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>',
    '<div></div><section><h1>T</h1><p>One</p><p>Two <em>three</em></p></section>',
    '<svg viewBox="0 0 10 10"><path d="M0 0 L1 1"></path></svg>',
  ])('round trips %s', roundTrip);
});
