export interface Loc {
  /** 0-based offset */
  start: number;
  end: number;
}

export type Node =
  | ElementNode
  | TextNode
  | CommentNode
  | IfBlock
  | EachBlock
  | AwaitBlock
  | KeyBlock
  | SnippetBlock
  | SpecialTag;

export type Attribute =
  | { kind: 'static'; name: string; value: string | null; loc: Loc }
  | { kind: 'expression'; name: string; expression: string; loc: Loc }
  | { kind: 'spread'; expression: string; loc: Loc };

export interface ElementNode {
  type: 'Element';
  name: string;
  /** true when the tag name starts with an upper-case letter */
  component: boolean;
  id: string | null;
  classes: string[];
  attributes: Attribute[];
  /** null = no body at all (void or empty element) */
  children: Node[] | null;
  loc: Loc;
}

export interface TextNode {
  type: 'Text';
  /** unescaped text */
  value: string;
  loc: Loc;
}

export interface CommentNode {
  type: 'Comment';
  value: string;
  loc: Loc;
}

export interface IfBlock {
  type: 'If';
  /** last branch may have test === null (else) */
  branches: { test: string | null; children: Node[] }[];
  loc: Loc;
}

export interface EachBlock {
  type: 'Each';
  /** raw header, e.g. `users as user, i (user.id)` */
  header: string;
  collection: string;
  pattern: string;
  index: string | null;
  key: string | null;
  children: Node[];
  fallback: Node[] | null;
  loc: Loc;
}

export interface AwaitBlock {
  type: 'Await';
  expression: string;
  pending: Node[] | null;
  thenValue: string | null;
  then: Node[] | null;
  catchError: string | null;
  catch: Node[] | null;
  loc: Loc;
}

export interface KeyBlock {
  type: 'Key';
  expression: string;
  children: Node[];
  loc: Loc;
}

export interface SnippetBlock {
  type: 'Snippet';
  /** e.g. `row(user)` */
  signature: string;
  children: Node[];
  loc: Loc;
}

export interface SpecialTag {
  type: 'Special';
  kind: 'render' | 'html' | 'const' | 'debug';
  expression: string;
  loc: Loc;
}

export interface Template {
  type: 'Template';
  children: Node[];
}
