import { describe, expect, it } from 'vitest';
import { BraceMLError, parse, splitEachHeader } from '@braceml/core';
import { compileSvelte } from '@braceml/svelte';

describe('errors', () => {
  it('reports line and column with a code frame', () => {
    try {
      parse('div {\n  p \'ok\'\n  span {\n', { filename: 'x.braceml' });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BraceMLError);
      const err = e as BraceMLError;
      expect(err.line).toBe(3);
      expect(err.column).toBe(8);
      expect(err.message).toContain('x.braceml:3:8');
      expect(err.frame).toContain('> 3 |   span {');
    }
  });

  it('rejects an unexpected closing brace', () => {
    expect(() => parse("p 'x' }")).toThrow("Unexpected '}'");
  });

  it('rejects children on void elements', () => {
    expect(() => compileSvelte("input { 'x' }")).toThrow('void element');
  });

  it('allows unknown tags when asked', () => {
    expect(compileSvelte('foo', { allowUnknownTags: true })).toBe('<foo></foo>\n');
  });
});

describe('expressions', () => {
  it('respects strings and nested braces in attribute expressions', () => {
    const out = compileSvelte('div title={`a ${ {b: "}"}.b }`} \'x\'');
    expect(out).toBe('<div title={`a ${ {b: "}"}.b }`}>x</div>\n');
  });

  it('allows object literals inside parentheses in block headers', () => {
    const out = compileSvelte("if check({ a: 1 }) { p 'y' }");
    expect(out).toContain('{#if check({ a: 1 })}');
  });

  it('stops a special tag at a closing brace on the same line', () => {
    expect(compileSvelte('div { @html raw }')).toBe('<div>\n  {@html raw}\n</div>\n');
  });
});

describe('each header', () => {
  it.each([
    ['items as item', { collection: 'items', pattern: 'item', index: null, key: null }],
    ['items as item, i', { collection: 'items', pattern: 'item', index: 'i', key: null }],
    ['items as item, i (item.id)', { collection: 'items', pattern: 'item', index: 'i', key: 'item.id' }],
    ['items as { id, name } (id)', { collection: 'items', pattern: '{ id, name }', index: null, key: 'id' }],
    ['items', { collection: 'items', pattern: '', index: null, key: null }],
  ])('%s', (header, expected) => {
    expect(splitEachHeader(header)).toEqual(expected);
  });
});

describe('await short forms', () => {
  it('await … then', () => {
    expect(compileSvelte("await p then v { p '{v}' }")).toBe('{#await p then v}\n  <p>{v}</p>\n{/await}\n');
  });
});
