#!/usr/bin/env node
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createConnection, ProposedFeatures, TextDocuments, TextDocumentSyncKind } from 'vscode-languageserver/node';
import { getCompletions } from './completion.js';
import { getDiagnostics } from './diagnostics.js';
import type { DiagnosticOptions } from './diagnostics.js';
import { getHover } from './hover.js';

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

documents.listen(connection);
connection.listen();
