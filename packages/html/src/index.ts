import { parse, printMarkup } from '@braceml/core';

export interface CompileHtmlOptions {
  filename?: string;
  /** indentation unit, default two spaces */
  indent?: string;
  /** accept any lower-case tag name (default false) */
  allowUnknownTags?: boolean;
}

/**
 * Compiles BraceML to plain HTML. Framework attribute syntax (Vue `@click`,
 * `:prop`, Angular `(click)`, `[prop]`) passes through untouched. Control-flow
 * blocks and `{expression}` values are errors in this target.
 */
export function compileHtml(source: string, options: CompileHtmlOptions = {}): string {
  const ast = parse(source, { filename: options.filename, allowUnknownTags: options.allowUnknownTags });
  return printMarkup(ast, { target: 'html', source, filename: options.filename, indent: options.indent });
}
