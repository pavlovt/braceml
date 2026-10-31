import type {
  Attribute,
  AwaitBlock,
  CommentNode,
  EachBlock,
  ElementNode,
  ElementSyntax,
  IfBlock,
  KeyBlock,
  Loc,
  Node,
  SnippetBlock,
  SpecialTag,
  Template,
  TextNode,
} from './ast.js';
import { BraceMLError } from './errors.js';
import { isKnownTag } from './tags.js';

export interface ParseOptions {
  filename?: string;
  /** accept any lower-case tag name (default false: unknown tags are errors) */
  allowUnknownTags?: boolean;
  /** keep `//` comments in the AST, for tools that reprint the source */
  keepComments?: boolean;
}

const BLOCK_KEYWORDS = new Set(['if', 'each', 'await', 'key', 'snippet']);
const CONTINUATION_KEYWORDS = new Set(['else', 'then', 'catch']);
const SPECIAL_KINDS = new Set(['render', 'html', 'const', 'debug']);

const TAG_START = /[A-Za-z]/;
const TAG_CHAR = /[A-Za-z0-9:_-]/;
const SELECTOR_STOP = /[\s.#{}'"()=>]/;
const VALUE_STOP = /[\s{}'"()>]/;

export function parse(source: string, options: ParseOptions = {}): Template {
  return new Parser(source, options.filename, options.allowUnknownTags ?? false, options.keepComments ?? false).parseTemplate();
}

class Parser {
  private pos = 0;

  constructor(
    private readonly src: string,
    private readonly filename?: string,
    private readonly allowUnknownTags = false,
    private readonly keepComments = false,
  ) {}

  // ---------------------------------------------------------------- helpers

  private error(message: string, offset = this.pos): never {
    throw new BraceMLError(message, this.src, offset, this.filename);
  }

  /** collects `//` comments passed over by skipSpaceAndLineComments */
  private skipped: Loc[] | null = null;
  /** comments to put at the start of the next block */
  private carried: Node[] = [];

  private peek(offset = 0): string {
    return this.src[this.pos + offset] ?? '';
  }

  private eof(): boolean {
    return this.pos >= this.src.length;
  }

  private startsWith(s: string): boolean {
    return this.src.startsWith(s, this.pos);
  }

  private expect(ch: string): void {
    if (this.peek() !== ch) {
      this.error(this.eof() ? `Expected '${ch}' but reached end of input` : `Expected '${ch}'`);
    }
    this.pos++;
  }

  /** spaces and tabs only */
  private skipInlineSpace(): void {
    while (this.peek() === ' ' || this.peek() === '\t') this.pos++;
  }

  /** all whitespace incl. newlines */
  private skipSpace(): void {
    while (!this.eof() && /\s/.test(this.peek())) this.pos++;
  }

  /** whitespace and `//` line comments (used for look-ahead and inside groups) */
  private skipSpaceAndLineComments(): void {
    for (;;) {
      this.skipSpace();
      if (this.startsWith('//')) {
        const start = this.pos;
        while (!this.eof() && this.peek() !== '\n') this.pos++;
        this.skipped?.push({ start, end: this.pos });
        continue;
      }
      return;
    }
  }

  private readWord(): string {
    const start = this.pos;
    while (!this.eof() && /[A-Za-z0-9_]/.test(this.peek())) this.pos++;
    return this.src.slice(start, this.pos);
  }

  private peekWord(): string {
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.src.slice(this.pos, this.pos + 32));
    return m ? m[0] : '';
  }

  /** true when the word at the cursor is `word` followed by whitespace or `{` */
  private atKeyword(word: string): boolean {
    if (!this.startsWith(word)) return false;
    const next = this.src[this.pos + word.length] ?? '';
    return next === '' || /\s/.test(next) || next === '{';
  }

  // ------------------------------------------------------- JS-aware scanning

  /** cursor on an opening quote; returns index after the closing quote */
  private skipJsString(i: number): number {
    const quote = this.src[i];
    i++;
    while (i < this.src.length) {
      const c = this.src[i];
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (quote === '`' && c === '$' && this.src[i + 1] === '{') {
        i = this.skipJsBraces(i + 1);
        continue;
      }
      if (c === quote) return i + 1;
      i++;
    }
    this.error('Unterminated string in expression', i);
  }

  /** i on `{`; returns index after the matching `}` */
  private skipJsBraces(i: number): number {
    const open = i;
    let depth = 0;
    while (i < this.src.length) {
      const c = this.src[i];
      if (c === '"' || c === "'" || c === '`') {
        i = this.skipJsString(i);
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return i + 1;
      }
      i++;
    }
    this.error("Unclosed '{' in expression", open);
  }

  /** cursor on `{`: reads a balanced JS expression and returns its inner text */
  private readBracedExpression(): string {
    const start = this.pos;
    const end = this.skipJsBraces(start);
    this.pos = end;
    const inner = this.src.slice(start + 1, end - 1).trim();
    if (!inner) this.error('Empty expression', start);
    return inner;
  }

  /**
   * Reads a block header (`if <expr> {`) up to the first `{` that is not nested
   * inside (), [] or a string. Leaves the cursor on that `{`.
   */
  private readHeader(keyword: string): string {
    const start = this.pos;
    let depth = 0;
    let i = this.pos;
    while (i < this.src.length) {
      const c = this.src[i];
      if (c === '"' || c === "'" || c === '`') {
        i = this.skipJsString(i);
        continue;
      }
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (c === '{') {
        if (depth === 0) break;
        i = this.skipJsBraces(i);
        continue;
      }
      i++;
    }
    if (i >= this.src.length) this.error(`Expected '{' after '${keyword}' header`, start);
    this.pos = i;
    return this.src.slice(start, i).trim();
  }

  /** reads an expression up to end of line or an unbalanced `}` */
  private readLineExpression(): string {
    const start = this.pos;
    let depth = 0;
    let i = this.pos;
    while (i < this.src.length) {
      const c = this.src[i];
      if (c === '\n') break;
      if (c === '"' || c === "'" || c === '`') {
        i = this.skipJsString(i);
        continue;
      }
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (c === '}') {
        if (depth === 0) break;
        depth--;
      }
      i++;
    }
    this.pos = i;
    return this.src.slice(start, i).trim();
  }

  // ------------------------------------------------------------- structure

  parseTemplate(): Template {
    const children = this.parseNodes(null);
    return { type: 'Template', children };
  }

  /**
   * Parses nodes until EOF (openOffset === null) or until the `}` that closes
   * the block opened at openOffset.
   */
  private parseNodes(openOffset: number | null): Node[] {
    const nodes: Node[] = [];
    for (;;) {
      this.skipSpace();
      if (this.eof()) {
        if (openOffset !== null) this.error("Unclosed '{'", openOffset);
        return nodes;
      }
      if (this.startsWith('//')) {
        const start = this.pos;
        while (!this.eof() && this.peek() !== '\n') this.pos++;
        if (this.keepComments) nodes.push(this.lineComment({ start, end: this.pos }));
        continue;
      }
      if (this.startsWith('/*')) {
        nodes.push(this.parseBlockComment());
        continue;
      }
      if (this.peek() === '}') {
        if (openOffset === null) this.error("Unexpected '}'");
        this.pos++;
        return nodes;
      }
      nodes.push(this.parseNode());
    }
  }

  private parseBlockComment(): Node {
    const start = this.pos;
    const end = this.src.indexOf('*/', this.pos + 2);
    if (end === -1) this.error('Unterminated comment', start);
    this.pos = end + 2;
    return { type: 'Comment', value: this.src.slice(start + 2, end).trim(), style: 'block', loc: { start, end: this.pos } };
  }

  private lineComment(loc: Loc): CommentNode {
    return { type: 'Comment', value: this.src.slice(loc.start + 2, loc.end).trim(), style: 'line', loc };
  }

  private parseNode(): Node {
    const c = this.peek();
    if (c === "'" || c === '"') return this.parseText();
    if (c === '@') return this.parseSpecial();

    const word = this.peekWord();
    if (BLOCK_KEYWORDS.has(word) && this.atKeyword(word)) {
      switch (word) {
        case 'if':
          return this.parseIf();
        case 'each':
          return this.parseEach();
        case 'await':
          return this.parseAwait();
        case 'key':
          return this.parseKey();
        case 'snippet':
          return this.parseSnippet();
      }
    }
    if (CONTINUATION_KEYWORDS.has(word) && this.atKeyword(word)) {
      const owner = word === 'else' ? "'if' or 'each'" : "'await'";
      this.error(`'${word}' without a preceding ${owner} block`);
    }
    if (TAG_START.test(c) || c === '.' || c === '#') return this.parseElement();
    if (c === '{') {
      this.error("Unexpected '{'. Text and expressions must be quoted, e.g. '{name}'");
    }
    this.error(`Unexpected character '${c}'`);
  }

  // ------------------------------------------------------------------ text

  private parseText(): TextNode {
    const start = this.pos;
    const quote = this.peek();
    this.pos++;
    let value = '';
    while (!this.eof()) {
      const c = this.peek();
      if (c === '\\') {
        const n = this.peek(1);
        if (n === quote || n === '\\') {
          value += n;
          this.pos += 2;
          continue;
        }
        value += c;
        this.pos++;
        continue;
      }
      if (c === quote) {
        this.pos++;
        return { type: 'Text', value, loc: { start, end: this.pos } };
      }
      value += c;
      this.pos++;
    }
    this.error('Unterminated string', start);
  }

  // --------------------------------------------------------------- special

  private parseSpecial(): SpecialTag {
    const start = this.pos;
    this.pos++; // @
    const kind = this.readWord();
    if (!SPECIAL_KINDS.has(kind)) {
      this.error(`Unknown special tag '@${kind}'. Expected @render, @html, @const or @debug`, start);
    }
    this.skipInlineSpace();
    const expression = this.readLineExpression();
    if (!expression && kind !== 'debug') this.error(`'@${kind}' requires an expression`, start);
    return { type: 'Special', kind: kind as SpecialTag['kind'], expression, loc: { start, end: this.pos } };
  }

  // ---------------------------------------------------------------- blocks

  private parseBlockBody(): Node[] {
    const open = this.pos;
    this.expect('{');
    const carried = this.carried;
    this.carried = [];
    return [...carried, ...this.parseNodes(open)];
  }

  /** look ahead (across whitespace/comments) for a continuation keyword */
  private lookaheadKeyword(word: string): boolean {
    const save = this.pos;
    const comments: Loc[] = [];
    this.skipped = comments;
    this.skipSpaceAndLineComments();
    this.skipped = null;
    if (this.atKeyword(word)) {
      this.pos += word.length;
      // a comment before the keyword moves into the block after it
      if (this.keepComments) this.carried = comments.map((loc) => this.lineComment(loc));
      return true;
    }
    this.pos = save;
    return false;
  }

  private parseIf(): IfBlock {
    const start = this.pos;
    this.pos += 2;
    const branches: IfBlock['branches'] = [];
    let test = this.readHeader('if');
    if (!test) this.error("'if' requires a condition", start);
    branches.push({ test, children: this.parseBlockBody() });

    while (this.lookaheadKeyword('else')) {
      this.skipSpace();
      if (this.atKeyword('if')) {
        const at = this.pos;
        this.pos += 2;
        test = this.readHeader('else if');
        if (!test) this.error("'else if' requires a condition", at);
        branches.push({ test, children: this.parseBlockBody() });
        continue;
      }
      branches.push({ test: null, children: this.parseBlockBody() });
      break;
    }
    return { type: 'If', branches, loc: { start, end: this.pos } };
  }

  private parseEach(): EachBlock {
    const start = this.pos;
    this.pos += 4;
    const header = this.readHeader('each');
    if (!header) this.error("'each' requires an expression", start);
    const parts = splitEachHeader(header);
    const children = this.parseBlockBody();
    let fallback: Node[] | null = null;
    if (this.lookaheadKeyword('else')) {
      this.skipSpace();
      fallback = this.parseBlockBody();
    }
    return { type: 'Each', header, ...parts, children, fallback, loc: { start, end: this.pos } };
  }

  private parseAwait(): AwaitBlock {
    const start = this.pos;
    this.pos += 5;
    const header = this.readHeader('await');
    const node: AwaitBlock = {
      type: 'Await',
      expression: header,
      pending: null,
      thenValue: null,
      then: null,
      catchError: null,
      catch: null,
      loc: { start, end: start },
    };

    const thenAt = findTopLevelWord(header, 'then');
    const catchAt = findTopLevelWord(header, 'catch');
    if (thenAt !== -1) {
      node.expression = header.slice(0, thenAt).trim();
      node.thenValue = header.slice(thenAt + 4).trim() || null;
      node.then = this.parseBlockBody();
    } else if (catchAt !== -1) {
      node.expression = header.slice(0, catchAt).trim();
      node.catchError = header.slice(catchAt + 5).trim() || null;
      node.catch = this.parseBlockBody();
    } else {
      node.pending = this.parseBlockBody();
    }
    if (!node.expression) this.error("'await' requires an expression", start);

    if (node.then === null && node.catch === null && this.lookaheadKeyword('then')) {
      this.skipInlineSpace();
      node.thenValue = this.readHeader('then') || null;
      node.then = this.parseBlockBody();
    }
    if (node.catch === null && this.lookaheadKeyword('catch')) {
      this.skipInlineSpace();
      node.catchError = this.readHeader('catch') || null;
      node.catch = this.parseBlockBody();
    }
    node.loc.end = this.pos;
    return node;
  }

  private parseKey(): KeyBlock {
    const start = this.pos;
    this.pos += 3;
    const expression = this.readHeader('key');
    if (!expression) this.error("'key' requires an expression", start);
    return { type: 'Key', expression, children: this.parseBlockBody(), loc: { start, end: this.pos } };
  }

  private parseSnippet(): SnippetBlock {
    const start = this.pos;
    this.pos += 7;
    const signature = this.readHeader('snippet');
    if (!/^[A-Za-z_$][\w$]*\s*\(/.test(signature)) {
      this.error("'snippet' requires a signature like name(args)", start);
    }
    return { type: 'Snippet', signature, children: this.parseBlockBody(), loc: { start, end: this.pos } };
  }

  // -------------------------------------------------------------- elements

  private parseElement(): ElementNode {
    const start = this.pos;
    let name = 'div';
    if (TAG_START.test(this.peek())) {
      const s = this.pos;
      while (!this.eof() && TAG_CHAR.test(this.peek())) this.pos++;
      name = this.src.slice(s, this.pos);
      if (!this.allowUnknownTags && !isKnownTag(name)) {
        this.error(
          `Unknown element '${name}'. Text and expressions must be quoted, e.g. '{${name}}'. ` +
            `(Custom elements need a hyphen; disable this check with allowUnknownTags.)`,
          s,
        );
      }
    }
    const el: ElementNode = {
      type: 'Element',
      name,
      component: /^[A-Z]/.test(name),
      id: null,
      classes: [],
      attributes: [],
      children: null,
      loc: { start, end: start },
    };
    const syntax: ElementSyntax = { selectorEnd: start, multilineGroup: false, groupComments: [], body: null };
    el.syntax = syntax;

    // selector: #id and .class
    while (this.peek() === '.' || this.peek() === '#') {
      const marker = this.peek();
      const at = this.pos;
      this.pos++;
      const s = this.pos;
      while (!this.eof() && !SELECTOR_STOP.test(this.peek())) this.pos++;
      const value = this.src.slice(s, this.pos);
      if (!value) this.error(marker === '.' ? 'Expected a class name after .' : 'Expected an id after #', at);
      if (marker === '#') {
        if (el.id !== null) this.error('An element can only have one #id', at);
        el.id = value;
      } else {
        el.classes.push(value);
      }
    }

    // optional grouped attributes: the `(` must directly follow the selector
    syntax.selectorEnd = this.pos;
    let grouped = false;
    let groupOpen = -1;
    const groupComments: Loc[] = [];
    if (this.peek() === '(') {
      grouped = true;
      groupOpen = this.pos;
      this.pos++;
    }

    for (;;) {
      if (grouped) {
        this.skipped = groupComments;
        this.skipSpaceAndLineComments();
        this.skipped = null;
      } else {
        this.skipInlineSpace();
      }

      const c = this.peek();
      if (this.eof()) {
        if (grouped) this.error("Unclosed '(' in element attributes", groupOpen);
        break;
      }
      if (grouped && c === ')') {
        syntax.multilineGroup = this.src.slice(groupOpen, this.pos).includes('\n');
        this.pos++;
        grouped = false;
        continue;
      }
      if (!grouped && (c === '\n' || c === '\r')) break;
      if (!grouped && (this.startsWith('//') || this.startsWith('/*'))) break;
      if (c === '}') {
        if (grouped) this.error("Unclosed '(' in element attributes", groupOpen);
        break;
      }
      if (c === '{' && /^\{\s*\.\.\./.test(this.src.slice(this.pos, this.pos + 8))) {
        // Svelte-style spread `{...props}`: a children block can never start with `...`
        const start = this.pos;
        const inner = this.readBracedExpression().replace(/^\.\.\./, '').trim();
        el.attributes.push({ kind: 'spread', expression: inner, loc: { start, end: this.pos } });
        continue;
      }
      if (c === '{') {
        if (grouped) this.error("Missing ')' before the children block", groupOpen);
        el.children = this.parseBlockBody();
        syntax.body = 'block';
        break;
      }
      if (c === "'" || c === '"') {
        if (grouped) this.error("Missing ')' before the text", groupOpen);
        el.children = [this.parseText()];
        syntax.body = 'text';
        break;
      }
      if (c === '>') {
        if (grouped) this.error("Missing ')' before '>'", groupOpen);
        this.pos++;
        this.skipInlineSpace();
        const n = this.peek();
        if (n === "'" || n === '"') el.children = [this.parseText()];
        else if (TAG_START.test(n) || n === '.' || n === '#') el.children = [this.parseElement()];
        else this.error("Expected an element or text after '>'");
        syntax.body = 'chain';
        break;
      }
      el.attributes.push(this.parseAttribute());
    }

    if (this.keepComments) syntax.groupComments = groupComments.map((loc) => this.src.slice(loc.start, loc.end).trimEnd());
    el.loc.end = this.pos;
    return el;
  }

  private parseAttribute(): Attribute {
    const start = this.pos;

    if (this.startsWith('...')) {
      this.pos += 3;
      let expression: string;
      if (this.peek() === '{') {
        expression = this.readBracedExpression();
      } else {
        const s = this.pos;
        while (!this.eof() && /[\w$.]/.test(this.peek())) this.pos++;
        expression = this.src.slice(s, this.pos);
        if (!expression) this.error("Expected an expression after '...'", start);
      }
      return { kind: 'spread', expression, loc: { start, end: this.pos } };
    }

    const name = this.readAttributeName();
    if (!name) this.error(`Unexpected character '${this.peek()}' in element head`);

    if (this.peek() !== '=') {
      return { kind: 'static', name, value: null, loc: { start, end: this.pos } };
    }
    this.pos++; // =
    const c = this.peek();
    if (c === '{') {
      const expression = this.readBracedExpression();
      return { kind: 'expression', name, expression, loc: { start, end: this.pos } };
    }
    if (c === '"' || c === "'") {
      const text = this.parseText();
      return { kind: 'static', name, value: text.value, loc: { start, end: this.pos } };
    }
    const s = this.pos;
    while (!this.eof() && !VALUE_STOP.test(this.peek())) this.pos++;
    const value = this.src.slice(s, this.pos);
    if (!value) this.error(`Expected a value for attribute '${name}'`, s);
    return { kind: 'static', name, value, loc: { start, end: this.pos } };
  }

  /**
   * Attribute names are permissive so framework syntax passes through:
   * `bind:value`, `on:click|once`, `@click`, `:title`, `[value]`, `(click)`,
   * `[(ngModel)]`, `*ngIf`, `#ref`, `v-on:click.prevent`.
   */
  private readAttributeName(): string {
    const start = this.pos;
    let bracket = 0;
    let paren = 0;
    while (!this.eof()) {
      const c = this.peek();
      if (c === '[') bracket++;
      else if (c === ']') bracket--;
      else if (c === '(') {
        if (this.pos === start || bracket > 0 || paren > 0) paren++;
        else break;
      } else if (c === ')') {
        if (paren > 0) paren--;
        else break;
      } else if (bracket === 0 && paren === 0 && /[\s={}'">]/.test(c)) break;
      else if (/\s/.test(c)) break;
      this.pos++;
    }
    return this.src.slice(start, this.pos);
  }
}

// ------------------------------------------------------------------ helpers

/** index of a whitespace-delimited word at nesting depth 0, or -1 */
function findTopLevelWord(text: string, word: string): number {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < text.length && text[i] !== q) {
        if (text[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (
      depth === 0 &&
      text.startsWith(word, i) &&
      (i === 0 || /\s/.test(text[i - 1])) &&
      (i + word.length === text.length || /\s/.test(text[i + word.length]))
    ) {
      return i;
    }
  }
  return -1;
}

function lastTopLevelComma(text: string): number {
  let depth = 0;
  let found = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) found = i;
  }
  return found;
}

export function splitEachHeader(header: string): Pick<EachBlock, 'collection' | 'pattern' | 'index' | 'key'> {
  const asAt = findTopLevelWord(header, 'as');
  if (asAt === -1) {
    // Svelte 5 allows `{#each items}` / `{#each items, i}`
    const comma = lastTopLevelComma(header);
    if (comma === -1) return { collection: header, pattern: '', index: null, key: null };
    return {
      collection: header.slice(0, comma).trim(),
      pattern: '',
      index: header.slice(comma + 1).trim() || null,
      key: null,
    };
  }
  const collection = header.slice(0, asAt).trim();
  let rest = header.slice(asAt + 2).trim();
  let key: string | null = null;

  if (rest.endsWith(')')) {
    let depth = 0;
    for (let i = rest.length - 1; i >= 0; i--) {
      const c = rest[i];
      if (c === ')') depth++;
      else if (c === '(') {
        depth--;
        if (depth === 0) {
          if (i > 0 && /[\s,]/.test(rest[i - 1])) {
            key = rest.slice(i + 1, -1).trim();
            rest = rest.slice(0, i).trim();
          }
          break;
        }
      }
    }
  }

  let index: string | null = null;
  const comma = lastTopLevelComma(rest);
  if (comma !== -1) {
    index = rest.slice(comma + 1).trim() || null;
    rest = rest.slice(0, comma).trim();
  }
  return { collection, pattern: rest, index, key };
}
