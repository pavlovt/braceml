import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import { compile, preprocess } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';
import { joinWithMap } from '@braceml/core';
import { braceml } from '@braceml/svelte';
import { transformBraceML } from '@braceml/react/vite';

const lineOf = (code: string, text: string) => code.slice(0, code.indexOf(text)).split('\n').length;
const columnOf = (code: string, text: string) => {
  const at = code.indexOf(text);
  return at - code.lastIndexOf('\n', at) - 1;
};
const trace = (map: unknown, code: string, text: string) =>
  originalPositionFor(new TraceMap(map as never), { line: lineOf(code, text), column: columnOf(code, text) });

describe('joinWithMap', () => {
  it('maps copied lines and generated lines', () => {
    const source = 'one\ntwo\nthree\n';
    const { code, map } = joinWithMap(source, [
      { start: 0, end: 4 },
      { code: '  TWO', offsets: [4] },
      { start: 7, end: source.length },
    ]);
    expect(code).toBe('one\n  TWO\nthree\n');
    expect(trace(map, code, 'one')).toMatchObject({ line: 1, column: 0 });
    expect(trace(map, code, 'TWO')).toMatchObject({ line: 2, column: 0 });
    expect(trace(map, code, 'three').line).toBe(3);
  });
});

describe('svelte preprocessor', () => {
  const file = ['<script>', '  let a = 1;', '  const handler = () => a;', '</script>', '', '<template lang="braceml">', '  div {', "    h1 'Hi'", '', "    p.note onclick={handler} 'x'", '  }', '</template>', '', '<style>', '  p { color: red; }', '</style>', ''].join('\n');

  it('maps markup and the rest of the file', async () => {
    const { code, map } = braceml().markup({ content: file, filename: 'App.svelte' })!;
    expect(trace(map, code, '<p class="note"').line).toBe(10);
    expect(trace(map, code, '<h1').line).toBe(8);
    expect(trace(map, code, '<style>').line).toBe(14);
    expect(trace(map, code, 'let a').line).toBe(2);
  });

  it('survives the Svelte compiler', async () => {
    const processed = await preprocess(file, [braceml()], { filename: 'App.svelte' });
    const { js } = compile(processed.code, { filename: 'App.svelte', sourcemap: processed.map as never });
    const at = js.code.lastIndexOf('handler');
    const line = js.code.slice(0, at).split('\n').length;
    const column = at - js.code.lastIndexOf('\n', at) - 1;
    expect(originalPositionFor(new TraceMap(js.map as never), { line, column }).line).toBe(10);
  });
});

describe('vite plugin', () => {
  const file = [`import { braceml } from '@braceml/react';`, 'const before = 1;', 'export const A = () => braceml`', '  div {', '    each xs as x (x) {', "      h1 '{x}'", '    }', '    key k {', "      p 'y'", '    }', '  }', '`;', 'const after = 2;', ''].join('\n');

  it('maps templates and the code around them', () => {
    const { code, map } = transformBraceML(file, '/App.jsx')!;
    expect(trace(map, code, '<h1').line).toBe(6);
    expect(trace(map, code, '<p>').line).toBe(9);
    expect(trace(map, code, 'const before').line).toBe(2);
  });

  it('does not shift lines with helper imports', () => {
    const { code } = transformBraceML(file, '/App.jsx')!;
    expect(code.split('\n')[1]).toBe('const before = 1;');
  });
});
