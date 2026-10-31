import { parse } from '@braceml/core';
import { printJsx } from './print.js';
import type { JsxOutput } from './print.js';

export type { JsxOutput };

export interface CompileReactOptions {
  filename?: string;
  /** indentation unit, default two spaces */
  indent?: string;
  /** accept any lower-case tag name (default false) */
  allowUnknownTags?: boolean;
}

/** Compiles BraceML to one JSX expression, and reports the helpers it needs. */
export function compileJsx(
  source: string,
  options: CompileReactOptions & { names?: { Fragment?: string; Await?: string }; track?: boolean } = {},
): JsxOutput {
  const ast = parse(source, { filename: options.filename, allowUnknownTags: options.allowUnknownTags });
  return printJsx(ast, { source, filename: options.filename, indent: options.indent, names: options.names, track: options.track });
}

/**
 * Compiles BraceML to JSX, with an import for each helper the output uses. The
 * expressions refer to the variables of the code you paste it into.
 */
export function compileReact(source: string, options: CompileReactOptions = {}): string {
  const { code, uses } = compileJsx(source, options);
  const imports: string[] = [];
  if (uses.Fragment) imports.push("import { Fragment } from 'react';");
  if (uses.Await) imports.push("import { Await } from '@braceml/react';");
  return imports.length ? `${imports.join('\n')}\n\n${code}` : code;
}
