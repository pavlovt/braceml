import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';

const bin = fileURLToPath(new URL('../dist/bin.cjs', import.meta.url));

/** A minimal LSP client over stdio, so this covers the built server, not just its functions. */
function connect() {
  const server = spawn(process.execPath, [bin, '--stdio']);
  let buffer = Buffer.alloc(0);
  let nextId = 1;
  const pending = new Map<number, (result: any) => void>();
  const notifications: { method: string; params: any }[] = [];
  const waiters: (() => void)[] = [];

  server.stdout.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const length = Number(/Content-Length: (\d+)/.exec(buffer.toString('utf8', 0, headerEnd))![1]);
      if (buffer.length < headerEnd + 4 + length) return;
      const message = JSON.parse(buffer.toString('utf8', headerEnd + 4, headerEnd + 4 + length));
      buffer = buffer.subarray(headerEnd + 4 + length);
      if (message.id !== undefined && pending.has(message.id)) pending.get(message.id)!(message.result);
      else if (message.method) notifications.push(message);
      waiters.splice(0).forEach((w) => w());
    }
  });

  const send = (message: object) => {
    const body = JSON.stringify({ jsonrpc: '2.0', ...message });
    server.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  };
  return {
    server,
    notify: (method: string, params: object) => send({ method, params }),
    request: (method: string, params: object) =>
      new Promise<any>((resolve) => {
        const id = nextId++;
        pending.set(id, resolve);
        send({ id, method, params });
      }),
    async diagnostics(uri: string): Promise<any[]> {
      for (;;) {
        const found = notifications.findLast((n) => n.method === 'textDocument/publishDiagnostics' && n.params.uri === uri);
        if (found) return found.params.diagnostics;
        await new Promise<void>((resolve) => waiters.push(resolve));
      }
    },
  };
}

describe.skipIf(!existsSync(bin))('built server over stdio', () => {
  const client = connect();
  afterAll(() => client.server.kill());

  it('initializes, validates, completes and hovers', async () => {
    const init = await client.request('initialize', { processId: null, rootUri: null, capabilities: {} });
    expect(init.capabilities.hoverProvider).toBe(true);
    expect(init.capabilities.documentFormattingProvider).toBe(true);
    client.notify('initialized', {});

    const uri = 'file:///t.svelte';
    const text = `<template lang="braceml">\n  foo 'x'\n</template>\n`;
    client.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'svelte', version: 1, text } });
    const [diagnostic] = await client.diagnostics(uri);
    expect(diagnostic.message).toContain("Unknown element 'foo'");
    expect(diagnostic.range.start).toEqual({ line: 1, character: 2 });

    const completion = await client.request('textDocument/completion', {
      textDocument: { uri },
      position: { line: 1, character: 2 },
    });
    expect(completion.map((i: any) => i.label)).toContain('each');

    const other = 'file:///h.braceml';
    client.notify('textDocument/didOpen', {
      textDocument: { uri: other, languageId: 'braceml', version: 1, text: 'each items as item {\n}\n' },
    });
    const hover = await client.request('textDocument/hover', {
      textDocument: { uri: other },
      position: { line: 0, character: 1 },
    });
    expect(hover.contents.value).toContain('{#each');
  });
});
