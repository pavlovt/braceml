import { BraceMLError, extractLineOffsets, markLines, VOID_ELEMENTS } from '@braceml/core';
import type { Attribute, ElementNode, Node, SpecialTag, SnippetBlock, Template } from '@braceml/core';

export interface JsxPrinterOptions {
  indent?: string;
  source: string;
  filename?: string;
  /** local names of the helpers the output refers to */
  names?: { Fragment?: string; Await?: string };
  /** record which source node each output line came from */
  track?: boolean;
}

export interface JsxOutput {
  /** a single JavaScript expression */
  code: string;
  /** helpers the expression needs in scope */
  uses: { Fragment: boolean; Await: boolean };
  /** the source offset of each output line; only with the track option */
  offsets?: (number | null)[];
}

const ATTRIBUTE_NAMES: Record<string, string> = {
  accesskey: 'accessKey',
  allowfullscreen: 'allowFullScreen',
  autocapitalize: 'autoCapitalize',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  autoplay: 'autoPlay',
  bgcolor: 'bgColor',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  charset: 'charSet',
  colspan: 'colSpan',
  contenteditable: 'contentEditable',
  crossorigin: 'crossOrigin',
  datetime: 'dateTime',
  enctype: 'encType',
  for: 'htmlFor',
  formaction: 'formAction',
  formenctype: 'formEncType',
  formmethod: 'formMethod',
  formnovalidate: 'formNoValidate',
  formtarget: 'formTarget',
  frameborder: 'frameBorder',
  hreflang: 'hrefLang',
  inputmode: 'inputMode',
  maxlength: 'maxLength',
  minlength: 'minLength',
  nomodule: 'noModule',
  novalidate: 'noValidate',
  playsinline: 'playsInline',
  readonly: 'readOnly',
  referrerpolicy: 'referrerPolicy',
  rowspan: 'rowSpan',
  spellcheck: 'spellCheck',
  srcdoc: 'srcDoc',
  srclang: 'srcLang',
  srcset: 'srcSet',
  tabindex: 'tabIndex',
  usemap: 'useMap',
  'accept-charset': 'acceptCharset',
  'http-equiv': 'httpEquiv',
  'xlink:href': 'xlinkHref',
  'xml:lang': 'xmlLang',
};

const EVENT_NAMES: Record<string, string> = {
  onanimationend: 'onAnimationEnd',
  onanimationiteration: 'onAnimationIteration',
  onanimationstart: 'onAnimationStart',
  onauxclick: 'onAuxClick',
  onbeforeinput: 'onBeforeInput',
  oncanplay: 'onCanPlay',
  oncanplaythrough: 'onCanPlayThrough',
  oncompositionend: 'onCompositionEnd',
  oncompositionstart: 'onCompositionStart',
  oncompositionupdate: 'onCompositionUpdate',
  oncontextmenu: 'onContextMenu',
  ondblclick: 'onDoubleClick',
  ondragend: 'onDragEnd',
  ondragenter: 'onDragEnter',
  ondragleave: 'onDragLeave',
  ondragover: 'onDragOver',
  ondragstart: 'onDragStart',
  ondurationchange: 'onDurationChange',
  ongotpointercapture: 'onGotPointerCapture',
  onkeydown: 'onKeyDown',
  onkeypress: 'onKeyPress',
  onkeyup: 'onKeyUp',
  onloadeddata: 'onLoadedData',
  onloadedmetadata: 'onLoadedMetadata',
  onloadstart: 'onLoadStart',
  onlostpointercapture: 'onLostPointerCapture',
  onmousedown: 'onMouseDown',
  onmouseenter: 'onMouseEnter',
  onmouseleave: 'onMouseLeave',
  onmousemove: 'onMouseMove',
  onmouseout: 'onMouseOut',
  onmouseover: 'onMouseOver',
  onmouseup: 'onMouseUp',
  onpointercancel: 'onPointerCancel',
  onpointerdown: 'onPointerDown',
  onpointerenter: 'onPointerEnter',
  onpointerleave: 'onPointerLeave',
  onpointermove: 'onPointerMove',
  onpointerout: 'onPointerOut',
  onpointerover: 'onPointerOver',
  onpointerup: 'onPointerUp',
  onratechange: 'onRateChange',
  ontimeupdate: 'onTimeUpdate',
  ontouchcancel: 'onTouchCancel',
  ontouchend: 'onTouchEnd',
  ontouchmove: 'onTouchMove',
  ontouchstart: 'onTouchStart',
  ontransitionend: 'onTransitionEnd',
  onvolumechange: 'onVolumeChange',
};

/** Svelte directives with no JSX equivalent, and what to write instead */
const UNSUPPORTED_DIRECTIVES: Record<string, string> = {
  bind: 'Use a value prop and an onChange handler',
  use: 'Use a ref',
  on: "Use an event prop such as 'onClick'",
  transition: 'Use CSS or an animation library',
  in: 'Use CSS or an animation library',
  out: 'Use CSS or an animation library',
  animate: 'Use CSS or an animation library',
  let: 'Pass a function as a prop',
};

const camelCase = (name: string) => name.replace(/-+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());

function singleQuote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

function quoteAttr(value: string): string {
  if (value.includes('"') && !value.includes("'")) return `'${value}'`;
  return `"${value.replace(/"/g, '&quot;')}"`;
}

/** Turns a quoted value such as `/users/{id}` into a JavaScript expression. */
function interpolate(value: string): string {
  const whole = /^\{([^{}]*)\}$/.exec(value);
  if (whole) return whole[1].trim();
  let out = '';
  let i = 0;
  while (i < value.length) {
    if (value[i] !== '{') {
      const c = value[i++];
      if (c === '\\' || c === '`') out += '\\' + c;
      else if (c === '$' && value[i] === '{') out += '\\$';
      else out += c;
      continue;
    }
    const open = i;
    let depth = 0;
    do {
      if (value[i] === '{') depth++;
      else if (value[i] === '}') depth--;
      i++;
    } while (depth > 0 && i < value.length);
    out += '$' + value.slice(open, i);
  }
  return '`' + out + '`';
}

const isDeclaration = (node: Node) => node.type === 'Snippet' || (node.type === 'Special' && node.kind === 'const');

export function printJsx(ast: Template, options: JsxPrinterOptions): JsxOutput {
  const printer = new JsxPrinter(options);
  const code = printer.printValue(ast.children, 0).join('\n') + '\n';
  if (options.track) return { ...extractLineOffsets(code), uses: printer.uses };
  return { code, uses: printer.uses };
}

class JsxPrinter {
  readonly uses = { Fragment: false, Await: false };
  private readonly indentUnit: string;

  constructor(private readonly opts: JsxPrinterOptions) {
    this.indentUnit = opts.indent ?? '  ';
  }

  private fail(message: string, offset: number): never {
    throw new BraceMLError(message, this.opts.source, offset, this.opts.filename);
  }

  private mark(lines: string[], node: Node): string[] {
    return this.opts.track ? markLines(lines, node.loc.start) : lines;
  }

  private pad(depth: number): string {
    return this.indentUnit.repeat(depth);
  }

  private fragment(): string {
    this.uses.Fragment = true;
    return this.opts.names?.Fragment ?? 'Fragment';
  }

  private await(): string {
    this.uses.Await = true;
    return this.opts.names?.Await ?? 'Await';
  }

  /** nodes as one expression */
  printValue(nodes: Node[], depth: number): string[] {
    if (nodes.some(isDeclaration)) {
      const pad = this.pad(depth);
      return [`${pad}(() => {`, ...this.printStatements(nodes, depth + 1, null), `${pad}})()`];
    }
    return this.printExpression(nodes, depth);
  }

  private printExpression(nodes: Node[], depth: number): string[] {
    const pad = this.pad(depth);
    if (nodes.length === 0) return [`${pad}null`];
    if (nodes.length === 1) {
      const node = nodes[0];
      if (node.type === 'Element') return this.mark(this.printElement(node, depth), node);
      if (node.type === 'If') return this.mark(this.printIf(node, depth, '', ''), node);
      if (node.type === 'Each') return this.mark(this.printEach(node, depth, '', ''), node);
      if (node.type === 'Await' || node.type === 'Key') return this.printNode(node, depth);
      if (node.type === 'Special' && node.kind === 'render') return [`${pad}${this.renderExpression(node)}`];
    }
    return [`${pad}<>`, ...this.printSiblings(nodes, depth + 1), `${pad}</>`];
  }

  /** `const` declarations followed by `return`; key goes on the returned root */
  private printStatements(nodes: Node[], depth: number, key: string | null): string[] {
    const pad = this.pad(depth);
    const out: string[] = [];
    const rest = nodes.filter((n) => !isDeclaration(n));
    for (const node of nodes) {
      if (node.type === 'Snippet') out.push(...this.printSnippet(node, depth));
      else if (node.type === 'Special' && node.kind === 'const') out.push(`${pad}const ${node.expression};`);
    }
    const value = key === null ? this.printExpression(rest, depth + 1) : this.printKeyed(rest, depth + 1, key);
    out.push(`${pad}return (`, ...value, `${pad});`);
    return out;
  }

  private snippetParts(node: SnippetBlock): [string, string] {
    const open = node.signature.indexOf('(');
    return [node.signature.slice(0, open).trim(), node.signature.slice(open + 1, node.signature.lastIndexOf(')')).trim()];
  }

  private printArrow(prefix: string, params: string, nodes: Node[], depth: number, suffix: string, key: string | null = null): string[] {
    const pad = this.pad(depth);
    if (nodes.some(isDeclaration)) {
      return [`${pad}${prefix}(${params}) => {`, ...this.printStatements(nodes, depth + 1, key), `${pad}}${suffix}`];
    }
    const value = key === null ? this.printExpression(nodes, depth + 1) : this.printKeyed(nodes, depth + 1, key);
    return [`${pad}${prefix}(${params}) => (`, ...value, `${pad})${suffix}`];
  }

  private printSnippet(node: SnippetBlock, depth: number): string[] {
    const [name, params] = this.snippetParts(node);
    return this.printArrow(`const ${name} = `, params, node.children, depth, ';');
  }

  private printKeyed(nodes: Node[], depth: number, key: string): string[] {
    if (nodes.length === 1 && nodes[0].type === 'Element') return this.mark(this.printElement(nodes[0], depth, key), nodes[0]);
    const pad = this.pad(depth);
    const tag = this.fragment();
    return [`${pad}<${tag} key={${key}}>`, ...this.printSiblings(nodes, depth + 1), `${pad}</${tag}>`];
  }

  /** nodes as JSX children */
  private printSiblings(nodes: Node[], depth: number): string[] {
    if (nodes.some(isDeclaration)) {
      const pad = this.pad(depth);
      return [`${pad}{(() => {`, ...this.printStatements(nodes, depth + 1, null), `${pad}})()}`];
    }
    return nodes.flatMap((node) => this.printNode(node, depth));
  }

  private printNode(node: Node, depth: number): string[] {
    return this.mark(this.printNodeLines(node, depth), node);
  }

  private printNodeLines(node: Node, depth: number): string[] {
    const pad = this.pad(depth);
    switch (node.type) {
      case 'Text':
        return [pad + this.printText(node.value)];
      case 'Comment':
        return [`${pad}{/* ${node.value} */}`];
      case 'Element':
        return this.printElement(node, depth);
      case 'Special':
        return [pad + this.printSpecial(node)];
      case 'If':
        return this.printIf(node, depth, '{', '}');
      case 'Each':
        return this.printEach(node, depth, '{', '}');
      case 'Await': {
        const tag = this.await();
        const out = [`${pad}<${tag}`, `${pad}${this.indentUnit}promise={${node.expression}}`];
        const inner = depth + 1;
        if (node.pending) {
          out.push(`${this.pad(inner)}pending={`, ...this.printValue(node.pending, inner + 1), `${this.pad(inner)}}`);
        }
        if (node.then) out.push(...this.printArrow('resolved={', node.thenValue ?? '', node.then, inner, '}'));
        if (node.catch) out.push(...this.printArrow('rejected={', node.catchError ?? '', node.catch, inner, '}'));
        out.push(`${pad}/>`);
        return out;
      }
      case 'Key': {
        const tag = this.fragment();
        return [`${pad}<${tag} key={${node.expression}}>`, ...this.printSiblings(node.children, depth + 1), `${pad}</${tag}>`];
      }
      case 'Snippet':
        return this.fail("'snippet' block is misplaced", node.loc.start);
    }
  }

  /** JSX drops whitespace at the ends of a line, so make it explicit */
  private printText(value: string): string {
    const [, before, text, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(value)!;
    return `${before ? "{' '}" : ''}${text}${after && text ? "{' '}" : ''}`;
  }

  private renderExpression(node: SpecialTag): string {
    // children is a value in React, not a function
    if (/^children\s*(\?\.)?\s*\(\s*\)$/.test(node.expression)) return 'children';
    return node.expression;
  }

  private printSpecial(node: SpecialTag): string {
    switch (node.kind) {
      case 'render':
        return `{${this.renderExpression(node)}}`;
      case 'debug':
        return node.expression ? `{console.log({ ${node.expression} })}` : '{(() => { debugger; })()}';
      case 'html':
        return this.fail("'@html' must be the only child of an HTML element in the 'react' target", node.loc.start);
      case 'const':
        return this.fail("'@const' is misplaced", node.loc.start);
    }
  }

  private printIf(node: Extract<Node, { type: 'If' }>, depth: number, open: string, close: string): string[] {
    const pad = this.pad(depth);
    const out: string[] = [];
    let hasElse = false;
    node.branches.forEach((b, i) => {
      if (i === 0) out.push(`${pad}${open}${b.test} ? (`);
      else if (b.test !== null) out.push(`${pad}) : ${b.test} ? (`);
      else {
        out.push(`${pad}) : (`);
        hasElse = true;
      }
      out.push(...this.printValue(b.children, depth + 1));
    });
    out.push(`${pad}${hasElse ? ')' : ') : null'}${close}`);
    return out;
  }

  private printEach(node: Extract<Node, { type: 'Each' }>, depth: number, open: string, close: string): string[] {
    const pad = this.pad(depth);
    const collection = /^[\w$.]+$/.test(node.collection) ? node.collection : `(${node.collection})`;
    // like Svelte, an each block without a key is keyed by position
    const index = node.index ?? (node.key === null ? '$index' : null);
    const params = [node.pattern || '$item', index].filter(Boolean).join(', ');
    const key = node.key ?? index!;
    if (!node.fallback) {
      return this.printArrow(`${open}${collection}.map(`, params, node.children, depth, `)${close}`, key);
    }
    return [
      ...this.printArrow(`${open}${collection}.length > 0 ? ${collection}.map(`, params, node.children, depth, ') : (', key),
      ...this.printValue(node.fallback, depth + 1),
      `${pad})${close}`,
    ];
  }

  private attributeName(el: ElementNode, a: Exclude<Attribute, { kind: 'spread' }>): string {
    const { name } = a;
    const colon = name.indexOf(':');
    if (colon !== -1 && !(name in ATTRIBUTE_NAMES)) {
      const hint = UNSUPPORTED_DIRECTIVES[name.slice(0, colon)];
      if (hint) this.fail(`'${name}' is not supported by the 'react' target. ${hint}`, a.loc.start);
    }
    if (el.component) return name;
    if (name in ATTRIBUTE_NAMES) return ATTRIBUTE_NAMES[name];
    if (/^on[a-z]+$/.test(name)) return EVENT_NAMES[name] ?? `on${name[2].toUpperCase()}${name.slice(3)}`;
    // custom elements keep their attribute names
    if (name.includes('-') && !el.name.includes('-') && !/^(data|aria)-/.test(name)) return camelCase(name);
    return name;
  }

  private printClass(el: ElementNode, attrs: Attribute[]): string | null {
    const items: string[] = [];
    let statics = el.classes.join(' ');
    for (const a of attrs) {
      if (a.kind === 'spread') continue;
      if (a.name === 'class') {
        if (a.kind === 'expression') items.push(a.expression);
        else if (a.value?.includes('{')) items.push(interpolate(a.value));
        else if (a.value) statics = statics ? `${statics} ${a.value}` : a.value;
      } else if (a.name.startsWith('class:')) {
        const name = a.name.slice('class:'.length);
        const test = a.kind === 'expression' ? a.expression : name;
        items.push(`${test} && ${singleQuote(name)}`);
      }
    }
    if (items.length === 0) return statics ? `className=${quoteAttr(statics)}` : null;
    if (items.length === 1 && !statics && !items[0].includes('&&')) return `className={${items[0]}}`;
    if (statics) items.unshift(singleQuote(statics));
    return `className={[${items.join(', ')}].filter(Boolean).join(' ')}`;
  }

  private printStyle(el: ElementNode, attrs: Attribute[]): string | null {
    const entries: string[] = [];
    const property = (name: string) => {
      if (name.startsWith('--')) return singleQuote(name);
      const camel = camelCase(name);
      return /^-/.test(name) ? singleQuote(camel) : camel;
    };
    const literal = (value: string) => (value.includes('{') ? interpolate(value) : singleQuote(value));
    let whole: string | null = null;
    let found = false;

    for (const a of attrs) {
      if (a.kind === 'spread') continue;
      if (a.name === 'style') {
        found = true;
        if (a.kind === 'expression') whole = a.expression;
        else {
          for (const decl of (a.value ?? '').split(';')) {
            const colon = decl.indexOf(':');
            if (colon === -1) continue;
            entries.push(`${property(decl.slice(0, colon).trim())}: ${literal(decl.slice(colon + 1).trim())}`);
          }
        }
      } else if (a.name.startsWith('style:')) {
        found = true;
        const name = a.name.slice('style:'.length);
        const value = a.kind === 'expression' ? a.expression : a.value === null ? camelCase(name) : literal(a.value);
        entries.push(`${property(name)}: ${value}`);
      }
    }
    if (!found) return null;
    if (whole !== null && entries.length === 0) return `style={${whole}}`;
    if (whole !== null) entries.unshift(`...${whole}`);
    return `style={{ ${entries.join(', ')} }}`;
  }

  private printAttributes(el: ElementNode, key: string | null, html: string | null): string {
    const parts: string[] = [];
    const attrs = el.attributes;
    const hasKey = attrs.some((a) => a.kind !== 'spread' && a.name === 'key');
    if (key !== null && !hasKey) parts.push(`key={${key}}`);
    if (el.id !== null) parts.push(`id=${quoteAttr(el.id)}`);

    const className = this.printClass(el, attrs);
    if (className) parts.push(className);
    const style = this.printStyle(el, attrs);
    if (style) parts.push(style);

    for (const a of attrs) {
      if (a.kind === 'spread') {
        parts.push(`{...${a.expression}}`);
        continue;
      }
      if (a.name === 'class' || a.name.startsWith('class:')) continue;
      if (a.name === 'style' || a.name.startsWith('style:')) continue;
      if (a.name === 'bind:this') {
        if (a.kind !== 'expression') this.fail("'bind:this' needs an {expression}", a.loc.start);
        parts.push(`ref={${a.expression}}`);
        continue;
      }
      const name = this.attributeName(el, a);
      if (!/^[A-Za-z_$][\w$-]*$/.test(name)) {
        this.fail(`'${name}' is not a valid attribute in the 'react' target`, a.loc.start);
      }
      if (a.kind === 'expression') parts.push(`${name}={${a.expression}}`);
      else if (a.value === null) parts.push(name);
      else if (a.value.includes('{')) parts.push(`${name}={${interpolate(a.value)}}`);
      else parts.push(`${name}=${quoteAttr(a.value)}`);
    }
    if (html !== null) parts.push(`dangerouslySetInnerHTML={{ __html: ${html} }}`);
    return parts.length ? ' ' + parts.join(' ') : '';
  }

  private printElement(el: ElementNode, depth: number, key: string | null = null): string[] {
    const pad = this.pad(depth);
    if (el.name.includes(':')) this.fail(`<${el.name}> is not supported by the 'react' target`, el.loc.start);

    let children = el.children ?? [];
    const isVoid = VOID_ELEMENTS.has(el.name.toLowerCase());

    // snippets inside a component become props
    const snippets = el.component ? children.filter((n): n is SnippetBlock => n.type === 'Snippet') : [];
    if (snippets.length) children = children.filter((n) => n.type !== 'Snippet');

    let html: string | null = null;
    const only = children.filter((n) => n.type !== 'Comment');
    if (!el.component && only.length === 1 && only[0].type === 'Special' && only[0].kind === 'html') {
      html = only[0].expression;
      children = [];
    }

    const open = `<${el.name}${this.printAttributes(el, key, html)}`;
    const props = snippets.flatMap((s) => {
      const [name, params] = this.snippetParts(s);
      return this.printArrow(`${name}={`, params, s.children, depth + 1, '}');
    });

    if (children.length === 0) {
      if (props.length) return [`${pad}${open}`, ...props, `${pad}/>`];
      if (el.component || isVoid || html !== null) return [`${pad}${open} />`];
      return [`${pad}${open}></${el.name}>`];
    }

    if (isVoid) this.fail(`<${el.name}> is a void element and cannot have children`, el.loc.start);

    const lines = this.printSiblings(children, depth + 1);
    if (props.length) return [`${pad}${open}`, ...props, `${pad}>`, ...lines, `${pad}</${el.name}>`];

    const preserve = /^(pre|textarea)$/i.test(el.name);
    if (children.length === 1 && children[0].type === 'Text' && (preserve || !children[0].value.includes('\n'))) {
      return [`${pad}${open}>${children[0].value}</${el.name}>`];
    }
    return [`${pad}${open}>`, ...lines, `${pad}</${el.name}>`];
  }
}
