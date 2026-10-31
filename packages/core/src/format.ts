import type { ElementNode, Node, Template } from './ast.js';
import { parse } from './parser.js';

export interface FormatOptions {
  filename?: string;
  /** indentation unit, default two spaces */
  indent?: string;
  /** added to every line, for a template inside another file */
  baseIndent?: string;
  /** heads longer than this move to `tag(` ... `)`, default 100 */
  printWidth?: number;
}

/**
 * Reprints BraceML source in a standard layout. Attributes, text and expressions
 * are kept exactly as written, so only the layout changes.
 */
export function format(input: string, options: FormatOptions = {}): string {
  const source = input.replace(/\r\n/g, '\n');
  const parseOptions = { filename: options.filename, allowUnknownTags: true, keepComments: true };
  const ast = parse(source, parseOptions);
  const printer = new Formatter(source, options);
  const output = printer.printList(ast.children, 0).join('\n');
  if (!output) return '';

  // never change what a template means
  if (shape(parse(output, parseOptions)) !== shape(ast)) {
    throw new Error('BraceML formatter changed the template. Please report this as a bug.');
  }
  return output + '\n';
}

function shape(ast: Template): string {
  return JSON.stringify(ast, (key, value) => (key === 'loc' || key === 'syntax' ? undefined : value));
}

class Formatter {
  private readonly unit: string;
  private readonly base: string;
  private readonly width: number;

  constructor(
    private readonly src: string,
    options: FormatOptions,
  ) {
    this.unit = options.indent ?? '  ';
    this.base = options.baseIndent ?? '';
    this.width = options.printWidth ?? 100;
  }

  private pad(depth: number): string {
    return this.base + this.unit.repeat(depth);
  }

  private slice(node: { loc: { start: number; end: number } }): string {
    return this.src.slice(node.loc.start, node.loc.end).trimEnd();
  }

  printList(nodes: Node[], depth: number): string[] {
    const lines: string[] = [];
    nodes.forEach((node, i) => {
      const between = i > 0 ? this.src.slice(nodes[i - 1].loc.end, node.loc.start) : '';
      // a `//` comment stays at the end of the line it was on
      if (i > 0 && node.type === 'Comment' && node.style === 'line' && between && !between.includes('\n')) {
        lines[lines.length - 1] += ` ${this.slice(node)}`;
        return;
      }
      if (/\n[ \t]*\n/.test(between)) lines.push('');
      lines.push(...this.printNode(node, depth));
    });
    return lines;
  }

  private printNode(node: Node, depth: number): string[] {
    const pad = this.pad(depth);
    const close = `${pad}}`;
    switch (node.type) {
      case 'Text':
      case 'Comment':
        return [pad + this.slice(node)];
      case 'Special':
        return [`${pad}@${node.kind}${node.expression ? ' ' + node.expression : ''}`];
      case 'Element':
        return this.printElement(node, depth);
      case 'If': {
        const out: string[] = [];
        node.branches.forEach((b, i) => {
          if (i === 0) out.push(`${pad}if ${b.test} {`);
          else if (b.test !== null) out.push(`${pad}} else if ${b.test} {`);
          else out.push(`${pad}} else {`);
          out.push(...this.printList(b.children, depth + 1));
        });
        return [...out, close];
      }
      case 'Each': {
        const out = [`${pad}each ${node.header} {`, ...this.printList(node.children, depth + 1)];
        if (node.fallback) out.push(`${pad}} else {`, ...this.printList(node.fallback, depth + 1));
        return [...out, close];
      }
      case 'Await': {
        const named = (word: string, name: string | null) => (name ? `${word} ${name}` : word);
        const then = named('then', node.thenValue);
        const caught = named('catch', node.catchError);
        const out: string[] = [];
        if (node.pending) {
          out.push(`${pad}await ${node.expression} {`, ...this.printList(node.pending, depth + 1));
          if (node.then) out.push(`${pad}} ${then} {`);
        } else if (node.then) {
          out.push(`${pad}await ${node.expression} ${then} {`);
        } else {
          out.push(`${pad}await ${node.expression} ${caught} {`);
        }
        if (node.then) out.push(...this.printList(node.then, depth + 1));
        if (node.catch) {
          if (node.pending || node.then) out.push(`${pad}} ${caught} {`);
          out.push(...this.printList(node.catch, depth + 1));
        }
        return [...out, close];
      }
      case 'Key':
        return [`${pad}key ${node.expression} {`, ...this.printList(node.children, depth + 1), close];
      case 'Snippet':
        return [`${pad}snippet ${node.signature} {`, ...this.printList(node.children, depth + 1), close];
    }
  }

  private printElement(el: ElementNode, depth: number): string[] {
    const pad = this.pad(depth);
    const syntax = el.syntax!;
    const selector = this.src.slice(el.loc.start, syntax.selectorEnd);
    const attributes = el.attributes.map((a) => this.src.slice(a.loc.start, a.loc.end));
    const children = el.children ?? [];

    let suffix = '';
    let after: string[] = [];
    if (syntax.body === 'text') {
      suffix = ` ${this.slice(children[0] as { loc: { start: number; end: number } })}`;
    } else if (syntax.body === 'chain') {
      const [first, ...rest] = this.printNode(children[0], depth);
      suffix = ` > ${first.slice(pad.length)}`;
      after = rest;
    } else if (syntax.body === 'block') {
      suffix = children.length ? ' {' : ' {}';
      if (children.length) after = [...this.printList(children, depth + 1), `${pad}}`];
    }

    const inline = [selector, ...attributes].join(' ');
    const firstLine = (inline + suffix).split('\n')[0];
    const tooWide = attributes.length > 1 && pad.length + firstLine.length > this.width;
    if (attributes.length && (syntax.multilineGroup || syntax.groupComments.length || tooWide)) {
      const inner = this.pad(depth + 1);
      const group = [...syntax.groupComments, ...attributes].map((line) => inner + line);
      return [`${pad}${selector}(`, ...group, `${pad})${suffix}`, ...after];
    }
    return [pad + inline + suffix, ...after];
  }
}
