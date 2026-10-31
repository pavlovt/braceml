import * as path from 'node:path';
import { workspace } from 'vscode';
import type { ExtensionContext } from 'vscode';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: ExtensionContext): Promise<void> {
  const module = context.asAbsolutePath(path.join('dist', 'server.cjs'));
  client = new LanguageClient(
    'braceml',
    'BraceML',
    { module, transport: TransportKind.ipc },
    {
      documentSelector: [
        { scheme: 'file', language: 'braceml' },
        { scheme: 'file', language: 'svelte' },
      ],
      initializationOptions: {
        allowUnknownTags: workspace.getConfiguration('braceml').get('allowUnknownTags'),
      },
      synchronize: { configurationSection: 'braceml' },
    },
  );
  return client.start();
}

export function deactivate(): Promise<void> | undefined {
  return client?.stop();
}
