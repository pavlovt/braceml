import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import vsctm from 'vscode-textmate';
import oniguruma from 'vscode-oniguruma';

const require = createRequire(import.meta.url);
const grammarPath = new URL('../editors/vscode/syntaxes/braceml.tmLanguage.json', import.meta.url);

const JS_STUB = vsctm.parseRawGrammar(
  JSON.stringify({ scopeName: 'source.js', patterns: [{ match: '\\bnull\\b', name: 'constant.language.null.js' }] }),
  'stub.json',
);

async function loadGrammar() {
  const wasm = readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer;
  await oniguruma.loadWASM(wasm);
  const registry = new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (s: string[]) => new oniguruma.OnigScanner(s),
      createOnigString: (s: string) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async (scope: string) =>
      scope === 'source.braceml'
        ? vsctm.parseRawGrammar(readFileSync(grammarPath, 'utf8'), grammarPath.pathname)
        : scope === 'source.js'
          ? JS_STUB // provided by VS Code at runtime; rules that only include a missing grammar are dropped
          : null,
  });
  return (await registry.loadGrammar('source.braceml'))!;
}

/** returns [text, lastScope] pairs for one line */
async function tokenize(lines: string[]) {
  const grammar = await loadGrammar();
  let state = vsctm.INITIAL;
  const out: [string, string][] = [];
  for (const line of lines) {
    const r = grammar.tokenizeLine(line, state);
    for (const t of r.tokens) {
      const text = line.slice(t.startIndex, t.endIndex);
      if (text.trim()) out.push([text.trim(), t.scopes[t.scopes.length - 1]]);
    }
    state = r.ruleStack;
  }
  return out;
}

const injectionPath = new URL('../editors/vscode/syntaxes/braceml-jsx.injection.json', import.meta.url);

async function tokenizeTsx(lines: string[]) {
  const wasm = readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer;
  await oniguruma.loadWASM(wasm).catch(() => {});
  const sources: Record<string, unknown> = {
    'source.braceml': vsctm.parseRawGrammar(readFileSync(grammarPath, 'utf8'), grammarPath.pathname),
    'source.js': JS_STUB,
    'source.tsx': vsctm.parseRawGrammar(
      JSON.stringify({ scopeName: 'source.tsx', patterns: [{ match: '\\breturn\\b', name: 'keyword.control.tsx' }] }),
      'tsx.json',
    ),
    'braceml.jsx.injection': vsctm.parseRawGrammar(readFileSync(injectionPath, 'utf8'), injectionPath.pathname),
  };
  const registry = new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (s: string[]) => new oniguruma.OnigScanner(s),
      createOnigString: (s: string) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async (scope: string) => (sources[scope] ?? null) as never,
    getInjections: (scope: string) => (scope === 'source.tsx' ? ['braceml.jsx.injection'] : []),
  });
  const grammar = (await registry.loadGrammar('source.tsx'))!;
  let state = vsctm.INITIAL;
  const out: [string, string][] = [];
  for (const line of lines) {
    const r = grammar.tokenizeLine(line, state);
    for (const t of r.tokens) {
      const text = line.slice(t.startIndex, t.endIndex);
      if (text.trim()) out.push([text.trim(), t.scopes[t.scopes.length - 1]]);
    }
    state = r.ruleStack;
  }
  return out;
}

async function tokenizeMarkdown(lines: string[]) {
  await oniguruma.loadWASM(readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer).catch(() => {});
  const url = new URL('../editors/vscode/syntaxes/braceml-markdown.injection.json', import.meta.url);
  const sources: Record<string, unknown> = {
    'source.braceml': vsctm.parseRawGrammar(readFileSync(grammarPath, 'utf8'), grammarPath.pathname),
    'source.js': JS_STUB,
    'text.html.markdown': vsctm.parseRawGrammar(
      JSON.stringify({ scopeName: 'text.html.markdown', patterns: [{ match: '\\bplain\\b', name: 'markup.plain' }] }),
      'md.json',
    ),
    'braceml.markdown.injection': vsctm.parseRawGrammar(readFileSync(url, 'utf8'), url.pathname),
  };
  const registry = new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (s: string[]) => new oniguruma.OnigScanner(s),
      createOnigString: (s: string) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async (scope: string) => (sources[scope] ?? null) as never,
    getInjections: (scope: string) => (scope === 'text.html.markdown' ? ['braceml.markdown.injection'] : []),
  });
  const grammar = (await registry.loadGrammar('text.html.markdown'))!;
  let state = vsctm.INITIAL;
  const out: [string, string][] = [];
  for (const line of lines) {
    const r = grammar.tokenizeLine(line, state);
    for (const t of r.tokens) {
      const text = line.slice(t.startIndex, t.endIndex);
      if (text.trim()) out.push([text.trim(), t.scopes[t.scopes.length - 1]]);
    }
    state = r.ruleStack;
  }
  return out;
}

describe('TextMate grammar', () => {
  it('highlights braceml code blocks in Markdown', async () => {
    const tokens = await tokenizeMarkdown(['plain', '```braceml', 'if open {', "  p 'Hi'", '}', '```', 'if plain']);
    const scopesOf = (text: string) => tokens.filter(([t]) => t === text).map(([, s]) => s);
    expect(scopesOf('p')).toEqual(['entity.name.tag.braceml']);
    expect(tokens.find(([t]) => t === 'if')?.[1]).toBe('keyword.control.flow.braceml');
    // the block ends at the closing fence
    expect(scopesOf('plain')).toEqual(['markup.plain', 'markup.plain']);
  });

  it('highlights braceml templates in JSX and TSX files', async () => {
    const tokens = await tokenizeTsx(['return braceml`', '  if open {', "    p 'Hi'", '  }', '`;', 'return x;']);
    const scopesOf = (text: string) => tokens.filter(([t]) => t === text).map(([, s]) => s);
    expect(scopesOf('if')).toEqual(['keyword.control.flow.braceml']);
    expect(scopesOf('p')).toEqual(['entity.name.tag.braceml']);
    // the template ends at the backtick
    expect(scopesOf('return')).toEqual(['keyword.control.tsx', 'keyword.control.tsx']);
  });

  it('highlights the main constructs', async () => {
    const tokens = await tokenize([
      'form.login#main onsubmit={save} {',
      "  label for=email 'Hello {name}'",
      '  if users.length {',
      '    Card ...props',
      '  } else {',
      '    @render row(x)',
      '  }',
      '  // note',
      '}',
    ]);
    const scopeOf = (text: string) => tokens.find(([t]) => t === text)?.[1];
    expect(scopeOf('form')).toBe('entity.name.tag.braceml');
    expect(scopeOf('login')).toBe('entity.other.attribute-name.class.braceml');
    expect(scopeOf('main')).toBe('entity.other.attribute-name.id.braceml');
    expect(scopeOf('onsubmit')).toBe('entity.other.attribute-name.braceml');
    expect(scopeOf('email')).toBe('string.unquoted.braceml');
    expect(scopeOf('if')).toBe('keyword.control.flow.braceml');
    expect(scopeOf('Card')).toBe('support.class.component.braceml');
    expect(scopeOf('...')).toBe('keyword.operator.spread.braceml');
    expect(scopeOf('else')).toBe('keyword.control.flow.braceml');
    expect(scopeOf('render')).toBe('keyword.control.braceml');
    expect(scopeOf('// note')).toBe('comment.line.double-slash.braceml');
    expect(tokens.some(([t, s]) => t === 'Hello' && s === 'string.quoted.single.braceml')).toBe(true);
  });

  it('highlights keywords that continue a block after }', async () => {
    const tokens = await tokenize([
      'if a {',
      '} else if b {',
      '}',
      'await p {',
      '} then value {',
      '} catch err {',
      '}',
    ]);
    const scopeOf = (text: string) => tokens.find(([t]) => t === text)?.[1];
    expect(scopeOf('else if')).toBe('keyword.control.flow.braceml');
    expect(scopeOf('then')).toBe('keyword.control.flow.braceml');
    expect(scopeOf('catch')).toBe('keyword.control.flow.braceml');
  });
});
