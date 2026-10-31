import { BraceMLError, parse, printMarkup, walk } from '@braceml/core';
import type { Template } from '@braceml/core';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver';
import type { Diagnostic } from 'vscode-languageserver';
import { findRegions } from './regions.js';
import type { Region } from './regions.js';

export interface DiagnosticOptions {
  allowUnknownTags?: boolean;
}

interface Problem {
  message: string;
  start: number;
  end: number;
  severity: DiagnosticSeverity;
}

export function getDiagnostics(document: TextDocument, options: DiagnosticOptions = {}): Diagnostic[] {
  return findRegions(document).flatMap((region) =>
    checkRegion(region, options).map((p) => ({
      range: { start: document.positionAt(region.start + p.start), end: document.positionAt(region.start + p.end) },
      severity: p.severity,
      source: 'braceml',
      message: p.message,
    })),
  );
}

function checkRegion({ source }: Region, options: DiagnosticOptions): Problem[] {
  try {
    const ast = parse(source, { allowUnknownTags: options.allowUnknownTags });
    // the printer rejects things the parser accepts, such as a void element with a body
    printMarkup(ast, { target: 'svelte', source });
    return lint(ast, source);
  } catch (err) {
    if (!(err instanceof BraceMLError)) throw err;
    const { start, end } = wordRange(source, err.offset);
    return [{ message: err.reason, start, end, severity: DiagnosticSeverity.Error }];
  }
}

/** Code that compiles without an error but doesn't do what it looks like it does. */
function lint(ast: Template, source: string): Problem[] {
  const problems: Problem[] = [];
  walk(ast, (node) => {
    if (node.type !== 'Element') return;

    const only = node.children?.length === 1 ? node.children[0] : undefined;
    if (
      only?.type === 'Element' &&
      only.children === null &&
      only.attributes.length === 0 &&
      source[only.loc.start - 1] === '{' &&
      source[only.loc.end] === '}'
    ) {
      problems.push({
        message: `'{${only.name}}' opens a children block, so this is a <${only.name}> child. For a prop, write ${only.name}={${only.name}}.`,
        start: only.loc.start - 1,
        end: only.loc.end + 1,
        severity: DiagnosticSeverity.Warning,
      });
    }

    node.classes.forEach((name, i) => {
      if (i === 0 || !/^\d/.test(name)) return;
      const text = `${node.classes[i - 1]}.${name}`;
      const at = source.indexOf(`.${text}`, node.loc.start);
      if (at === -1) return;
      problems.push({
        message: `This reads as two classes, '${node.classes[i - 1]}' and '${name}'. For a class with a dot, write class="${text}".`,
        start: at + 1,
        end: at + 1 + text.length,
        severity: DiagnosticSeverity.Warning,
      });
    });
  });
  return problems;
}

/** the word at `offset`, or one character when there is no word */
function wordRange(source: string, offset: number): { start: number; end: number } {
  const start = Math.min(offset, Math.max(source.length - 1, 0));
  const word = /^[\w:-]+/.exec(source.slice(start, start + 64));
  return { start, end: Math.min(start + (word ? word[0].length : 1), source.length) };
}
