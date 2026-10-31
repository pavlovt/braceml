#!/usr/bin/env node
import { BraceMLError, formatTemplates } from '@braceml/core';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createConnection, ProposedFeatures, TextDocuments, TextDocumentSyncKind } from 'vscode-languageserver/node';
import { getCompletions } from './completion.js';
import { getDiagnostics } from './diagnostics.js';
import type { DiagnosticOptions } from './diagnostics.js';
import { getHover } from './hover.js';
import { documentKind } from './regions.js';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
let options: DiagnosticOptions = {};

function validate(document: TextDocument): void {
  connection.sendDiagnostics({ uri: document.uri, diagnostics: getDiagnostics(document, options) });
}

connection.onInitialize(({ initializationOptions }) => {
  options = initializationOptions ?? {};
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ['@', '='] },
      hoverProvider: true,
      documentFormattingProvider: true,
    },
  };
});

connection.onDidChangeConfiguration(({ settings }) => {
  options = settings?.braceml ?? {};
  documents.all().forEach(validate);
});

documents.onDidChangeContent(({ document }) => validate(document));
documents.onDidClose(({ document }) => connection.sendDiagnostics({ uri: document.uri, diagnostics: [] }));

connection.onCompletion(({ textDocument, position }) => {
  const document = documents.get(textDocument.uri);
  return document ? getCompletions(document, position) : [];
});

connection.onHover(({ textDocument, position }) => {
  const document = documents.get(textDocument.uri);
  return document ? getHover(document, position) : null;
});

connection.onDocumentFormatting(({ textDocument, options: { tabSize, insertSpaces } }) => {
  const document = documents.get(textDocument.uri);
  if (!document) return [];
  try {
    const indent = insertSpaces ? ' '.repeat(tabSize) : '\t';
    const newText = formatTemplates(document.getText(), documentKind(document), { indent });
    const end = document.positionAt(document.getText().length);
    return [{ range: { start: { line: 0, character: 0 }, end }, newText }];
  } catch (err) {
    // the file doesn't parse, and diagnostics already say why
    if (err instanceof BraceMLError) return [];
    throw err;
  }
});

documents.listen(connection);
connection.listen();
