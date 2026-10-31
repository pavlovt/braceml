import { parse } from '@babel/parser';
import { joinWithMap } from '@braceml/core';
import type { MappedPiece } from '@braceml/core';
import { compileJsx } from './compiler.js';

const RUNTIME = '@braceml/react';
const FRAGMENT = '__BraceML_Fragment';
const AWAIT = '__BraceML_Await';

export interface BraceMLPluginOptions {
  indent?: string;
  allowUnknownTags?: boolean;
}

interface AstNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

function isNode(value: unknown): value is AstNode {
  return typeof value === 'object' && value !== null && typeof (value as AstNode).type === 'string';
}

function visit(node: AstNode, callback: (node: AstNode) => void): void {
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'extra' || key.endsWith('Comments')) continue;
    if (Array.isArray(value)) value.forEach((v) => isNode(v) && visit(v, callback));
    else if (isNode(value)) visit(value, callback);
  }
}

/** Replaces each braceml`…` tagged template in `code`, or returns null if there are none. */
export function transformBraceML(code: string, filename: string, options: BraceMLPluginOptions = {}) {
  if (!code.includes(RUNTIME)) return null;

  const plugins: ('jsx' | 'typescript')[] = /\.tsx$/.test(filename) ? ['jsx', 'typescript'] : ['jsx'];
  const program = parse(code, { sourceType: 'module', plugins }).program as unknown as AstNode;

  // only the name imported from @braceml/react counts, under any alias
  const tags = new Set<string>();
  visit(program, (node) => {
    if (node.type !== 'ImportDeclaration' || (node.source as { value: string }).value !== RUNTIME) return;
    for (const spec of node.specifiers as AstNode[]) {
      const imported = spec.imported as { name?: string } | undefined;
      if (spec.type === 'ImportSpecifier' && imported?.name === 'braceml') tags.add((spec.local as { name: string }).name);
    }
  });
  if (tags.size === 0) return null;

  const pieces: MappedPiece[] = [];
  const uses = { Fragment: false, Await: false };
  let last = 0;

  visit(program, (node) => {
    if (node.type !== 'TaggedTemplateExpression') return;
    const tag = node.tag as AstNode & { name?: string };
    if (tag.type !== 'Identifier' || !tags.has(tag.name!)) return;

    const quasi = node.quasi as AstNode & { quasis: (AstNode & { value: { raw: string } })[] };
    if (quasi.quasis.length > 1) {
      const offset = quasi.quasis[0].end;
      const line = code.slice(0, offset).split('\n').length;
      throw new Error(`${filename}:${line}: Use {expression} in a BraceML template, not \${expression}`);
    }

    const start = quasi.quasis[0].start;
    // keep line numbers in error messages pointing at the source file
    const padded = code.slice(0, start).replace(/[^\n]/g, ' ') + quasi.quasis[0].value.raw.replace(/\\([`$\\])/g, '$1');
    const output = compileJsx(padded, {
      filename,
      indent: options.indent,
      allowUnknownTags: options.allowUnknownTags,
      names: { Fragment: FRAGMENT, Await: AWAIT },
      track: true,
    });
    uses.Fragment ||= output.uses.Fragment;
    uses.Await ||= output.uses.Await;
    pieces.push({ start: last, end: node.start });
    pieces.push({ code: `(\n${output.code})`, offsets: [null, ...output.offsets!.slice(0, -1), null] });
    last = node.end;
  });
  if (last === 0) return null;
  pieces.push({ start: last, end: code.length });

  const imports: string[] = [];
  if (uses.Fragment) imports.push(`import { Fragment as ${FRAGMENT} } from 'react';`);
  if (uses.Await) imports.push(`import { Await as ${AWAIT} } from '${RUNTIME}';`);
  if (imports.length) pieces.unshift({ code: imports.join(' ') + ' ', offsets: [null] });
  return joinWithMap(code, pieces, filename);
}

/**
 * Vite plugin. Compiles braceml`…` templates in .jsx and .tsx files. Put it
 * before the React plugin.
 *
 * ```js
 * // vite.config.js
 * import react from '@vitejs/plugin-react';
 * import { braceml } from '@braceml/react/vite';
 * export default { plugins: [braceml(), react()] };
 * ```
 */
export function braceml(options: BraceMLPluginOptions = {}) {
  return {
    name: 'braceml',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      const filename = id.split('?')[0];
      if (!/\.[jt]sx$/.test(filename) || filename.includes('/node_modules/')) return null;
      return transformBraceML(code, filename, options);
    },
  };
}
