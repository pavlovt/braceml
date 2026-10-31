import { KNOWN_TAGS } from '@braceml/core';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItemKind, InsertTextFormat, MarkupKind } from 'vscode-languageserver';
import type { CompletionItem, Position, Range } from 'vscode-languageserver';
import { contextAt } from './context.js';
import type { Context } from './context.js';
import {
  ATTRIBUTE_VALUES,
  BLOCKS,
  BOOLEAN_ATTRIBUTES,
  DIRECTIVES,
  EVENTS,
  GLOBAL_ATTRIBUTES,
  SPECIALS,
  SVELTE_ELEMENTS,
  TAG_ATTRIBUTES,
} from './data.js';
import { regionAt } from './regions.js';

const RETRIGGER = { title: 'Suggest', command: 'editor.action.triggerSuggest' };

export function getCompletions(document: TextDocument, position: Position): CompletionItem[] {
  const offset = document.offsetAt(position);
  const region = regionAt(document, offset);
  if (!region) return [];
  const context = contextAt(region.source, offset - region.start);
  if (context.kind === 'none') return [];

  const range: Range = {
    start: document.positionAt(offset - context.prefix.length),
    end: position,
  };
  return itemsFor(context, document, region.source).map(({ insert, ...item }) => ({
    ...item,
    textEdit: { range, newText: insert ?? item.label },
    insertTextFormat: insert ? InsertTextFormat.Snippet : InsertTextFormat.PlainText,
  }));
}

type Item = CompletionItem & { insert?: string };

function itemsFor(context: Exclude<Context, { kind: 'none' }>, document: TextDocument, source: string): Item[] {
  switch (context.kind) {
    case 'node':
      return nodeItems(document, context.chained);
    case 'special':
      return SPECIALS.map(({ label, snippet, doc }) => ({
        label,
        kind: CompletionItemKind.Keyword,
        insert: snippet,
        documentation: { kind: MarkupKind.Markdown, value: doc },
      }));
    case 'render':
      return snippetNames(source).map((label) => ({ label, kind: CompletionItemKind.Function, insert: `${label}($1)` }));
    case 'attribute':
      return /^[A-Z]/.test(context.tag) ? [] : attributeItems(context.tag);
    case 'value':
      return (ATTRIBUTE_VALUES[`${context.tag}.${context.attribute}`] ?? []).map((label) => ({
        label,
        kind: CompletionItemKind.Value,
      }));
  }
}

function nodeItems(document: TextDocument, chained: boolean): Item[] {
  const items: Item[] = [...KNOWN_TAGS, ...SVELTE_ELEMENTS].map((label) => ({
    label,
    kind: CompletionItemKind.Property,
  }));
  for (const label of importedComponents(document)) items.push({ label, kind: CompletionItemKind.Class });
  if (!chained) {
    for (const { label, snippet, doc } of BLOCKS) {
      items.push({
        label,
        kind: CompletionItemKind.Keyword,
        insert: snippet,
        documentation: { kind: MarkupKind.Markdown, value: doc },
      });
    }
  }
  return items;
}

function attributeItems(tag: string): Item[] {
  const names = [...(TAG_ATTRIBUTES[tag] ?? []), ...GLOBAL_ATTRIBUTES];
  const items: Item[] = [...new Set(names)].map((label) => {
    if (BOOLEAN_ATTRIBUTES.has(label)) return { label, kind: CompletionItemKind.Property };
    const enumerated = `${tag}.${label}` in ATTRIBUTE_VALUES;
    return {
      label,
      kind: CompletionItemKind.Property,
      insert: enumerated ? `${label}=` : `${label}="$1"`,
      command: enumerated ? RETRIGGER : undefined,
    };
  });
  for (const label of EVENTS) items.push({ label, kind: CompletionItemKind.Event, insert: `${label}={$1}` });
  for (const { label, snippet } of DIRECTIVES) items.push({ label, kind: CompletionItemKind.Keyword, insert: snippet });
  return items;
}

/** components imported by the file's `<script>` block */
function importedComponents(document: TextDocument): string[] {
  const names = new Set<string>();
  for (const m of document.getText().matchAll(/^\s*import\s+(?:type\s+)?([\w$\s,{}]+?)\s+from\s/gm)) {
    if (/^\s*import\s+type\b/.test(m[0])) continue;
    for (const name of m[1].split(/[\s,{}]+/)) if (/^[A-Z]/.test(name)) names.add(name);
  }
  return [...names];
}

function snippetNames(source: string): string[] {
  const names = new Set(['children']);
  for (const m of source.matchAll(/^\s*snippet\s+([\w$]+)\s*\(/gm)) names.add(m[1]);
  return [...names];
}
