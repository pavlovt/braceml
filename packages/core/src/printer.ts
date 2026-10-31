import type { Attribute, ElementNode, Node, Template } from './ast.js';
import { BraceMLError } from './errors.js';
import { extractLineOffsets, markLines } from './sourcemap.js';
import type { LineOffsets } from './sourcemap.js';

/**
 * Prints an AST as HTML-like markup. Used by the `html` and `svelte` targets,
 * which differ only in what they allow (blocks, expressions) and how they
 * print components.
 */
export interface MarkupPrinterOptions {
  target: 'html' | 'svelte';
  indent?: string;
  source: string;
  filename?: string;
  /** record which source node each output line came from */
  track?: boolean;
}

export const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export function printMarkup(ast: Template, options: MarkupPrinterOptions): string {
  const printer = new MarkupPrinter(options);
  return printer.printNodes(ast.children, 0).join('\n') + '\n';
}

/** Like printMarkup, and also reports the source offset of each output line. */
export function printMarkupTracked(ast: Template, options: MarkupPrinterOptions): LineOffsets {
  return extractLineOffsets(printMarkup(ast, { ...options, track: true }));
}

class MarkupPrinter {
  private readonly indentUnit: string;

  constructor(private readonly opts: MarkupPrinterOptions) {
    this.indentUnit = opts.indent ?? '  ';
  }

  private fail(message: string, offset: number): never {
    throw new BraceMLError(message, this.opts.source, offset, this.opts.filename);
  }

  private svelteOnly(what: string, offset: number): void {
    if (this.opts.target !== 'svelte') {
      this.fail(`${what} is not supported by the '${this.opts.target}' target`, offset);
    }
  }

  printNodes(nodes: Node[], depth: number): string[] {
    const lines: string[] = [];
    for (const node of nodes) {
      const printed = this.printNode(node, depth);
      lines.push(...(this.opts.track ? markLines(printed, node.loc.start) : printed));
    }
    return lines;
  }

  private pad(depth: number): string {
    return this.indentUnit.repeat(depth);
  }

  private printNode(node: Node, depth: number): string[] {
    const pad = this.pad(depth);
    switch (node.type) {
      case 'Text':
        return [pad + node.value];
      case 'Comment':
        return [`${pad}<!-- ${node.value} -->`];
      case 'Element':
        return this.printElement(node, depth);
      case 'Special':
        this.svelteOnly(`'@${node.kind}'`, node.loc.start);
        return [`${pad}{@${node.kind}${node.expression ? ' ' + node.expression : ''}}`];
      case 'If': {
        this.svelteOnly("'if' block", node.loc.start);
        const out: string[] = [];
        node.branches.forEach((b, i) => {
          if (i === 0) out.push(`${pad}{#if ${b.test}}`);
          else if (b.test !== null) out.push(`${pad}{:else if ${b.test}}`);
          else out.push(`${pad}{:else}`);
          out.push(...this.printNodes(b.children, depth + 1));
        });
        out.push(`${pad}{/if}`);
        return out;
      }
      case 'Each': {
        this.svelteOnly("'each' block", node.loc.start);
        const out = [`${pad}{#each ${node.header}}`, ...this.printNodes(node.children, depth + 1)];
        if (node.fallback) out.push(`${pad}{:else}`, ...this.printNodes(node.fallback, depth + 1));
        out.push(`${pad}{/each}`);
        return out;
      }
      case 'Await': {
        this.svelteOnly("'await' block", node.loc.start);
        const out: string[] = [];
        if (node.pending) {
          out.push(`${pad}{#await ${node.expression}}`, ...this.printNodes(node.pending, depth + 1));
          if (node.then) out.push(`${pad}{:then${node.thenValue ? ' ' + node.thenValue : ''}}`);
        } else if (node.then) {
          out.push(`${pad}{#await ${node.expression} then${node.thenValue ? ' ' + node.thenValue : ''}}`);
        } else {
          out.push(`${pad}{#await ${node.expression} catch${node.catchError ? ' ' + node.catchError : ''}}`);
        }
        if (node.then) out.push(...this.printNodes(node.then, depth + 1));
        if (node.catch) {
          if (node.pending || node.then) out.push(`${pad}{:catch${node.catchError ? ' ' + node.catchError : ''}}`);
          out.push(...this.printNodes(node.catch, depth + 1));
        }
        out.push(`${pad}{/await}`);
        return out;
      }
      case 'Key':
        this.svelteOnly("'key' block", node.loc.start);
        return [`${pad}{#key ${node.expression}}`, ...this.printNodes(node.children, depth + 1), `${pad}{/key}`];
      case 'Snippet':
        this.svelteOnly("'snippet' block", node.loc.start);
        return [`${pad}{#snippet ${node.signature}}`, ...this.printNodes(node.children, depth + 1), `${pad}{/snippet}`];
    }
  }

  private printAttributes(el: ElementNode): string {
    const parts: string[] = [];
    const attrs: Attribute[] = [...el.attributes];

    if (el.id !== null) parts.push(`id="${escapeAttr(el.id)}"`);

    // merge selector classes with a `class` attribute
    const classIdx = attrs.findIndex((a) => a.kind !== 'spread' && a.name === 'class');
    if (el.classes.length || classIdx !== -1) {
      const merged = [...el.classes];
      if (classIdx !== -1) {
        const attr = attrs[classIdx];
        attrs.splice(classIdx, 1);
        if (attr.kind === 'static' && attr.value) merged.push(attr.value);
        else if (attr.kind === 'expression') {
          this.svelteOnly('An {expression} attribute value', attr.loc.start);
          merged.push(`{${attr.expression}}`);
        }
      }
      if (merged.length) parts.push(`class="${escapeAttr(merged.join(' '))}"`);
    }

    for (const a of attrs) {
      if (a.kind === 'spread') {
        this.svelteOnly('A spread attribute', a.loc.start);
        parts.push(`{...${a.expression}}`);
      } else if (a.kind === 'expression') {
        this.svelteOnly('An {expression} attribute value', a.loc.start);
        parts.push(`${a.name}={${a.expression}}`);
      } else if (a.value === null) {
        parts.push(a.name);
      } else {
        parts.push(`${a.name}=${quoteAttr(a.value)}`);
      }
    }
    return parts.length ? ' ' + parts.join(' ') : '';
  }

  private printElement(el: ElementNode, depth: number): string[] {
    const pad = this.pad(depth);
    const open = `<${el.name}${this.printAttributes(el)}`;
    const children = el.children ?? [];

    if (children.length === 0) {
      if (el.component && this.opts.target === 'svelte') return [`${pad}${open} />`];
      if (VOID_ELEMENTS.has(el.name.toLowerCase())) return [`${pad}${open}>`];
      return [`${pad}${open}></${el.name}>`];
    }

    if (VOID_ELEMENTS.has(el.name.toLowerCase())) {
      this.fail(`<${el.name}> is a void element and cannot have children`, el.loc.start);
    }

    const preserve = /^(pre|textarea)$/i.test(el.name);
    if (children.length === 1 && children[0].type === 'Text' && (preserve || !children[0].value.includes('\n'))) {
      return [`${pad}${open}>${children[0].value}</${el.name}>`];
    }

    return [`${pad}${open}>`, ...this.printNodes(children, depth + 1), `${pad}</${el.name}>`];
  }
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;');
}

function quoteAttr(value: string): string {
  if (value.includes('"') && !value.includes("'")) return `'${value}'`;
  return `"${escapeAttr(value)}"`;
}
