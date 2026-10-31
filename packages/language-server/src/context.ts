/** What the text before the cursor means. Works on incomplete source, so it can't use the parser. */
export type Context =
  /** a new node is expected; `chained` means it follows `>`, where blocks aren't allowed */
  | { kind: 'node'; prefix: string; chained: boolean }
  | { kind: 'special'; prefix: string }
  | { kind: 'render'; prefix: string }
  | { kind: 'attribute'; tag: string; prefix: string }
  | { kind: 'value'; tag: string; attribute: string; prefix: string }
  /** inside text, a comment or a JS expression */
  | { kind: 'none' };

const NONE: Context = { kind: 'none' };
const HEADER_KEYWORDS = new Set(['if', 'each', 'await', 'key', 'snippet', 'else', 'then', 'catch']);
const SELECTOR = /[A-Za-z0-9:_-]*(?:[.#][^\s.#{}'"()=>]*)*/y;
const VALUE_STOP = /[\s{}'"()>]/;

export function contextAt(source: string, offset: number): Context {
  return new Scanner(source.slice(0, offset)).scan();
}

class Scanner {
  private i = 0;

  constructor(private readonly s: string) {}

  private get done(): boolean {
    return this.i >= this.s.length;
  }

  private skipSpace(inline = false): void {
    while (!this.done && (inline ? /[ \t]/ : /\s/).test(this.s[this.i])) this.i++;
  }

  /** i on a quote; false when the string doesn't end before the cursor */
  private skipString(): boolean {
    const quote = this.s[this.i++];
    while (!this.done) {
      const c = this.s[this.i];
      if (c === '\\') this.i += 2;
      else if (c === quote) {
        this.i++;
        return true;
      } else this.i++;
    }
    return false;
  }

  /** i on `{`; false when the braces don't close before the cursor */
  private skipBraces(): boolean {
    let depth = 0;
    while (!this.done) {
      const c = this.s[this.i];
      if (c === '"' || c === "'" || c === '`') {
        if (!this.skipString()) return false;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        this.i++;
        return true;
      }
      this.i++;
    }
    return false;
  }

  /** moves past the `{` that ends a block header; false when the cursor is in the header */
  private skipHeader(): boolean {
    let depth = 0;
    while (!this.done) {
      const c = this.s[this.i];
      if (c === '"' || c === "'" || c === '`') {
        if (!this.skipString()) return false;
        continue;
      }
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (c === '{') {
        if (depth === 0) {
          this.i++;
          return true;
        }
        if (!this.skipBraces()) return false;
        continue;
      }
      this.i++;
    }
    return false;
  }

  scan(chained = false): Context {
    for (;;) {
      this.skipSpace();
      if (this.done) return { kind: 'node', prefix: '', chained };
      const { s } = this;
      const c = s[this.i];

      if (s.startsWith('//', this.i)) {
        const end = s.indexOf('\n', this.i);
        if (end === -1) return NONE;
        this.i = end;
      } else if (s.startsWith('/*', this.i)) {
        const end = s.indexOf('*/', this.i);
        if (end === -1) return NONE;
        this.i = end + 2;
      } else if (c === "'" || c === '"') {
        if (!this.skipString()) return NONE;
      } else if (c === '{' || c === '}') {
        this.i++;
      } else if (c === '@') {
        const end = s.indexOf('\n', this.i);
        if (end === -1) return special(s.slice(this.i));
        this.i = end;
      } else {
        const word = /^[A-Za-z_]\w*/.exec(s.slice(this.i, this.i + 32))?.[0] ?? '';
        const next = s[this.i + word.length];
        if (word && next === undefined) return { kind: 'node', prefix: word, chained };
        if (HEADER_KEYWORDS.has(word) && /[\s{]/.test(next)) {
          this.i += word.length;
          if (!this.skipHeader()) return NONE;
          continue;
        }
        const context = this.scanElement(chained);
        if (context) return context;
      }
      chained = false;
    }
  }

  /** Reads one element head. Returns a context when the cursor is inside it. */
  private scanElement(chained: boolean): Context | null {
    const { s } = this;
    SELECTOR.lastIndex = this.i;
    const selector = SELECTOR.exec(s)?.[0] ?? '';
    if (!selector) {
      this.i++; // not an element: the parser reports it, so step over it
      return null;
    }
    this.i += selector.length;
    if (this.done) return /[.#]/.test(selector) ? NONE : { kind: 'node', prefix: selector, chained };
    const tag = /^[A-Za-z0-9:_-]+/.exec(selector)?.[0] ?? 'div';

    let grouped = s[this.i] === '(';
    if (grouped) this.i++;
    for (;;) {
      this.skipSpace(!grouped);
      if (this.done) return { kind: 'attribute', tag, prefix: '' };
      const c = s[this.i];
      if (grouped && c === ')') {
        grouped = false;
        this.i++;
      } else if (c === '\n' || c === '\r' || c === '}') {
        return null;
      } else if (c === '{') {
        if (!s.startsWith('...', this.i + 1)) {
          this.i++;
          return null;
        }
        if (!this.skipBraces()) return NONE;
      } else if (c === "'" || c === '"') {
        return this.skipString() ? null : NONE;
      } else if (c === '>') {
        this.i++;
        this.skipSpace(true);
        return this.scan(true);
      } else if (s.startsWith('//', this.i) || s.startsWith('/*', this.i)) {
        return null;
      } else {
        const context = this.scanAttribute(tag);
        if (context) return context;
      }
    }
  }

  private scanAttribute(tag: string): Context | null {
    const { s } = this;
    const start = this.i;
    while (!this.done && !/[\s=>{}'"]/.test(s[this.i])) this.i++;
    const attribute = s.slice(start, this.i);
    if (this.done) return { kind: 'attribute', tag, prefix: attribute };
    if (s[this.i] !== '=') {
      if (this.i === start) this.i++;
      return null;
    }
    this.i++;
    if (this.done) return { kind: 'value', tag, attribute, prefix: '' };
    const c = s[this.i];
    if (c === '{') return this.skipBraces() ? null : NONE;
    if (c === '"' || c === "'") {
      const open = this.i;
      if (this.skipString()) return null;
      const prefix = s.slice(open + 1);
      return /^[\w-]*$/.test(prefix) ? { kind: 'value', tag, attribute, prefix } : NONE;
    }
    const value = this.i;
    while (!this.done && !VALUE_STOP.test(s[this.i])) this.i++;
    return this.done ? { kind: 'value', tag, attribute, prefix: s.slice(value) } : null;
  }
}

function special(text: string): Context {
  const name = /^@(\w*)$/.exec(text);
  if (name) return { kind: 'special', prefix: name[1] };
  const target = /^@render\s+([\w$]*)$/.exec(text);
  return target ? { kind: 'render', prefix: target[1] } : NONE;
}
