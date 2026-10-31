import { format } from './format.js';
import type { FormatOptions } from './format.js';

export type FileKind = 'braceml' | 'svelte' | 'jsx';

/** BraceML source inside a file. */
export interface TemplateRegion {
  /** offset of the first BraceML character */
  start: number;
  source: string;
}

const SVELTE_TEMPLATE = /<template\b[^>]*\blang=["']braceml["'][^>]*>([\s\S]*?)<\/template>/g;
const JSX_TEMPLATE = /\bbraceml\s*`/g;

/** The kind of file a name refers to, or null if it can't hold BraceML. */
export function fileKind(filename: string): FileKind | null {
  if (filename.endsWith('.braceml')) return 'braceml';
  if (filename.endsWith('.svelte')) return 'svelte';
  if (/\.[jt]sx$/.test(filename)) return 'jsx';
  return null;
}

/** .braceml files are one region; other files have one per template. */
export function findTemplates(text: string, kind: FileKind): TemplateRegion[] {
  if (kind === 'braceml') return [{ start: 0, source: text }];
  if (kind === 'svelte') {
    return [...text.matchAll(SVELTE_TEMPLATE)].map((m) => ({
      start: m.index + m[0].indexOf('>') + 1,
      source: m[1],
    }));
  }
  if (!text.includes('@braceml/react')) return [];

  const regions: TemplateRegion[] = [];
  for (const match of text.matchAll(JSX_TEMPLATE)) {
    const line = text.slice(text.lastIndexOf('\n', match.index) + 1, match.index);
    if (line.includes('//')) continue;
    const start = match.index + match[0].length;
    let end = start;
    while (end < text.length && text[end] !== '`') end += text[end] === '\\' ? 2 : 1;
    regions.push({ start, source: text.slice(start, end) });
  }
  return regions;
}

/** Formats the templates in a file, and leaves everything else alone. */
export function formatTemplates(text: string, kind: FileKind, options: FormatOptions = {}): string {
  const crlf = text.includes('\r\n');
  const input = crlf ? text.replace(/\r\n/g, '\n') : text;
  if (kind === 'braceml') {
    const output = format(input, options);
    return crlf ? output.replace(/\n/g, '\r\n') : output;
  }

  let output = '';
  let last = 0;
  for (const { start, source } of findTemplates(input, kind)) {
    if (!source.trim()) continue;
    const lineStart = input.lastIndexOf('\n', start - 1) + 1;
    const outer = /^[ \t]*/.exec(input.slice(lineStart))![0];
    const unit = options.indent ?? '  ';
    // padding keeps error positions pointing at the file
    const padded = input.slice(0, start).replace(/[^\n]/g, ' ') + source;
    const body = format(padded, { ...options, baseIndent: outer + unit });
    output += `${input.slice(last, start)}\n${body}${outer}`;
    last = start + source.length;
  }
  output += input.slice(last);
  return crlf ? output.replace(/\n/g, '\r\n') : output;
}
