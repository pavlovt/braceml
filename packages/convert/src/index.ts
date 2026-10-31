import { format, VOID_ELEMENTS } from '@braceml/core';
import { parse, parseFragment, serialize } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];
type ParentNode = DefaultTreeAdapterMap['parentNode'];

export interface ConvertOptions {
  /** keep classes in a `class` attribute, which Tailwind needs (default false) */
  classAttribute?: boolean;
  /** indentation unit, default two spaces */
  indent?: string;
  printWidth?: number;
}

const INLINE = new Set(
  'a abbr b bdi bdo br cite code data dfn em i kbd mark q s samp small span strong sub sup time u var wbr'.split(' '),
);
const PRESERVE = new Set(['pre', 'textarea', 'script', 'style']);
const SELECTOR_SAFE = /^[^\s.#{}'"()=>]+$/;
const VALUE_SAFE = /^[^\s{}'"()>]+$/;

/** Converts plain HTML to BraceML. Svelte and JSX syntax in the HTML stays as text. */
export function htmlToBraceml(html: string, options: ConvertOptions = {}): string {
  const root = /<!doctype|<html[\s>]/i.test(html) ? parse(html) : parseFragment(html);
  const lines = new Converter(options).nodes(root.childNodes);
  return format(lines.join('\n'), { indent: options.indent, printWidth: options.printWidth });
}

function quote(text: string): string {
  const escaped = text.replace(/\\/g, '\\\\');
  if (!text.includes("'")) return `'${escaped}'`;
  if (!text.includes('"')) return `"${escaped}"`;
  return `'${escaped.replace(/'/g, "\\'")}'`;
}

function quoteValue(text: string): string {
  return text.includes('"') ? quote(text) : `"${text.replace(/\\/g, '\\\\')}"`;
}

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
}

const isText = (node: ChildNode): node is DefaultTreeAdapterMap['textNode'] => node.nodeName === '#text';
const isElement = (node: ChildNode): node is Element => 'tagName' in node;
const isBlank = (node: ChildNode) => isText(node) && !node.value.trim();

function childrenOf(el: Element): ChildNode[] {
  return (el as DefaultTreeAdapterMap['template']).content?.childNodes ?? el.childNodes;
}

function onlyInline(node: ChildNode): boolean {
  if (isText(node)) return true;
  return isElement(node) && INLINE.has(node.tagName) && childrenOf(node).every(onlyInline);
}

class Converter {
  constructor(private readonly options: ConvertOptions) {}

  nodes(children: ChildNode[]): string[] {
    return children.filter((n) => !isBlank(n)).flatMap((n) => this.node(n));
  }

  private node(node: ChildNode): string[] {
    if (isText(node)) return [quote(escapeText(node.value.replace(/\s+/g, ' ').trim()))];
    if (node.nodeName === '#comment') {
      const { data } = node as DefaultTreeAdapterMap['commentNode'];
      return data.includes('*/') ? data.split('\n').map((l) => `// ${l.trim()}`) : [`/* ${data.trim()} */`];
    }
    if (node.nodeName === '#documentType') return [`'<!doctype html>'`];
    return this.element(node as Element);
  }

  private head(el: Element): string {
    const parts: string[] = [];
    let id = '';
    let classes: string[] = [];
    for (const attr of el.attrs) {
      const name = attr.prefix ? `${attr.prefix}:${attr.name}` : attr.name;
      if (name === 'id' && SELECTOR_SAFE.test(attr.value)) {
        id = `#${attr.value}`;
      } else if (name === 'class' && !this.options.classAttribute) {
        const tokens = attr.value.split(/\s+/).filter(Boolean);
        classes = tokens.filter((c) => SELECTOR_SAFE.test(c));
        const rest = tokens.filter((c) => !SELECTOR_SAFE.test(c));
        if (rest.length) parts.push(`class=${quoteValue(rest.join(' '))}`);
      } else if (attr.value === '') {
        parts.push(name);
      } else {
        parts.push(`${name}=${VALUE_SAFE.test(attr.value) ? attr.value : quoteValue(attr.value)}`);
      }
    }
    const selector = id + classes.map((c) => `.${c}`).join('');
    const tag = el.tagName === 'div' && selector ? '' : el.tagName;
    return [tag + selector, ...parts].join(' ');
  }

  private element(el: Element): string[] {
    const head = this.head(el);
    const all = childrenOf(el);
    const children = all.filter((n) => !isBlank(n));

    if (children.length === 0) return [VOID_ELEMENTS.has(el.tagName) || !all.length ? head : `${head} {}`];

    if (PRESERVE.has(el.tagName)) {
      const raw = (el.tagName === 'script' || el.tagName === 'style' ? (s: string) => s : escapeText)(serializeRaw(all));
      return [`${head} ${quote(raw)}`];
    }

    // text mixed with inline tags stays one string, which keeps its spacing
    const elements = children.filter(isElement);
    const spaced = elements.length > 1 && all.some(isBlank);
    if (all.every(onlyInline) && (elements.length < children.length || spaced)) {
      if (elements.length === 0) return [`${head} ${quote(escapeText(flatten(all)))}`];
      return [`${head} ${quote(serialize(el as unknown as ParentNode).replace(/\s+/g, ' ').trim())}`];
    }

    if (children.length === 1 && isElement(children[0])) {
      const [first, ...rest] = this.element(children[0]);
      return [`${head} > ${first}`, ...rest];
    }
    return [`${head} {`, ...this.nodes(all), '}'];
  }
}

function flatten(nodes: ChildNode[]): string {
  return nodes.map((n) => (isText(n) ? n.value : '')).join('').replace(/\s+/g, ' ').trim();
}

function serializeRaw(nodes: ChildNode[]): string {
  return nodes.map((n) => (isText(n) ? n.value : '')).join('');
}
