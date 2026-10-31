import { findTemplates } from '@braceml/core';
import type { FileKind } from '@braceml/core';
import type { TextDocument } from 'vscode-languageserver-textdocument';

/** A stretch of a document that holds BraceML source. */
export interface Region {
  /** offset of the first BraceML character in the document */
  start: number;
  source: string;
  /** the target its code compiles for */
  target: 'svelte' | 'react';
}

export function documentKind(document: TextDocument): FileKind {
  if (document.languageId === 'svelte') return 'svelte';
  if (document.languageId === 'javascriptreact' || document.languageId === 'typescriptreact') return 'jsx';
  return 'braceml';
}

/** .braceml files are one region; other files have one per template. */
export function findRegions(document: TextDocument): Region[] {
  const kind = documentKind(document);
  const target = kind === 'jsx' ? 'react' : 'svelte';
  return findTemplates(document.getText(), kind).map((region) => ({ ...region, target }));
}

export function regionAt(document: TextDocument, offset: number): Region | undefined {
  return findRegions(document).find((r) => offset >= r.start && offset <= r.start + r.source.length);
}
