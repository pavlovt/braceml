import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import vsctm from 'vscode-textmate';
import oniguruma from 'vscode-oniguruma';

const require = createRequire(import.meta.url);
const grammarPath = new URL('../editors/vscode/syntaxes/braceml.tmLanguage.json', import.meta.url);

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
        : null, // source.js is provided by VS Code at runtime
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

describe('TextMate grammar', () => {
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
});
