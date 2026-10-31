import type { TextDocument } from 'vscode-languageserver-textdocument';
import { MarkupKind } from 'vscode-languageserver';
import type { Hover, Position } from 'vscode-languageserver';
import { contextAt } from './context.js';
import { BLOCKS, CONTINUATIONS, SPECIALS } from './data.js';
import { regionAt } from './regions.js';

const BLOCK_DOCS = new Map(BLOCKS.map((b) => [b.label, b.doc]));
const SPECIAL_DOCS = new Map(SPECIALS.map((s) => [s.label, s.doc]));

export function getHover(document: TextDocument, position: Position): Hover | null {
  const offset = document.offsetAt(position);
  const region = regionAt(document, offset);
  if (!region) return null;
  const inner = offset - region.start;
  const { source } = region;

  let start = inner;
  let end = inner;
  while (start > 0 && /\w/.test(source[start - 1])) start--;
  while (end < source.length && /\w/.test(source[end])) end++;
  const word = source.slice(start, end);
  if (!word) return null;

  // `} else if x {`: the `if` belongs to the `else` before it
  const context = contextAt(source, end);
  let doc: string | undefined;
  if (context.kind === 'special') doc = SPECIAL_DOCS.get(word);
  else if (context.kind === 'node' && !context.chained) doc = BLOCK_DOCS.get(word) ?? CONTINUATIONS[word];
  if (!doc) return null;

  return {
    contents: { kind: MarkupKind.Markdown, value: doc },
    range: { start: document.positionAt(region.start + start), end: document.positionAt(region.start + end) },
  };
}
