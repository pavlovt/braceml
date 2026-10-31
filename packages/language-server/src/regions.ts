import type { TextDocument } from 'vscode-languageserver-textdocument';

/** A stretch of a document that holds BraceML source. */
export interface Region {
  /** offset of the first BraceML character in the document */
  start: number;
  source: string;
}

const TEMPLATE = /<template\b[^>]*\blang=["']braceml["'][^>]*>([\s\S]*?)<\/template>/g;

/** .braceml files are one region; .svelte files have one per `<template lang="braceml">`. */
export function findRegions(document: TextDocument): Region[] {
  const text = document.getText();
  if (document.languageId !== 'svelte') return [{ start: 0, source: text }];
  return [...text.matchAll(TEMPLATE)].map((m) => ({
    start: m.index + m[0].indexOf('>') + 1,
    source: m[1],
  }));
}

export function regionAt(document: TextDocument, offset: number): Region | undefined {
  return findRegions(document).find((r) => offset >= r.start && offset <= r.start + r.source.length);
}
