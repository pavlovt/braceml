import { describe, expect, it } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { contextAt, findRegions, getCompletions, getDiagnostics, getHover } from '../src/index.js';

const braceml = (text: string) => TextDocument.create('file:///a.braceml', 'braceml', 1, text);
const svelte = (text: string) => TextDocument.create('file:///a.svelte', 'svelte', 1, text);

/** `|` marks the cursor */
function cursor(text: string, make = braceml) {
  const at = text.indexOf('|');
  const document = make(text.replace('|', ''));
  return { document, position: document.positionAt(at) };
}
const labels = (text: string, make = braceml) => {
  const { document, position } = cursor(text, make);
  return getCompletions(document, position).map((i) => i.label);
};
const kind = (text: string) => contextAt(text.replace('|', ''), text.indexOf('|'));

describe('regions', () => {
  it('finds every template block and ignores the rest of a Svelte file', () => {
    const doc = svelte(`<script>let a;</script>\n<template lang="braceml">p 'x'</template>\n<p>y</p>`);
    const [region, ...rest] = findRegions(doc);
    expect(region.source).toBe("p 'x'");
    expect(doc.getText().slice(region.start, region.start + 5)).toBe("p 'x'");
    expect(rest).toEqual([]);
  });
});

describe('diagnostics', () => {
  it('reports nothing for valid code', () => {
    expect(getDiagnostics(braceml("if a {\n  p 'x'\n} else {\n  Card title={t}\n}"))).toEqual([]);
  });

  it('reports parser errors without the code frame', () => {
    const [d] = getDiagnostics(braceml("div {\n  p 'x'\n"));
    expect(d.message).toBe("Unclosed '{'");
    expect(d.range.start).toEqual({ line: 0, character: 4 });
    expect(d.severity).toBe(1);
  });

  it('marks the whole unknown element', () => {
    const [d] = getDiagnostics(braceml('p {name}'));
    expect(d.message).toContain("Unknown element 'name'");
    expect(d.range).toEqual({ start: { line: 0, character: 3 }, end: { line: 0, character: 7 } });
  });

  it('reports errors from the printer', () => {
    const [d] = getDiagnostics(braceml("input ' Name'"));
    expect(d.message).toContain('void element');
  });

  it('maps positions into the .svelte file', () => {
    const [d] = getDiagnostics(svelte(`<script>\n</script>\n\n<template lang="braceml">\n  foo 'x'\n</template>\n`));
    expect(d.range.start).toEqual({ line: 4, character: 2 });
  });

  it('checks each template block on its own', () => {
    const doc = svelte(`<template lang="braceml">foo</template>\n<template lang="braceml">bar</template>`);
    expect(getDiagnostics(doc).map((d) => d.range.start.line)).toEqual([0, 1]);
  });

  it('ignores HTML in a Svelte file', () => {
    expect(getDiagnostics(svelte('<foo>{x}</foo>'))).toEqual([]);
  });

  it('honors allowUnknownTags', () => {
    expect(getDiagnostics(braceml("foo 'x'"), { allowUnknownTags: true })).toEqual([]);
  });

  it('warns that {title} is not a prop shorthand', () => {
    const [d] = getDiagnostics(braceml('Card {title}'));
    expect(d.severity).toBe(2);
    expect(d.message).toContain('title={title}');
    expect(d.range).toEqual({ start: { line: 0, character: 5 }, end: { line: 0, character: 12 } });
  });

  it('does not warn about a real child element', () => {
    expect(getDiagnostics(braceml('Card {\n  title\n}'))).toEqual([]);
    expect(getDiagnostics(braceml("Card { title 'x' }"))).toEqual([]);
  });

  it('warns about a class split by a dot', () => {
    const [d] = getDiagnostics(braceml('.w-1.5'));
    expect(d.severity).toBe(2);
    expect(d.message).toContain('class="w-1.5"');
    expect(d.range).toEqual({ start: { line: 0, character: 1 }, end: { line: 0, character: 6 } });
  });
});

describe('cursor context', () => {
  it.each([
    ['|', 'node'],
    ['di|', 'node'],
    ['div {\n  |', 'node'],
    ['if a {\n  |', 'node'],
    ["} else {\n  sp|", 'node'],
    ['if check({ a: 1 }) {\n  |', 'node'],
    ['li > |', 'node'],
    ['@|', 'special'],
    ['@render |', 'render'],
    ['a |', 'attribute'],
    ['a hr|', 'attribute'],
    ['.row |', 'attribute'],
    ['input(\n  type=text\n  |', 'attribute'],
    ['a href=/ tar|', 'attribute'],
    ['Card {...props} |', 'attribute'],
    ['input type=|', 'value'],
    ['input type="|', 'value'],
    ["p 'hello |", 'none'],
    ['// comment |', 'none'],
    ['/* comment |', 'none'],
    ['a href={|', 'none'],
    ['a href={x ? 1 |', 'none'],
    ['if |', 'none'],
    ['each items as |', 'none'],
    ['if a > 0 |', 'none'],
    ['@html |', 'none'],
    ['.ro|', 'none'],
  ])('%j is %s', (text, expected) => {
    expect(kind(text).kind).toBe(expected);
  });

  it('keeps the tag name for attributes', () => {
    expect(kind('input.a#b(\n  |')).toMatchObject({ kind: 'attribute', tag: 'input' });
    expect(kind('ul > li > a |')).toMatchObject({ kind: 'attribute', tag: 'a' });
    expect(kind('.row |')).toMatchObject({ kind: 'attribute', tag: 'div' });
  });

  it('leaves the head at the end of a line', () => {
    expect(kind('a href=/\n|').kind).toBe('node');
    expect(kind("a 'text'\n|").kind).toBe('node');
    expect(kind('a href={x}\n|').kind).toBe('node');
  });

  it('survives code it can not parse', () => {
    expect(kind(') ] = |')).toBeDefined();
    expect(kind('}}} {{{ |').kind).toBe('node');
  });
});

describe('completion', () => {
  it('offers tags, blocks and svelte elements for a new node', () => {
    const items = labels('|');
    expect(items).toEqual(expect.arrayContaining(['div', 'each', 'if', 'svelte:head']));
  });

  it('offers no blocks after >', () => {
    const items = labels('li > |');
    expect(items).toContain('a');
    expect(items).not.toContain('if');
  });

  it('offers nothing inside text or expressions', () => {
    expect(labels("p '|'")).toEqual([]);
    expect(labels('a href={|}')).toEqual([]);
  });

  it('offers nothing outside a template block', () => {
    expect(labels('<p>|</p>\n<template lang="braceml">div</template>', svelte)).toEqual([]);
  });

  it('offers imported components in Svelte files', () => {
    const doc = (body: string) =>
      `<script lang="ts">\n  import Card from './Card.svelte';\n  import { Icon, helper } from './ui';\n  import type { Props } from './types';\n</script>\n<template lang="braceml">\n  ${body}\n</template>`;
    const items = labels(doc('|'), svelte);
    expect(items).toEqual(expect.arrayContaining(['Card', 'Icon']));
    expect(items).not.toContain('Props');
    expect(items).not.toContain('helper');
  });

  it('offers attributes for the element', () => {
    const items = labels('input |');
    expect(items).toEqual(expect.arrayContaining(['type', 'class', 'onclick', 'bind:value']));
    expect(labels('a |')).not.toContain('type');
  });

  it('offers nothing for component attributes', () => {
    expect(labels('Card |')).toEqual([]);
  });

  it('offers attribute values', () => {
    expect(labels('input type=|')).toContain('email');
    expect(labels('button type=|')).toEqual(['button', 'submit', 'reset']);
  });

  it('offers snippets after @render', () => {
    expect(labels('snippet row(x) {\n}\n@render |')).toEqual(['children', 'row']);
  });

  it('replaces the typed prefix', () => {
    const { document, position } = cursor('sve|');
    const item = getCompletions(document, position).find((i) => i.label === 'svelte:head');
    expect(item?.textEdit).toMatchObject({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
      newText: 'svelte:head',
    });
  });

  it('keeps @ when completing a special tag', () => {
    const { document, position } = cursor('@ren|');
    const item = getCompletions(document, position).find((i) => i.label === 'render');
    expect(item?.textEdit).toMatchObject({ range: { start: { line: 0, character: 1 } } });
  });
});

describe('hover', () => {
  const hover = (text: string) => {
    const { document, position } = cursor(text);
    const h = getHover(document, position);
    return h ? (h.contents as { value: string }).value : null;
  };

  it('explains block keywords', () => {
    expect(hover('e|ach items as item {\n}')).toContain('{#each');
    expect(hover('if a {\n} el|se {\n}')).toContain('`if`');
    expect(hover('await p {\n} th|en v {\n}')).toContain('{:then');
  });

  it('explains special tags', () => {
    expect(hover('@ren|der row(x)')).toContain('{@render');
  });

  it('ignores the same words elsewhere', () => {
    expect(hover("p 'i|f only'")).toBeNull();
    expect(hover('a href={i|f}')).toBeNull();
    expect(hover('d|iv')).toBeNull();
  });
});

describe('JSX templates', () => {
  const jsx = (text: string) => TextDocument.create('file:///a.jsx', 'javascriptreact', 1, text);
  const head = `import { braceml } from '@braceml/react';\nimport { TodoItem } from './TodoItem';\n`;

  it('finds tagged templates and skips comments', () => {
    const doc = jsx(`${head}// braceml\`p 'no'\`\nconst a = braceml\`p 'yes'\`;\n`);
    const regions = findRegions(doc);
    expect(regions.map((r) => r.source)).toEqual(["p 'yes'"]);
    expect(doc.getText().slice(regions[0].start, regions[0].start + 7)).toBe("p 'yes'");
  });

  it('ignores files that do not import the tag', () => {
    expect(findRegions(jsx("const a = braceml`p 'x'`;"))).toEqual([]);
  });

  it('reports errors at the right place, with the React target', () => {
    const doc = jsx(`${head}const a = braceml\`\n  input bind:value={v}\n\`;\n`);
    const [d] = getDiagnostics(doc);
    expect(d.message).toContain("'bind:value' is not supported by the 'react' target");
    expect(d.range.start.line).toBe(3);
  });

  it('accepts React attributes and Svelte-free templates', () => {
    expect(getDiagnostics(jsx(`${head}const a = braceml\`p onClick={f} 'x'\`;`))).toEqual([]);
  });

  it('completes inside the template and not outside it', () => {
    const text = `${head}const a = braceml\`\n  |\n\`;\n`;
    const offset = text.indexOf('|');
    const doc = jsx(text.replace('|', ''));
    const labels = getCompletions(doc, doc.positionAt(offset)).map((i) => i.label);
    expect(labels).toContain('TodoItem');
    expect(labels).toContain('each');
    expect(getCompletions(doc, doc.positionAt(5))).toEqual([]);
  });

  it('shows hover help', () => {
    const text = `${head}const a = braceml\`\n  each xs as x { }\n\`;\n`;
    const doc = jsx(text);
    expect(getHover(doc, doc.positionAt(text.indexOf('each') + 1))).not.toBeNull();
  });
});
